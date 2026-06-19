import { NextResponse } from "next/server";
import { readDraft } from "@/lib/draft";
import { getFixtures, getLiveFixtures, getFixtureEvents, parseRound } from "@/lib/api-football";
import { calculateStandings, MatchResult } from "@/lib/points";
import { TEAM_BY_API_ID } from "../../../../data/teams";

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

  const [fixtures, liveFixtures] = await Promise.all([getFixtures(), getLiveFixtures()]);
  if (!fixtures) {
    return NextResponse.json({ error: "API unavailable", standings: [], draftCompleted: true });
  }

  // Merge live fixture data into full fixture list so in-progress scores are current
  const liveById: Record<number, typeof liveFixtures extends (infer T)[] | null ? T : never> = {};
  if (liveFixtures) {
    for (const lf of liveFixtures) liveById[lf.fixture.id] = lf;
  }

  const hasLiveGames = (liveFixtures?.length ?? 0) > 0;

  // Filter to fixtures that count toward standings
  const countable = fixtures
    .map((rawFixture) => liveById[rawFixture.fixture.id] ?? rawFixture)
    .filter((fixture) => {
      const status = fixture.fixture.status.short;
      const finished = ["FT", "AET", "PEN"].includes(status);
      const inProgress = ["1H", "HT", "2H", "ET", "P"].includes(status);
      if (!finished && !inProgress) return false;
      return !!TEAM_BY_API_ID[fixture.teams.home.id] && !!TEAM_BY_API_ID[fixture.teams.away.id];
    });

  // Fetch events for all qualifying fixtures in parallel — finished matches
  // are cached for hours, only in-progress matches refresh fast
  const eventsByFixture = await Promise.all(
    countable.map((fixture) => {
      const inProgress = ["1H", "HT", "2H", "ET", "P"].includes(fixture.fixture.status.short);
      return getFixtureEvents(fixture.fixture.id, inProgress);
    })
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
