import { NextResponse } from "next/server";
import { TEAM_BY_API_ID } from "../../../../data/teams";
import { readDraft } from "@/lib/draft";
import { parseRound } from "@/lib/api-football";
import { isUpsetEligible, isTopTen } from "@/lib/fifaRankings";

const BASE_URL = "https://v3.football.api-sports.io";

// Always bypass cache — this is a diagnostic endpoint for manual audits.
async function rawFetch(path: string) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return null;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) return null;
  return json.response;
}

const FINISHED = ["FT", "AET", "PEN", "WO", "AWD"];
const IN_PROGRESS = ["1H", "HT", "2H", "ET", "P", "BT", "SUSP", "INT", "LIVE"];
const POINTS = {
  groupWin: 3, groupDraw: 1, cleanSheet: 2, goal: 1,
  upsetWin: 3, upsetDraw: 1,
  round32: 2, round16: 4, quarterFinal: 6,
  bronze: 9, runnerUp: 11, champion: 15,
  redCard: -2, yellowCardPair: -1,
};

export async function GET() {
  const draft = readDraft();
  if (!draft.completed) return NextResponse.json({ error: "Draft not completed" });

  // Fetch all finished fixtures + live in parallel, plus events for each finished match
  const [finishedRaw, liveRaw] = await Promise.all([
    rawFetch(`/fixtures?league=1&season=2026&status=FT-AET-PEN-WO-AWD`),
    rawFetch(`/fixtures?league=1&live=all`),
  ]);

  const finished = (finishedRaw ?? []).filter(
    (f: { teams: { home: { id: number }; away: { id: number } } }) =>
      TEAM_BY_API_ID[f.teams.home.id] && TEAM_BY_API_ID[f.teams.away.id]
  );
  const live = (liveRaw ?? []).filter(
    (f: { teams: { home: { id: number }; away: { id: number } } }) =>
      TEAM_BY_API_ID[f.teams.home.id] && TEAM_BY_API_ID[f.teams.away.id]
  );

  const finishedIds = new Set(finished.map((f: { fixture: { id: number } }) => f.fixture.id));
  const allFixtures = [...finished, ...live.filter((f: { fixture: { id: number } }) => !finishedIds.has(f.fixture.id))];

  // Fetch events for every countable fixture (for card data)
  const eventsByFixtureId: Record<number, unknown[]> = {};
  await Promise.all(
    allFixtures.map(async (f: { fixture: { id: number } }) => {
      const events = await rawFetch(`/fixtures/events?fixture=${f.fixture.id}`);
      eventsByFixtureId[f.fixture.id] = events ?? [];
    })
  );

  // Build match summaries
  const matchSummaries: Record<number, {
    fixtureId: number;
    date: string;
    round: string;
    stage: string;
    status: string;
    home: string; homeGoals: number;
    away: string; awayGoals: number;
    homeYellows: number; awayYellows: number;
    homeReds: number; awayReds: number;
  }> = {};

  for (const f of allFixtures) {
    const status = f.fixture.status.short;
    if (!FINISHED.includes(status) && !IN_PROGRESS.includes(status)) continue;

    const homeTeam = TEAM_BY_API_ID[f.teams.home.id];
    const awayTeam = TEAM_BY_API_ID[f.teams.away.id];
    if (!homeTeam || !awayTeam) continue;

    let homeYellows = 0, awayYellows = 0, homeReds = 0, awayReds = 0;
    for (const ev of (eventsByFixtureId[f.fixture.id] ?? []) as Array<{ team: { id: number }; type: string; detail: string }>) {
      const isHome = ev.team.id === f.teams.home.id;
      if (ev.type === "Card") {
        if (ev.detail === "Red Card" || ev.detail === "Second Yellow Card") {
          if (isHome) homeReds++; else awayReds++;
        } else if (ev.detail === "Yellow Card") {
          if (isHome) homeYellows++; else awayYellows++;
        }
      }
    }

    matchSummaries[f.fixture.id] = {
      fixtureId: f.fixture.id,
      date: f.fixture.date,
      round: f.league.round,
      stage: parseRound(f.league.round),
      status,
      home: homeTeam.id, homeGoals: f.goals.home ?? 0,
      away: awayTeam.id, awayGoals: f.goals.away ?? 0,
      homeYellows, awayYellows, homeReds, awayReds,
    };
  }

  const matches = Object.values(matchSummaries);

  // Build advancement map from knockout results
  const advancementMap: Record<string, string[]> = {};
  for (const m of matches) {
    if (m.stage === "Group Stage") continue;
    if (!FINISHED.includes(m.status)) continue;
    let winner: string | null = null, loser: string | null = null;
    if (m.homeGoals > m.awayGoals) { winner = m.home; loser = m.away; }
    else if (m.awayGoals > m.homeGoals) { winner = m.away; loser = m.home; }
    if (winner) {
      if (!advancementMap[winner]) advancementMap[winner] = [];
      if (m.stage === "Round of 32") advancementMap[winner].push("Round of 32");
      if (m.stage === "Round of 16") advancementMap[winner].push("Round of 16");
      if (m.stage === "Quarter-finals") advancementMap[winner].push("Quarter-finals");
      if (m.stage === "Semi-finals") advancementMap[winner].push("Semi-finals");
      if (m.stage === "3rd Place Final") advancementMap[winner].push("3rd Place");
      if (m.stage === "Final") {
        advancementMap[winner].push("Champion");
        if (loser) { if (!advancementMap[loser]) advancementMap[loser] = []; advancementMap[loser].push("Runner-up"); }
      }
    }
  }

  // Per-participant audit
  const audit = Object.entries(draft.participants).map(([participant, teamIds]) => {
    const teams = (teamIds as string[]).map((teamId) => {
      const teamMatches = matches.filter((m) => m.home === teamId || m.away === teamId);
      let totalYellows = 0;
      const matchDetail = teamMatches.map((m) => {
        const isHome = m.home === teamId;
        const myGoals = isHome ? m.homeGoals : m.awayGoals;
        const theirGoals = isHome ? m.awayGoals : m.homeGoals;
        const myYellows = isHome ? m.homeYellows : m.awayYellows;
        const myReds = isHome ? m.homeReds : m.awayReds;
        totalYellows += myYellows;
        const opponent = isHome ? m.away : m.home;
        const upsetEligible = isUpsetEligible(teamId) && isTopTen(opponent);
        return {
          date: m.date.slice(0, 10),
          opponent,
          stage: m.stage,
          status: m.status,
          score: `${myGoals}-${theirGoals}`,
          result: myGoals > theirGoals ? "W" : myGoals < theirGoals ? "L" : "D",
          goals: myGoals,
          cleanSheet: theirGoals === 0,
          yellows: myYellows,
          reds: myReds,
          upsetEligible,
          upsetBonus: upsetEligible ? (myGoals > theirGoals ? "+3 upset win" : myGoals === theirGoals ? "+1 upset draw" : null) : null,
          pts: {
            win: m.stage === "Group Stage" && myGoals > theirGoals ? POINTS.groupWin : 0,
            draw: m.stage === "Group Stage" && myGoals === theirGoals ? POINTS.groupDraw : 0,
            goals: myGoals * POINTS.goal,
            cleanSheet: theirGoals === 0 ? POINTS.cleanSheet : 0,
            upset: upsetEligible ? (myGoals > theirGoals ? POINTS.upsetWin : myGoals === theirGoals ? POINTS.upsetDraw : 0) : 0,
            reds: myReds * POINTS.redCard,
          },
        };
      });

      const yellowPenalty = Math.floor(totalYellows / 3) * POINTS.yellowCardPair;
      const stages = advancementMap[teamId] || [];
      const advancePts = {
        round32: stages.includes("Round of 32") ? POINTS.round32 : 0,
        round16: stages.includes("Round of 16") ? POINTS.round16 : 0,
        qf: stages.includes("Quarter-finals") ? POINTS.quarterFinal : 0,
        bronze: stages.includes("3rd Place") ? POINTS.bronze : 0,
        runnerUp: stages.includes("Runner-up") ? POINTS.runnerUp : 0,
        champion: stages.includes("Champion") ? POINTS.champion : 0,
      };

      const matchPts = matchDetail.reduce((sum, m) =>
        sum + m.pts.win + m.pts.draw + m.pts.goals + m.pts.cleanSheet + m.pts.upset + m.pts.reds, 0
      );
      const total = matchPts + yellowPenalty + Object.values(advancePts).reduce((a, b) => a + b, 0);

      return { teamId, matchCount: teamMatches.length, totalYellows, yellowPenalty, advancePts, stages, matchDetail, total };
    });

    const grandTotal = teams.reduce((sum, t) => sum + t.total, 0);
    return { participant, grandTotal, teams };
  }).sort((a, b) => b.grandTotal - a.grandTotal);

  return NextResponse.json({
    auditedAt: new Date().toISOString(),
    matchesProcessed: matches.length,
    audit,
  }, { headers: { "Cache-Control": "no-store" } });
}
