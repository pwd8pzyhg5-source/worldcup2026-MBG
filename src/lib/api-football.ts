const BASE_URL = "https://v3.football.api-sports.io";
const LEAGUE_ID = 1;
const SEASON = 2026;

// Simple in-memory cache
const cache: Record<string, { data: unknown; ts: number }> = {};

async function apiFetch<T>(
  path: string,
  ttlMs: number = 5 * 60 * 1000
): Promise<T | null> {
  const key = path;
  const now = Date.now();

  if (cache[key] && now - cache[key].ts < ttlMs) {
    return cache[key].data as T;
  }

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    console.error("API_FOOTBALL_KEY not set");
    return null;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "x-apisports-key": apiKey },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`API-Football error: ${res.status} ${path}`);
      return null;
    }

    const json = await res.json();
    cache[key] = { data: json.response, ts: now };
    return json.response as T;
  } catch (err) {
    console.error("API-Football fetch failed:", err);
    return null;
  }
}

export interface APIFixture {
  fixture: {
    id: number;
    status: { short: string; long: string; elapsed: number | null };
    date: string;
    venue: { name: string; city: string };
  };
  league: { round: string };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
  events?: APIEvent[];
}

export interface APIEvent {
  time: { elapsed: number };
  team: { id: number; name: string };
  player: { name: string };
  type: string;
  detail: string;
}

export interface APIStandingEntry {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
}

export interface APITopScorer {
  player: { id: number; name: string; nationality: string; photo: string };
  statistics: Array<{
    team: { id: number; name: string; logo: string };
    goals: { total: number; assists: number | null };
    cards: { yellow: number; red: number };
  }>;
}

// 20 second TTL for live matches, 5 min for others
export const getFixtures = () =>
  apiFetch<APIFixture[]>(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`, 5 * 60 * 1000);

export const getLiveFixtures = () =>
  apiFetch<APIFixture[]>(`/fixtures?league=${LEAGUE_ID}&live=all`, 20 * 1000);

export const getFixtureEvents = (fixtureId: number) =>
  apiFetch<APIEvent[]>(`/fixtures/events?fixture=${fixtureId}`, 20 * 1000);

export const getStandings = () =>
  apiFetch<APIStandingEntry[][]>(`/standings?league=${LEAGUE_ID}&season=${SEASON}`, 10 * 60 * 1000);

export const getTopScorers = () =>
  apiFetch<APITopScorer[]>(`/players/topscorers?league=${LEAGUE_ID}&season=${SEASON}`, 10 * 60 * 1000);

export function parseRound(round: string): string {
  if (round.includes("Group")) return "Group Stage";
  if (round.includes("32")) return "Round of 32";
  if (round.includes("16")) return "Round of 16";
  if (round.includes("Quarter")) return "Quarter-finals";
  if (round.includes("Semi")) return "Semi-finals";
  if (round.includes("3rd")) return "3rd Place Final";
  if (round.includes("Final")) return "Final";
  return round;
}
