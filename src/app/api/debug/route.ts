import { NextResponse } from "next/server";
import { TEAM_BY_API_ID, TEAMS } from "../../../../data/teams";

const BASE_URL = "https://v3.football.api-sports.io";

async function rawFetch(path: string) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return { response: null, errors: "API_FOOTBALL_KEY not set", status: null };
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });
  const json = await res.json();
  return { response: json.response, errors: json.errors, status: res.status, results: json.results };
}

export async function GET() {
  const raw = await rawFetch(`/fixtures?league=1&season=2026`);
  if (!raw.response || raw.response.length === 0) {
    return NextResponse.json({
      error: "No fixtures returned",
      httpStatus: raw.status,
      apiErrors: raw.errors,
      apiResults: raw.results,
    });
  }
  const fixtures = raw.response;

  // Extract every unique team with its API ID
  const apiTeams: Record<number, { apiId: number; name: string; matched: boolean; ourId?: string }> = {};
  for (const f of fixtures) {
    for (const side of ["home", "away"] as const) {
      const t = f.teams[side];
      if (!apiTeams[t.id]) {
        const match = TEAM_BY_API_ID[t.id];
        apiTeams[t.id] = { apiId: t.id, name: t.name, matched: !!match, ourId: match?.id };
      }
    }
  }

  const allTeams = Object.values(apiTeams).sort((a, b) => a.name.localeCompare(b.name));
  const unmatched = allTeams.filter(t => !t.matched);

  return NextResponse.json({
    totalFixtures: fixtures.length,
    totalUniqueTeams: allTeams.length,
    matched: allTeams.filter(t => t.matched).length,
    unmatchedCount: unmatched.length,
    // Full list — copy this to map apiIds
    allTeams,
    unmatched,
  });
}
