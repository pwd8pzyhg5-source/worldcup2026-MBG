import { NextResponse } from "next/server";
import { readDraft } from "@/lib/draft";
import { getFinishedFixtures, getFixtures, getLiveFixtures, getFixtureEvents, parseRound } from "@/lib/api-football";
import { calculateStandings, MatchResult } from "@/lib/points";
import { TEAM_BY_API_ID } from "../../../../data/teams";

// Statuses that mean "match is genuinely over" vs "match is underway in some
// form, even mid-stoppage/VAR-check/suspension". A status falling into
// neither set used to silently drop the fixture from standings entirely —
// that's what caused points to swing up and down with no real match event.
const FINISHED_STATUSES = ["FT", "AET", "PEN", "WO", "AWD"];
const IN_PROGRESS_STATUSES = ["1H", "HT", "2H", "ET", "P", "BT", "SUSP", "INT", "LIVE"];

export async function GET() {
  const draft = readDraft();

  if (!draft.completed) {
    // Return empty standings if draft not done
    const standings = Object.keys(draft.participants).map((name) => ({
      name,
      teams: [],
      totalPoints: 0,
      teamPoints: [],
    }));
    return NextResponse.json({ standings, draftCompleted: false });
  }

  // Fetch finished fixtures separately from live — this is the key stability fix.
  // getFinishedFixtures only returns FT/AET/PEN/WO/AWD fixtures, so its cache
  // never contains mid-match data (a score frozen mid-game that looks wrong).
  // getFixtures (all) is still fetched but only used as a fallback if the
  // finished-specific endpoint returns nothing.
  const [finishedFixtures, allFixtures, liveFixtures] = await Promise.all([
    getFinishedFixtures(),
    getFixtures(),
    getLiveFixtures(),
  ]);

  // Use finished fixtures as the authoritative base. Fall back to all fixtures
  // (filtering to finished) only if the status-filtered endpoint fails.
  const baseFinished: typeof finishedFixtures =
    finishedFixtures && finishedFixtures.length > 0
      ? finishedFixtures
      : (allFixtures ?? []).filter((f) => FINISHED_STATUSES.includes(f.fixture.status.short));

  if (!baseFinished && !liveFixtures) {
    return NextResponse.json({ error: "API unavailable", standings: [], draftCompleted: true });
  }

  // Build a map from fixture ID to the authoritative live fixture data.
  const liveById: Record<number, NonNullable<typeof liveFixtures>[number]> = {};
  if (liveFixtures) {
    for (const lf of liveFixtures) liveById[lf.fixture.id] = lf;
  }

  const hasLiveGames = (liveFixtures?.length ?? 0) > 0;

  // Countable = all finished fixtures + all currently live fixtures.
  // Finished fixtures use stable final scores; live fixtures use current scores.
  // We never mix: a finished fixture score will not be overridden by a live entry
  // because live fixtures are for in-progress games only.
  const finishedById = new Map((baseFinished ?? []).map((f) => [f.fixture.id, f]));
  const liveList = liveFixtures ?? [];

  // Merge: start with finished, add any live games not already in finished
  const merged = [
    ...(baseFinished ?? []),
    ...liveList.filter((lf) => !finishedById.has(lf.fixture.id)),
  ];

  const countable = merged.filter((fixture) => {
      const status = fixture.fixture.status.short;
      const finished = FINISHED_STATUSES.includes(status);
      const inProgress = IN_PROGRESS_STATUSES.includes(status);
      if (!finished && !inProgress) return false;
      return !!TEAM_BY_API_ID[fixture.teams.home.id] && !!TEAM_BY_API_ID[fixture.teams.away.id];
    });

  // Events TTL: fast refresh while live. Once finished, a moderate window
  // for ~2.5 hours post-kickoff (covers full match length + a settle buffer
  // for late VAR-confirmed cards), then a long window once corrections are
  // very unlikely. Kept wide (45min, not 15min) specifically to minimize
  // how many times a finished match's total can still visibly change —
  // frequent small refreshes were producing unexplained-looking point
  // swings even though each one reflected a real, if late, data correction.
  function eventsTtlFor(fixture: (typeof countable)[number]): number {
    const status = fixture.fixture.status.short;
    if (IN_PROGRESS_STATUSES.includes(status)) return 180;
    const hoursSinceKickoff = (Date.now() - new Date(fixture.fixture.date).getTime()) / (60 * 60 * 1000);
    return hoursSinceKickoff < 2.5 ? 45 * 60 : 6 * 60 * 60;
  }

  const eventsByFixture = await Promise.all(
    countable.map((fixture) => getFixtureEvents(fixture.fixture.id, eventsTtlFor(fixture)))
  );

  // Build match results + advancement map from fixture data
  const results: MatchResult[] = [];
  const advancementMap: Record<string, string[]> = {};

  for (let idx = 0; idx < countable.length; idx++) {
    const fixture = countable[idx];
    const status = fixture.fixture.status.short as MatchResult["status"];

    const homeTeam = TEAM_BY_API_ID[fixture.teams.home.id];
    const awayTeam = TEAM_BY_API_ID[fixture.teams.away.id];
    if (!homeTeam || !awayTeam) continue;

    const stage = parseRound(fixture.league.round) as MatchResult["stage"];

    // Tally cards
    let homeRed = 0, awayRed = 0, homeYellow = 0, awayYellow = 0;
    const events = eventsByFixture[idx];
    if (events) {
      for (const ev of events) {
        const isHome = ev.team.id === fixture.teams.home.id;
        if (ev.type === "Card") {
          if (ev.detail === "Red Card" || ev.detail === "Second Yellow Card") {
            if (isHome) homeRed++;
            else awayRed++;
          } else if (ev.detail === "Yellow Card") {
            if (isHome) homeYellow++;
            else awayYellow++;
          }
        }
      }
    }

    const homeGoals = fixture.goals.home ?? 0;
    const awayGoals = fixture.goals.away ?? 0;

    results.push({
      fixtureId: fixture.fixture.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeGoals,
      awayGoals,
      status,
      stage,
      homeRedCards: homeRed,
      awayRedCards: awayRed,
      homeYellowCards: homeYellow,
      awayYellowCards: awayYellow,
    });

    // Advancement tracking for knockout rounds
    if (stage !== "Group Stage") {
      let winner: string | null = null;
      let loser: string | null = null;

      if (homeGoals > awayGoals) {
        winner = homeTeam.id;
        loser = awayTeam.id;
      } else if (awayGoals > homeGoals) {
        winner = awayTeam.id;
        loser = homeTeam.id;
      } else if (status === "PEN") {
        const penHome = fixture.score.penalty.home ?? 0;
        const penAway = fixture.score.penalty.away ?? 0;
        winner = penHome > penAway ? homeTeam.id : awayTeam.id;
        loser = penHome > penAway ? awayTeam.id : homeTeam.id;
      }

      if (winner) {
        if (!advancementMap[winner]) advancementMap[winner] = [];
        if (stage === "Round of 32") advancementMap[winner].push("Round of 32");
        if (stage === "Round of 16") advancementMap[winner].push("Round of 16");
        if (stage === "Quarter-finals") advancementMap[winner].push("Quarter-finals");
        if (stage === "Semi-finals") advancementMap[winner].push("Semi-finals");
        if (stage === "3rd Place Final") advancementMap[winner].push("3rd Place");
        if (stage === "Final") {
          advancementMap[winner].push("Champion");
          if (loser) {
            if (!advancementMap[loser]) advancementMap[loser] = [];
            advancementMap[loser].push("Runner-up");
          }
        }
      }
    }

    // Group stage advancement: top 2 per group advance to Round of 32
    // This is handled separately via standings
  }

  const standings = calculateStandings(draft.participants, results, advancementMap);

  return NextResponse.json({
    standings,
    draftCompleted: true,
    hasLiveGames,
    lastUpdated: new Date().toISOString(),
  });
}
