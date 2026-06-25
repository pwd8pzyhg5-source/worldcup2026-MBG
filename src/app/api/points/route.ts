import { NextResponse } from "next/server";
import { readDraft } from "@/lib/draft";
import { getFixtures, getLiveFixtures, getFixtureEvents, parseRound } from "@/lib/api-football";
import { calculateStandings, MatchResult } from "@/lib/points";
import { TEAM_BY_API_ID } from "../../../../data/teams";

const FINISHED_STATUSES = ["FT", "AET", "PEN", "WO", "AWD"];
const IN_PROGRESS_STATUSES = ["1H", "HT", "2H", "ET", "P", "BT", "SUSP", "INT", "LIVE"];

export async function GET() {
  const draft = readDraft();

  if (!draft.completed) {
    const standings = Object.keys(draft.participants).map((name) => ({
      name, teams: [], totalPoints: 0, teamPoints: [],
    }));
    return NextResponse.json({ standings, draftCompleted: false });
  }

  const [fixtures, liveFixtures] = await Promise.all([getFixtures(), getLiveFixtures()]);

  if (!fixtures) {
    return NextResponse.json({ error: "API unavailable", standings: [], draftCompleted: true });
  }

  // Live fixtures override the cached fixture for the same ID so in-progress
  // scores are always current.
  const liveById: Record<number, NonNullable<typeof liveFixtures>[number]> = {};
  if (liveFixtures) {
    for (const lf of liveFixtures) liveById[lf.fixture.id] = lf;
  }

  const hasLiveGames = (liveFixtures?.length ?? 0) > 0;

  const countable = fixtures
    .map((f) => liveById[f.fixture.id] ?? f)
    .filter((f) => {
      const s = f.fixture.status.short;
      return (FINISHED_STATUSES.includes(s) || IN_PROGRESS_STATUSES.includes(s))
        && !!TEAM_BY_API_ID[f.teams.home.id]
        && !!TEAM_BY_API_ID[f.teams.away.id];
    });

  function eventsTtlFor(fixture: (typeof countable)[number]): number {
    const s = fixture.fixture.status.short;
    if (IN_PROGRESS_STATUSES.includes(s)) return 60;
    const hrs = (Date.now() - new Date(fixture.fixture.date).getTime()) / 3_600_000;
    return hrs < 2.5 ? 45 * 60 : 6 * 3600;
  }

  const eventsByFixture = await Promise.all(
    countable.map((f) => getFixtureEvents(f.fixture.id, eventsTtlFor(f)))
  );

  const results: MatchResult[] = [];
  const advancementMap: Record<string, string[]> = {};

  for (let idx = 0; idx < countable.length; idx++) {
    const fixture = countable[idx];
    const status = fixture.fixture.status.short as MatchResult["status"];
    const homeTeam = TEAM_BY_API_ID[fixture.teams.home.id];
    const awayTeam = TEAM_BY_API_ID[fixture.teams.away.id];
    if (!homeTeam || !awayTeam) continue;

    const stage = parseRound(fixture.league.round) as MatchResult["stage"];

    // Deduplicate dismissals — API-Football fires both "Second Yellow Card"
    // and "Red Card" for the same player when sent off via second yellow.
    let homeRed = 0, awayRed = 0, homeYellow = 0, awayYellow = 0;
    const seenDismissals = new Set<string>();
    const events = eventsByFixture[idx];
    if (events) {
      for (const ev of events) {
        const isHome = ev.team.id === fixture.teams.home.id;
        if (ev.type === "Card") {
          if (ev.detail === "Red Card" || ev.detail === "Second Yellow Card") {
            const key = `${ev.team.id}-${ev.player.name}-${ev.time.elapsed}`;
            if (!seenDismissals.has(key)) {
              seenDismissals.add(key);
              if (isHome) homeRed++; else awayRed++;
            }
          } else if (ev.detail === "Yellow Card") {
            if (isHome) homeYellow++; else awayYellow++;
          }
        }
      }
    }

    results.push({
      fixtureId: fixture.fixture.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeGoals: fixture.goals.home ?? 0,
      awayGoals: fixture.goals.away ?? 0,
      status,
      stage,
      homeRedCards: homeRed,
      awayRedCards: awayRed,
      homeYellowCards: homeYellow,
      awayYellowCards: awayYellow,
    });

    if (stage !== "Group Stage") {
      const hg = fixture.goals.home ?? 0, ag = fixture.goals.away ?? 0;
      let winner: string | null = null, loser: string | null = null;
      if (hg > ag) { winner = homeTeam.id; loser = awayTeam.id; }
      else if (ag > hg) { winner = awayTeam.id; loser = homeTeam.id; }
      else if (status === "PEN") {
        const ph = fixture.score.penalty.home ?? 0, pa = fixture.score.penalty.away ?? 0;
        winner = ph > pa ? homeTeam.id : awayTeam.id;
        loser = ph > pa ? awayTeam.id : homeTeam.id;
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
  }

  const standings = calculateStandings(draft.participants, results, advancementMap);

  return NextResponse.json({
    standings,
    draftCompleted: true,
    hasLiveGames,
    lastUpdated: new Date().toISOString(),
  });
}
