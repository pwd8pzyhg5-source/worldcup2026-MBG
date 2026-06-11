import { NextResponse } from "next/server";
import { TEAM_BY_API_ID, TEAMS } from "../../../../data/teams";

const BASE_URL = "https://v3.football.api-sports.io";

async function rawFetch(path: string) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return { error: "API_FOOTBALL_KEY not set" };
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });
  const json = await res.json();
  return { status: res.status, errors: json.errors, results: json.results, responseSample: json.response?.slice?.(0, 3) ?? json.response };
}

export async function GET() {
  const [fixturesRaw, statusRaw] = await Promise.all([
    rawFetch(`/fixtures?league=1&season=2026`),
    rawFetch(`/status`),
  ]);

  // Also try fetching a broader fixture list to see if any data exists
  const liveRaw = await rawFetch(`/fixtures?live=all`);

  // Collect matched teams from any fixture data
  const sample = fixturesRaw.responseSample ?? [];
  const apiTeams: Record<number, { id: number; name: string; matched: boolean; ourId?: string }> = {};
  for (const f of (Array.isArray(sample) ? sample : [])) {
    for (const side of ["home", "away"] as const) {
      const t = f.teams?.[side];
      if (t && !apiTeams[t.id]) {
        const match = TEAM_BY_API_ID[t.id];
        apiTeams[t.id] = { id: t.id, name: t.name, matched: !!match, ourId: match?.id };
      }
    }
  }

  return NextResponse.json({
    apiStatus: statusRaw,
    fixtures: {
      results: fixturesRaw.results,
      errors: fixturesRaw.errors,
      httpStatus: fixturesRaw.status,
      sampleTeams: Object.values(apiTeams),
    },
    liveFixtures: {
      results: liveRaw.results,
      errors: liveRaw.errors,
      sample: liveRaw.responseSample,
    },
    teamsWithoutApiId: TEAMS.filter((t) => !t.apiId).map((t) => t.id),
  });
}
