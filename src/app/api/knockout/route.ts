import { NextResponse } from "next/server";
import { getFixtures, parseRound } from "@/lib/api-football";
import { TEAM_BY_API_ID } from "../../../../data/teams";

export interface KnockoutFixture {
  fixtureId: number;
  round: string;
  date: string | null;
  status: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
}

const KNOCKOUT_ROUND_ORDER = [
  "Round of 32",
  "Round of 16",
  "Quarter-finals",
  "Semi-finals",
  "3rd Place Final",
  "Final",
];

export async function GET() {
  const fixtures = await getFixtures();
  if (!fixtures) {
    return NextResponse.json({ rounds: {} });
  }

  const rounds: Record<string, KnockoutFixture[]> = {};

  for (const f of fixtures) {
    const round = parseRound(f.league.round);
    if (round === "Group Stage") continue;

    if (!rounds[round]) rounds[round] = [];

    const homeTeam = TEAM_BY_API_ID[f.teams.home.id];
    const awayTeam = TEAM_BY_API_ID[f.teams.away.id];

    rounds[round].push({
      fixtureId: f.fixture.id,
      round,
      date: f.fixture.date,
      status: f.fixture.status.short,
      homeTeamId: homeTeam?.id ?? null,
      awayTeamId: awayTeam?.id ?? null,
      homeGoals: f.goals.home,
      awayGoals: f.goals.away,
    });
  }

  // Sort matches within each round by date
  for (const round of Object.keys(rounds)) {
    rounds[round].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }

  return NextResponse.json(
    { rounds, roundOrder: KNOCKOUT_ROUND_ORDER.filter((r) => rounds[r]) },
    { headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=60" } }
  );
}
