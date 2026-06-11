import { NextResponse } from "next/server";
import { getFixtures } from "@/lib/api-football";
import { TEAM_BY_API_ID, TEAMS } from "../../../../data/teams";

// Diagnostic endpoint — hit /api/debug to see what the API returns
// and whether our team mapping is working.
// Remove or protect this before making the app public.
export async function GET() {
  const fixtures = await getFixtures();

  if (!fixtures) {
    return NextResponse.json({ error: "API_FOOTBALL_KEY missing or API unreachable" });
  }

  // Collect every unique team the API has returned
  const apiTeams: Record<number, { id: number; name: string; matched: boolean; ourId?: string }> = {};
  for (const f of fixtures) {
    const h = f.teams.home;
    const a = f.teams.away;
    if (!apiTeams[h.id]) {
      const match = TEAM_BY_API_ID[h.id];
      apiTeams[h.id] = { id: h.id, name: h.name, matched: !!match, ourId: match?.id };
    }
    if (!apiTeams[a.id]) {
      const match = TEAM_BY_API_ID[a.id];
      apiTeams[a.id] = { id: a.id, name: a.name, matched: !!match, ourId: match?.id };
    }
  }

  const teams = Object.values(apiTeams).sort((a, b) => a.name.localeCompare(b.name));
  const matched = teams.filter((t) => t.matched).length;
  const unmatched = teams.filter((t) => !t.matched);

  // Teams in our data with no apiId
  const teamsWithoutApiId = TEAMS.filter((t) => !t.apiId).map((t) => t.id);

  return NextResponse.json({
    summary: {
      totalFixtures: fixtures.length,
      uniqueApiTeams: teams.length,
      matched,
      unmatched: unmatched.length,
    },
    unmatchedApiTeams: unmatched,
    allApiTeams: teams,
    teamsWithoutApiId,
  });
}
