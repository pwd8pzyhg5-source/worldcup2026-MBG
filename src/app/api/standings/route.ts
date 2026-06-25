import { NextResponse } from "next/server";
import { getFixtures, getLiveFixtures } from "@/lib/api-football";
import { TEAMS } from "../../../../data/teams";

const COUNTABLE_STATUSES = ["FT", "AET", "PEN", "WO", "AWD", "1H", "HT", "2H", "ET", "P", "BT", "SUSP", "INT", "LIVE"];

interface StandingEntry {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}

type TeamStats = {
  apiId: number; name: string; group: string;
  played: number; win: number; draw: number; lose: number; gf: number; ga: number;
};

export async function GET() {
  const [fixtures, liveFixtures] = await Promise.all([getFixtures(), getLiveFixtures()]);

  if (!fixtures) {
    return NextResponse.json({ error: "API unavailable", standings: [] }, { status: 200 });
  }

  // Live fixtures override same ID so in-progress scores are current
  const liveById: Record<number, NonNullable<typeof liveFixtures>[number]> = {};
  if (liveFixtures) {
    for (const lf of liveFixtures) liveById[lf.fixture.id] = lf;
  }

  // Seed every team with zero stats so all 4 show even before they play
  const statsByApiId: Record<number, TeamStats> = {};
  for (const team of TEAMS) {
    if (!team.apiId) continue;
    statsByApiId[team.apiId] = {
      apiId: team.apiId, name: team.name, group: `Group ${team.group}`,
      played: 0, win: 0, draw: 0, lose: 0, gf: 0, ga: 0,
    };
  }

  for (const raw of fixtures) {
    const f = liveById[raw.fixture.id] ?? raw;
    if (!COUNTABLE_STATUSES.includes(f.fixture.status.short)) continue;
    if (!f.league.round.includes("Group")) continue;

    const homeId = f.teams.home.id;
    const awayId = f.teams.away.id;
    if (!statsByApiId[homeId] || !statsByApiId[awayId]) continue;

    const hg = f.goals.home ?? 0, ag = f.goals.away ?? 0;
    statsByApiId[homeId].played++; statsByApiId[awayId].played++;
    statsByApiId[homeId].gf += hg; statsByApiId[homeId].ga += ag;
    statsByApiId[awayId].gf += ag; statsByApiId[awayId].ga += hg;

    if (hg > ag) { statsByApiId[homeId].win++; statsByApiId[awayId].lose++; }
    else if (ag > hg) { statsByApiId[awayId].win++; statsByApiId[homeId].lose++; }
    else { statsByApiId[homeId].draw++; statsByApiId[awayId].draw++; }
  }

  const groupMap: Record<string, StandingEntry[]> = {};
  for (const stats of Object.values(statsByApiId)) {
    const entry: StandingEntry = {
      rank: 0,
      team: { id: stats.apiId, name: stats.name, logo: "" },
      points: stats.win * 3 + stats.draw,
      goalsDiff: stats.gf - stats.ga,
      group: stats.group,
      all: { played: stats.played, win: stats.win, draw: stats.draw, lose: stats.lose, goals: { for: stats.gf, against: stats.ga } },
    };
    if (!groupMap[stats.group]) groupMap[stats.group] = [];
    groupMap[stats.group].push(entry);
  }

  for (const entries of Object.values(groupMap)) {
    entries.sort((a, b) => b.points - a.points || b.goalsDiff - a.goalsDiff || b.all.goals.for - a.all.goals.for);
    entries.forEach((e, i) => { e.rank = i + 1; });
  }

  return NextResponse.json({
    standings: Object.keys(groupMap).sort().map((g) => groupMap[g]),
    lastUpdated: new Date().toISOString(),
  });
}
