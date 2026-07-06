import { NextResponse } from "next/server";
import { TEAM_BY_API_ID } from "../../../../data/teams";
import { readDraft } from "@/lib/draft";
import { parseRound } from "@/lib/api-football";
import { isUpsetEligible, isTopTen } from "@/lib/fifaRankings";
import { MANUAL_ADVANCEMENTS } from "@/lib/bracket";

const BASE_URL = "https://v3.football.api-sports.io";

// Always bypass cache — diagnostic endpoint.
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

const FINISHED = new Set(["FT", "AET", "PEN", "WO", "AWD"]);
const IN_PROGRESS = new Set(["1H", "HT", "2H", "ET", "P", "BT", "SUSP", "INT", "LIVE"]);
const POINTS = {
  win: 3, draw: 1, cleanSheet: 2, goal: 1,
  upsetWin: 3, upsetDraw: 1,
  round32: 2, round16: 4, quarterFinal: 6, semiFinal: 0,
  bronze: 9, runnerUp: 11, champion: 15,
  redCard: -2, yellowCardPair: -1,
};

export async function GET() {
  const draft = readDraft();
  if (!draft.completed) return NextResponse.json({ error: "Draft not completed" });

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

  // Fetch card events for all fixtures
  const eventsByFixtureId: Record<number, unknown[]> = {};
  await Promise.all(
    allFixtures.map(async (f: { fixture: { id: number } }) => {
      const events = await rawFetch(`/fixtures/events?fixture=${f.fixture.id}`);
      eventsByFixtureId[f.fixture.id] = events ?? [];
    })
  );

  interface MatchSummary {
    fixtureId: number;
    date: string;
    round: string;
    stage: string;
    status: string;
    home: string; homeGoals: number;
    away: string; awayGoals: number;
    winnerId: string | null;
    homeYellows: number; awayYellows: number;
    homeReds: number; awayReds: number;
  }

  const matchSummaries: Record<number, MatchSummary> = {};

  for (const f of allFixtures) {
    const status = f.fixture.status.short;
    if (!FINISHED.has(status) && !IN_PROGRESS.has(status)) continue;

    const homeTeam = TEAM_BY_API_ID[f.teams.home.id];
    const awayTeam = TEAM_BY_API_ID[f.teams.away.id];
    if (!homeTeam || !awayTeam) continue;

    let homeYellows = 0, awayYellows = 0, homeReds = 0, awayReds = 0;
    const seenDismissals = new Set<string>();
    type CardEvent = { time: { elapsed: number }; team: { id: number }; player: { name: string }; type: string; detail: string };
    for (const ev of (eventsByFixtureId[f.fixture.id] ?? []) as CardEvent[]) {
      const isHome = ev.team.id === f.teams.home.id;
      if (ev.type === "Card") {
        if (ev.detail === "Red Card" || ev.detail === "Second Yellow Card") {
          const key = `${ev.team.id}-${ev.player.name}-${ev.time.elapsed}`;
          if (!seenDismissals.has(key)) {
            seenDismissals.add(key);
            if (isHome) homeReds++; else awayReds++;
          }
        } else if (ev.detail === "Yellow Card") {
          if (isHome) homeYellows++; else awayYellows++;
        }
      }
    }

    const hg = f.goals.home ?? 0;
    const ag = f.goals.away ?? 0;
    let winnerId: string | null = null;
    if (hg > ag) winnerId = homeTeam.id;
    else if (ag > hg) winnerId = awayTeam.id;
    else if (status === "PEN") {
      const ph = f.score?.penalty?.home ?? 0;
      const pa = f.score?.penalty?.away ?? 0;
      winnerId = ph > pa ? homeTeam.id : awayTeam.id;
    }

    matchSummaries[f.fixture.id] = {
      fixtureId: f.fixture.id,
      date: f.fixture.date,
      round: f.league.round,
      stage: parseRound(f.league.round),
      status,
      home: homeTeam.id, homeGoals: hg,
      away: awayTeam.id, awayGoals: ag,
      winnerId,
      homeYellows, awayYellows, homeReds, awayReds,
    };
  }

  const matches = Object.values(matchSummaries);

  // Build advancement map — same logic as points/route.ts (with PEN handling)
  const advancementMap: Record<string, string[]> = {};
  for (const m of matches) {
    if (m.stage === "Group Stage") continue;
    if (!FINISHED.has(m.status)) continue;
    const winner = m.winnerId;
    const loser = winner ? (winner === m.home ? m.away : m.home) : null;
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

  // Merge manual overrides (for results API hasn't confirmed yet)
  for (const [teamId, stages] of Object.entries(MANUAL_ADVANCEMENTS)) {
    if (!advancementMap[teamId]) advancementMap[teamId] = [];
    for (const stage of stages) {
      if (!advancementMap[teamId].includes(stage)) advancementMap[teamId].push(stage);
    }
  }

  // Per-participant audit — mirrors calculateTeamPoints exactly
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
        const iWon = m.winnerId === teamId;
        const trueDraw = m.winnerId === null;
        const upsetEligible = isUpsetEligible(teamId) && isTopTen(opponent);

        // Win points apply in all stages (same as calculateTeamPoints)
        const winPts = iWon ? POINTS.win : trueDraw && m.stage === "Group Stage" ? POINTS.draw : 0;
        const upsetPts = upsetEligible ? (iWon ? POINTS.upsetWin : trueDraw ? POINTS.upsetDraw : 0) : 0;

        return {
          date: m.date.slice(0, 10),
          opponent,
          stage: m.stage,
          status: m.status,
          score: `${myGoals}-${theirGoals}`,
          result: iWon ? "W" : trueDraw ? "D" : "L",
          goals: myGoals,
          cleanSheet: theirGoals === 0,
          yellows: myYellows,
          reds: myReds,
          upsetBonus: upsetEligible ? (iWon ? "+3 upset win" : trueDraw ? "+1 upset draw" : null) : null,
          pts: {
            win: winPts,
            goals: myGoals * POINTS.goal,
            cleanSheet: theirGoals === 0 ? POINTS.cleanSheet : 0,
            upset: upsetPts,
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
        sf: stages.includes("Semi-finals") ? POINTS.semiFinal : 0,
        bronze: stages.includes("3rd Place") ? POINTS.bronze : 0,
        runnerUp: stages.includes("Runner-up") ? POINTS.runnerUp : 0,
        champion: stages.includes("Champion") ? POINTS.champion : 0,
      };

      const matchPts = matchDetail.reduce((sum, m) =>
        sum + m.pts.win + m.pts.goals + m.pts.cleanSheet + m.pts.upset + m.pts.reds, 0
      );
      const total = matchPts + yellowPenalty + Object.values(advancePts).reduce((a, b) => a + b, 0);

      return {
        teamId,
        matchCount: teamMatches.length,
        totalYellows,
        yellowPenalty,
        stages,
        advancePts,
        matchDetail,
        total,
      };
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
