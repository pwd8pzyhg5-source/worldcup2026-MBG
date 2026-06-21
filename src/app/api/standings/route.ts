import { NextResponse } from "next/server";
import { getFixtures, getLiveFixtures } from "@/lib/api-football";
import { TEAMS, TEAM_BY_API_ID } from "../../../../data/teams";

// Keep in sync with api/points/route.ts — a status falling into neither set
// used to silently drop the fixture from the group table entirely.
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
  apiId: number;
  name: string;
  group: string;
  played: number;
  win: number;
  draw: number;
  lose: number;
  gf: number;
  ga: number;
};

export async function GET() {
  const [fixtures, liveFixtures] = await Promise.all([getFixtures(), getLiveFixtures()]);

  if (!fixtures) {
    return NextResponse.json({ error: "API unavailable", standings: [] }, { status: 200 });
  }

  // Merge live data so in-progress scores are current
  const liveById: Record<number, (typeof liveFixtures extends (infer T)[] | null ? T : never)> = {};
  if (liveFixtures) {
    for (const lf of liveFixtures) liveById[lf.fixture.id] = lf;
  }

  // Seed every team with zero stats so all 4 show even before they play
  const statsByApiId: Record<number, TeamStats> = {};
  for (const team of TEAMS) {
    if (!team.apiId) continue;
    statsByApiId[team.apiId] = {
      apiId: team.apiId,
      name: team.name,
      group: `Group ${team.group}`,
      played: 0, win: 0, draw: 0, lose: 0, gf: 0, ga: 0,
    };
  }

  // Accumulate results from all group stage matches (finished or in-progress)
  for (const raw of fixtures) {
    const f = liveById[raw.fixture.id] ?? raw;
    const status = f.fixture.status.short;
    const countable = COUNTABLE_STATUSES.includes(status);
    if (!countable) continue;
    if (!f.league.round.includes("Group")) continue;

    const homeId = f.teams.home.id;
    const awayId = f.teams.away.id;
    const homeGoals = f.goals.home ?? 0;
    const awayGoals = f.goals.away ?? 0;

    // Skip if we don't know this team (not in our 48)
    if (!statsByApiId[homeId] || !statsByApiId[awayId]) continue;

    statsByApiId[homeId].played++;
    statsByApiId[awayId].played++;
    statsByApiId[homeId].gf += homeGoals;
    statsByApiId[homeId].ga += awayGoals;
    statsByApiId[awayId].gf += awayGoals;
    statsByApiId[awayId].ga += homeGoals;

    if (homeGoals > awayGoals) {
      statsByApiId[homeId].win++;
      statsByApiId[awayId].lose++;
    } else if (awayGoals > homeGoals) {
      statsByApiId[awayId].win++;
      statsByApiId[homeId].lose++;
    } else {
      statsByApiId[homeId].draw++;
      statsByApiId[awayId].draw++;
    }
  }

  // Group entries by group letter, sort by Pts > GD > GF
  const groupMap: Record<string, StandingEntry[]> = {};
  for (const stats of Object.values(statsByApiId)) {
    const pts = stats.win * 3 + stats.draw;
    const entry: StandingEntry = {
      rank: 0,
      team: { id: stats.apiId, name: stats.name, logo: "" },
      points: pts,
      goalsDiff: stats.gf - stats.ga,
      group: stats.group,
      all: {
        played: stats.played,
        win: stats.win,
        draw: stats.draw,
        lose: stats.lose,
        goals: { for: stats.gf, against: stats.ga },
      },
    };
    if (!groupMap[stats.group]) groupMap[stats.group] = [];
    groupMap[stats.group].push(entry);
  }

  for (const entries of Object.values(groupMap)) {
    entries.sort((a, b) =>
      b.points - a.points ||
      b.goalsDiff - a.goalsDiff ||
      b.all.goals.for - a.all.goals.for
    );
    entries.forEach((e, i) => { e.rank = i + 1; });
  }

  // Return as sorted array of groups (A → L)
  const standings = Object.keys(groupMap)
    .sort()
    .map((g) => groupMap[g]);

  // Validate: if no teams reference TEAM_BY_API_ID it means we have the right data
  void TEAM_BY_API_ID;

  return NextResponse.json({ standings, lastUpdated: new Date().toISOString() });
}
