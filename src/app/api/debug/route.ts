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
  return { status: res.status, errors: json.errors, results: json.results, response: json.response };
}

export async function GET() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return NextResponse.json({ error: "API_FOOTBALL_KEY not set" });

  // Try multiple potential WC 2026 league/season combos in parallel
  const [
    wc1_2026,     // standard WC league ID, season 2026
    wc1_2025,     // maybe indexed as 2025?
    wcLeagues,    // search leagues named "world cup"
    wc1_2022,     // confirm free access works at all for WC
    liveAll,      // live games right now
  ] = await Promise.all([
    rawFetch(`/fixtures?league=1&season=2026`),
    rawFetch(`/fixtures?league=1&season=2025`),
    rawFetch(`/leagues?name=world+cup&type=cup`),
    rawFetch(`/fixtures?league=1&season=2022&last=1`),
    rawFetch(`/fixtures?live=all`),
  ]);

  // Check live fixtures for any WC-looking games
  const liveWC = (liveAll.response ?? []).filter((f: { league: { name: string } }) =>
    f.league?.name?.toLowerCase().includes("world")
  );

  return NextResponse.json({
    "league=1&season=2026": { results: wc1_2026.results, errors: wc1_2026.errors },
    "league=1&season=2025": { results: wc1_2025.results, errors: wc1_2025.errors },
    "league=1&season=2022 (free access check)": { results: wc1_2022.results, errors: wc1_2022.errors },
    "leagues named world cup": (wcLeagues.response ?? []).map((l: { league: { id: number; name: string }; seasons: { year: number }[] }) => ({
      id: l.league.id,
      name: l.league.name,
      seasons: l.seasons?.map((s) => s.year),
    })),
    "live world cup games": liveWC,
    "total live games right now": liveAll.results,
    teamsWithoutApiId: TEAMS.filter((t) => !t.apiId).length,
  });
}
