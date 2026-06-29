import { NextResponse } from "next/server";
import { getFixtures, parseRound } from "@/lib/api-football";
import { TEAM_BY_API_ID } from "../../../../data/teams";
import { R16_PAIRINGS, type Slot } from "@/lib/bracket";

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

const FINISHED = new Set(["FT", "AET", "PEN", "WO", "AWD"]);

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

  // The API doesn't pre-create R16+ fixtures until teams are confirmed, so derive
  // R16 ourselves from finished R32 results using the known bracket structure.
  const r32 = rounds["Round of 32"] || [];

  // Find the winner of an R32 match between two given team slugs, if it's finished.
  function findR32Winner(teamA: string, teamB: string): string | null {
    for (const m of r32) {
      const ids = [m.homeTeamId, m.awayTeamId];
      if (!ids.includes(teamA) || !ids.includes(teamB)) continue;
      if (!FINISHED.has(m.status)) return null;
      const hg = m.homeGoals ?? 0;
      const ag = m.awayGoals ?? 0;
      if (hg === ag) return null; // shouldn't happen in knockout, but guard anyway
      const winnerId = hg > ag ? m.homeTeamId : m.awayTeamId;
      return winnerId;
    }
    return null;
  }

  function resolveSlot(slot: Slot): string | null {
    if (slot.type === "fixed") return slot.team;
    return findR32Winner(slot.teams[0], slot.teams[1]);
  }

  if (r32.length > 0 && !rounds["Round of 16"]) {
    rounds["Round of 16"] = R16_PAIRINGS.map((pairing, i) => ({
      fixtureId: -1000 - i,
      round: "Round of 16",
      date: null,
      status: "TBD",
      homeTeamId: resolveSlot(pairing.home),
      awayTeamId: resolveSlot(pairing.away),
      homeGoals: null,
      awayGoals: null,
    }));
  }

  // Sort matches within each round by date (synthetic R16 entries have no date, kept in pairing order)
  for (const round of Object.keys(rounds)) {
    rounds[round].sort((a, b) => {
      if (!a.date && !b.date) return 0;
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
