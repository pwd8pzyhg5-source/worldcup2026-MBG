import { NextResponse } from "next/server";
import { getFixtures, parseRound } from "@/lib/api-football";
import { TEAM_BY_API_ID } from "../../../../data/teams";
import { R16_PAIRINGS, R32_BRACKET_ORDER, MANUAL_RESULTS, type Slot } from "@/lib/bracket";

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

// Build a lookup: sorted pair key → bracket position index
const R32_POSITION: Map<string, number> = new Map(
  R32_BRACKET_ORDER.map((pair, i) => [pairKey(pair[0], pair[1]), i])
);

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

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

  // Sort R32 by official bracket position (not date) so left/right halves
  // and connector alignment are correct.
  if (rounds["Round of 32"]) {
    rounds["Round of 32"].sort((a, b) => {
      const ka = pairKey(a.homeTeamId ?? "", a.awayTeamId ?? "");
      const kb = pairKey(b.homeTeamId ?? "", b.awayTeamId ?? "");
      const pa = R32_POSITION.get(ka) ?? 999;
      const pb = R32_POSITION.get(kb) ?? 999;
      return pa - pb;
    });
  }

  // The API doesn't pre-create R16+ fixtures until teams are confirmed.
  // Derive R16 from finished R32 results using the known bracket structure.
  const r32 = rounds["Round of 32"] || [];

  function findR32Winner(teamA: string, teamB: string): string | null {
    // API result takes precedence when the match is confirmed finished
    for (const m of r32) {
      const ids = new Set([m.homeTeamId, m.awayTeamId]);
      if (!ids.has(teamA) || !ids.has(teamB)) continue;
      if (!FINISHED.has(m.status)) break; // match exists but not finished — fall through
      const hg = m.homeGoals ?? 0;
      const ag = m.awayGoals ?? 0;
      if (hg > ag) return m.homeTeamId;
      if (ag > hg) return m.awayTeamId;
      // Goals level after 90/120 min — decided by penalties. API may still be updating
      // status to "PEN". Fall through to manual override to get the correct winner.
      break;
    }
    // Manual override: covers (a) API not yet updated, (b) penalty result not yet reflected
    const key = [teamA, teamB].sort().join("|");
    return MANUAL_RESULTS[key] ?? null;
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

  return NextResponse.json(
    { rounds, roundOrder: KNOCKOUT_ROUND_ORDER.filter((r) => rounds[r]) },
    { headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=60" } }
  );
}
