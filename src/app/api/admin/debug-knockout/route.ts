import { NextResponse } from "next/server";
import { getFixtures, parseRound } from "@/lib/api-football";
import { TEAM_BY_API_ID } from "../../../../../data/teams";
import { R16_PAIRINGS, R32_BRACKET_ORDER, MANUAL_RESULTS, type Slot } from "@/lib/bracket";

const FINISHED = new Set(["FT", "AET", "PEN", "WO", "AWD"]);

const R32_POSITION = new Map(
  R32_BRACKET_ORDER.map((pair, i) => [[pair[0], pair[1]].sort().join("|"), i])
);

function pairKey(a: string | null, b: string | null) {
  return [a ?? "", b ?? ""].sort().join("|");
}

export async function GET() {
  const fixtures = await getFixtures();
  if (!fixtures) return NextResponse.json({ error: "no fixtures" });

  const r32raw: { fixtureId: number; homeTeamId: string | null; awayTeamId: string | null; status: string; homeGoals: number | null; awayGoals: number | null }[] = [];

  for (const f of fixtures) {
    if (parseRound(f.league.round) !== "Round of 32") continue;
    const homeTeam = TEAM_BY_API_ID[f.teams.home.id];
    const awayTeam = TEAM_BY_API_ID[f.teams.away.id];
    r32raw.push({
      fixtureId: f.fixture.id,
      homeTeamId: homeTeam?.id ?? null,
      awayTeamId: awayTeam?.id ?? null,
      status: f.fixture.status.short,
      homeGoals: f.goals.home,
      awayGoals: f.goals.away,
    });
  }

  // Sort by bracket position (same logic as knockout route)
  const r32sorted = [...r32raw].sort((a, b) => {
    const ka = pairKey(a.homeTeamId, a.awayTeamId);
    const kb = pairKey(b.homeTeamId, b.awayTeamId);
    const pa = R32_POSITION.get(ka) ?? 999;
    const pb = R32_POSITION.get(kb) ?? 999;
    return pa - pb;
  });

  // Show position, pairKey, and bracket position for each
  const r32debug = r32sorted.map((m, i) => {
    const k = pairKey(m.homeTeamId, m.awayTeamId);
    const bracketPos = R32_POSITION.get(k) ?? "MISSING";
    return {
      sortedPos: i,
      bracketPos,
      pairKey: k,
      home: m.homeTeamId,
      away: m.awayTeamId,
      status: m.status,
      score: m.homeGoals !== null ? `${m.homeGoals}-${m.awayGoals}` : null,
    };
  });

  // Derive R16
  function findR32Winner(teamA: string, teamB: string): string | null {
    for (const m of r32sorted) {
      const ids = new Set([m.homeTeamId, m.awayTeamId]);
      if (!ids.has(teamA) || !ids.has(teamB)) continue;
      if (!FINISHED.has(m.status)) break;
      const hg = m.homeGoals ?? 0;
      const ag = m.awayGoals ?? 0;
      if (hg > ag) return m.homeTeamId;
      if (ag > hg) return m.awayTeamId;
      break;
    }
    const key = [teamA, teamB].sort().join("|");
    return MANUAL_RESULTS[key] ?? null;
  }

  function resolveSlot(slot: Slot): string | null {
    if (slot.type === "fixed") return slot.team;
    return findR32Winner(slot.teams[0], slot.teams[1]);
  }

  const r16derived = R16_PAIRINGS.map((p, i) => ({
    index: i,
    side: i < 4 ? "LEFT" : "RIGHT",
    home: resolveSlot(p.home),
    away: resolveSlot(p.away),
  }));

  return NextResponse.json({
    r32Count: r32raw.length,
    r32Sorted: r32debug,
    r32L: r32debug.slice(0, 8).map((m) => `${m.home} vs ${m.away} [pos=${m.bracketPos}]`),
    r32R: r32debug.slice(8, 16).map((m) => `${m.home} vs ${m.away} [pos=${m.bracketPos}]`),
    r16Derived: r16derived,
  });
}
