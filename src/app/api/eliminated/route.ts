import { NextResponse } from "next/server";
import { getFixtures, getStandings, parseRound } from "@/lib/api-football";
import { TEAM_BY_API_ID } from "../../../../data/teams";

const GROUP_STAGE = "Group Stage";
const FINISHED = new Set(["FT", "AET", "PEN", "WO", "AWD"]);

// Returns team slugs (our IDs) for teams that are out of the tournament.
// Group stage: ranked 3rd or 4th after 3 games and not appearing in any R32+ fixture.
// Knockout: appeared in a finished knockout match and lost.
export async function GET() {
  const [fixtures, standingsGroups] = await Promise.all([getFixtures(), getStandings()]);

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

  // Group stage eliminations: rank 3+ with 3 games played, not in any knockout fixture
  if (standingsGroups) {
    for (const group of standingsGroups) {
      for (const entry of group) {
        if (entry.rank >= 3 && entry.all.played >= 3) {
          const team = TEAM_BY_API_ID[entry.team.id];
          if (team && !inKnockout.has(team.id)) eliminated.add(team.id);
        }
      }
    }
  }

  // Knockout eliminations: team that lost a finished knockout match
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

  return NextResponse.json(
    { eliminated: [...eliminated] },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" } }
  );
}
