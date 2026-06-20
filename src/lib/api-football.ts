const BASE_URL = "https://v3.football.api-sports.io";
const LEAGUE_ID = 1;
const SEASON = 2026;

// Fallback snapshot used only when a fetch genuinely errors (rate limit,
// network failure, API error payload) — NOT the primary cache. The
// primary cache is Next.js's Data Cache via `next: { revalidate }` below,
// which is shared across all serverless instances/regions. Using
// cache: "no-store" here would disable that shared cache entirely and
// force every cold instance to hit the real API regardless of TTL —
// that was the actual cause of exhausting the daily request quota.
const lastGood: Record<string, unknown> = {};

async function apiFetch<T>(
  path: string,
  revalidateSeconds: number = 300
): Promise<T | null> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    console.error("API_FOOTBALL_KEY not set");
    return (lastGood[path] as T) ?? null;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "x-apisports-key": apiKey },
      next: { revalidate: revalidateSeconds },
    });

    if (!res.ok) {
      console.error(`API-Football error: ${res.status} ${path}`);
      return (lastGood[path] as T) ?? null;
    }

    const json = await res.json();

    const errs = json.errors;
    const hasErrors = errs && (Array.isArray(errs) ? errs.length > 0 : Object.keys(errs).length > 0);
    if (hasErrors) {
      console.error("API-Football error payload:", path, errs);
      return (lastGood[path] as T) ?? null;
    }

    lastGood[path] = json.response;
    return json.response as T;
  } catch (err) {
    console.error("API-Football fetch failed:", err);
    return (lastGood[path] as T) ?? null;
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

// 60 second TTL for live matches, 5 min for others — kept conservative to
// stay well under the daily API-Football request cap
export const getFixtures = () =>
  apiFetch<APIFixture[]>(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`, 900);

export const getLiveFixtures = () =>
  apiFetch<APIFixture[]>(`/fixtures?league=${LEAGUE_ID}&live=all`, 180);

// Finished matches' events never change — cache them for hours.
// Only pass live=true for matches still in progress to get fast refresh.
export const getFixtureEvents = (fixtureId: number, live: boolean = false) =>
  apiFetch<APIEvent[]>(`/fixtures/events?fixture=${fixtureId}`, live ? 180 : 6 * 60 * 60);

export const getStandings = () =>
  apiFetch<APIStandingEntry[][]>(`/standings?league=${LEAGUE_ID}&season=${SEASON}`, 300);

export const getTopScorers = () =>
  apiFetch<APITopScorer[]>(`/players/topscorers?league=${LEAGUE_ID}&season=${SEASON}`, 1200);

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
