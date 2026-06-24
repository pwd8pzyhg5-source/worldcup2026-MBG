const BASE_URL = "https://v3.football.api-sports.io";
const LEAGUE_ID = 1;
const SEASON = 2026;

// Shared persistent fallback — used ONLY when the live API fetch errors
// (rate limit, network failure, API error payload). NOT the primary cache.
// Primary cache is Next.js Data Cache via `next: { revalidate, tags }`.
//
// Cache tags let us call revalidateTag("fixtures") from an admin endpoint
// to force-bust all fixture caches at once when data looks stale.
const lastGood: Record<string, unknown> = {};

async function apiFetch<T>(
  path: string,
  revalidateSeconds: number = 300,
  tags: string[] = []
): Promise<T | null> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    console.error("API_FOOTBALL_KEY not set");
    return (lastGood[path] as T) ?? null;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "x-apisports-key": apiKey },
      next: { revalidate: revalidateSeconds, tags },
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

// All WC 2026 fixtures — used for upcoming fixtures display (NS status).
// 300s TTL: short enough that newly-scheduled or postponed matches appear quickly.
// Tagged "fixtures" so we can force-bust from /api/admin/refresh.
export const getFixtures = () =>
  apiFetch<APIFixture[]>(
    `/fixtures?league=${LEAGUE_ID}&season=${SEASON}`,
    300,
    ["fixtures"]
  );

// Currently live fixtures — lowest possible TTL for real-time scores.
// Tagged "fixtures" to be included in manual refresh.
export const getLiveFixtures = () =>
  apiFetch<APIFixture[]>(
    `/fixtures?league=${LEAGUE_ID}&live=all`,
    60,
    ["fixtures"]
  );

// Finished fixtures only — these have stable final scores.
// Much longer cache than getFixtures: a finished score never changes.
// We keep 300s as a safety margin in case API corrections trickle in.
// Tagged "fixtures-finished" — busted separately since it's slower to refresh.
export const getFinishedFixtures = () =>
  apiFetch<APIFixture[]>(
    `/fixtures?league=${LEAGUE_ID}&season=${SEASON}&status=FT-AET-PEN-WO-AWD`,
    300,
    ["fixtures", "fixtures-finished"]
  );

// Per-fixture event stream — cards only relevant data here; goals come from
// the fixture score itself. TTL is passed by caller based on match state.
export const getFixtureEvents = (fixtureId: number, ttlSeconds: number) =>
  apiFetch<APIEvent[]>(
    `/fixtures/events?fixture=${fixtureId}`,
    ttlSeconds,
    ["fixtures", `fixture-events-${fixtureId}`]
  );

export const getStandings = () =>
  apiFetch<APIStandingEntry[][]>(
    `/standings?league=${LEAGUE_ID}&season=${SEASON}`,
    300,
    ["fixtures"]
  );

export const getTopScorers = () =>
  apiFetch<APITopScorer[]>(
    `/players/topscorers?league=${LEAGUE_ID}&season=${SEASON}`,
    60 * 60,
    ["topscorers"]
  );

export const getTopAssists = () =>
  apiFetch<APITopScorer[]>(
    `/players/topassists?league=${LEAGUE_ID}&season=${SEASON}`,
    60 * 60,
    ["topscorers"]
  );

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
