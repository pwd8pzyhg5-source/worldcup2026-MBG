import { Redis } from "@upstash/redis";

const BASE_URL = "https://v3.football.api-sports.io";
const LEAGUE_ID = 1;
const SEASON = 2026;

// Redis is our shared cache across all serverless instances.
// This is the reliable fix: Next.js Data Cache (next: { revalidate }) was
// inconsistent across deployments and between instances, causing different
// serverless functions to see different snapshots of the data.
// Redis gives every instance the same view of the world.
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!redis) redis = Redis.fromEnv();
  return redis;
}

async function apiFetch<T>(path: string, ttlSeconds: number): Promise<T | null> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    console.error("API_FOOTBALL_KEY not set");
    return null;
  }

  const cacheKey = `apifootball:${path}`;
  const r = getRedis();

  // Try Redis cache first — shared across all instances
  if (r) {
    try {
      const cached = await r.get<T>(cacheKey);
      if (cached !== null && cached !== undefined) return cached;
    } catch (e) {
      console.error("Redis read failed:", e);
    }
  }

  // Cache miss — fetch fresh from API-Football
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "x-apisports-key": apiKey },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`API-Football ${res.status} for ${path}`);
      return null;
    }

    const json = await res.json();
    const errs = json.errors;
    const hasErrors = errs && (Array.isArray(errs) ? errs.length > 0 : Object.keys(errs).length > 0);
    if (hasErrors) {
      console.error("API-Football error payload:", path, errs);
      return null;
    }

    const data = json.response as T;

    // Store in Redis with TTL so all future instances get this until it expires
    if (r) {
      try {
        await r.set(cacheKey, data, { ex: ttlSeconds });
      } catch (e) {
        console.error("Redis write failed:", e);
      }
    }

    return data;
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

// All WC 2026 fixtures — 2 minute cache.
// Short enough that a newly-finished match appears quickly;
// long enough to stay comfortably under the 7,500 req/day API cap.
export const getFixtures = () =>
  apiFetch<APIFixture[]>(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`, 120);

// Currently live fixtures — 60 second cache for near-real-time scores.
export const getLiveFixtures = () =>
  apiFetch<APIFixture[]>(`/fixtures?league=${LEAGUE_ID}&live=all`, 60);

// Per-fixture event stream (cards). TTL is passed by caller:
//   - in-progress match: 60s (fast refresh)
//   - just finished (<2.5hrs): 45min (captures late VAR card confirmations)
//   - long finished (>2.5hrs): 6hr (stable, rarely changes)
export const getFixtureEvents = (fixtureId: number, ttlSeconds: number) =>
  apiFetch<APIEvent[]>(`/fixtures/events?fixture=${fixtureId}`, ttlSeconds);

export const getStandings = () =>
  apiFetch<APIStandingEntry[][]>(`/standings?league=${LEAGUE_ID}&season=${SEASON}`, 300);

export const getTopScorers = () =>
  apiFetch<APITopScorer[]>(`/players/topscorers?league=${LEAGUE_ID}&season=${SEASON}`, 3600);

export const getTopAssists = () =>
  apiFetch<APITopScorer[]>(`/players/topassists?league=${LEAGUE_ID}&season=${SEASON}`, 3600);

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
