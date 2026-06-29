import { NextResponse } from "next/server";
import { getFixtures, parseRound } from "@/lib/api-football";
import { TEAM_BY_API_ID } from "../../../../data/teams";
import { MANUAL_RESULTS } from "@/lib/bracket";

const GROUP_STAGE = "Group Stage";
const FINISHED = new Set(["FT", "AET", "PEN", "WO", "AWD"]);

export async function GET() {
  const fixtures = await getFixtures();
  if (!fixtures) return NextResponse.json({ eliminated: [] });

  const eliminated = new Set<string>();

  // Find all teams that appear in any R32+ fixture (scheduled or finished)
  const inKnockout = new Set<string>();
  for (const f of fixtures) {
    if (parseRound(f.league.round) === GROUP_STAGE) continue;
    const h = TEAM_BY_API_ID[f.teams.home.id];
    const a = TEAM_BY_API_ID[f.teams.away.id];
    if (h) inKnockout.add(h.id);
    if (a) inKnockout.add(a.id);
  }

  // Count finished group stage games per team
  const groupGamesPlayed: Record<string, number> = {};
  for (const f of fixtures) {
    if (parseRound(f.league.round) !== GROUP_STAGE) continue;
    if (!FINISHED.has(f.fixture.status.short)) continue;
    const h = TEAM_BY_API_ID[f.teams.home.id];
    const a = TEAM_BY_API_ID[f.teams.away.id];
    if (h) groupGamesPlayed[h.id] = (groupGamesPlayed[h.id] || 0) + 1;
    if (a) groupGamesPlayed[a.id] = (groupGamesPlayed[a.id] || 0) + 1;
  }

  // Any team that played all 3 group games and didn't make any knockout fixture = eliminated
  for (const [teamId, played] of Object.entries(groupGamesPlayed)) {
    if (played >= 3 && !inKnockout.has(teamId)) eliminated.add(teamId);
  }

  // Knockout eliminations: loser of any finished knockout match
  for (const f of fixtures) {
    if (parseRound(f.league.round) === GROUP_STAGE) continue;
    if (!FINISHED.has(f.fixture.status.short)) continue;
    const hg = f.goals.home ?? 0;
    const ag = f.goals.away ?? 0;
    const h = TEAM_BY_API_ID[f.teams.home.id];
    const a = TEAM_BY_API_ID[f.teams.away.id];
    if (!h || !a) continue;
    if (hg > ag) eliminated.add(a.id);
    else if (ag > hg) eliminated.add(h.id);
  }

  // Apply manual overrides for results the API hasn't confirmed yet
  for (const [key, winner] of Object.entries(MANUAL_RESULTS)) {
    const [teamA, teamB] = key.split("|");
    const loser = winner === teamA ? teamB : teamA;
    eliminated.add(loser);
    // Winner stays in-tournament (remove from eliminated if mistakenly added)
    eliminated.delete(winner);
  }

  return NextResponse.json(
    { eliminated: [...eliminated] },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" } }
  );
}
