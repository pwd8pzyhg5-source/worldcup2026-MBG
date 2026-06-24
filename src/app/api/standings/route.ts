import { NextResponse } from "next/server";
import { getFinishedFixtures, getFixtures, getLiveFixtures } from "@/lib/api-football";
import { TEAMS } from "../../../../data/teams";

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

// FINISHED_STATUSES kept in sync with points/route.ts
const FINISHED_STATUSES = ["FT", "AET", "PEN", "WO", "AWD"];

export async function GET() {
  const [finishedFixtures, allFixtures, liveFixtures] = await Promise.all([
    getFinishedFixtures(),
    getFixtures(),
    getLiveFixtures(),
  ]);

  const baseFinished: typeof finishedFixtures =
    finishedFixtures && finishedFixtures.length > 0
      ? finishedFixtures
      : (allFixtures ?? []).filter((f) => FINISHED_STATUSES.includes(f.fixture.status.short));

  if (!baseFinished && !liveFixtures) {
    return NextResponse.json({ error: "API unavailable", standings: [] }, { status: 200 });
  }

  const finishedById = new Map((baseFinished ?? []).map((f) => [f.fixture.id, f]));
  const liveList = liveFixtures ?? [];

  // Merge: finished (stable scores) + live games not already finished
  const fixtures = [
    ...(baseFinished ?? []),
    ...liveList.filter((lf) => !finishedById.has(lf.fixture.id)),
  ];

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
  for (const f of fixtures) {
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

  return NextResponse.json({ standings, lastUpdated: new Date().toISOString() });
}
