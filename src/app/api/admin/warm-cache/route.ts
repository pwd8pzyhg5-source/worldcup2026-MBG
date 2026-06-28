import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const BASE = "https://v3.football.api-sports.io";
const LEAGUE_ID = 1;
const SEASON = 2026;
// Must match the today() logic in api-football.ts (computed at request time)
const TODAY = new Date().toISOString().slice(0, 10);

async function rawFetch(path: string) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return null;
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });
  const json = await res.json();
  const errs = json.errors;
  const hasErrors = errs && (Array.isArray(errs) ? errs.length > 0 : Object.keys(errs).length > 0);
  if (hasErrors) return null;
  return json.response;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// GET — called by Vercel cron daily at 06:00 UTC (replaces flush-cache cron)
// Fetches all fixture events sequentially to avoid rate-limit issues from
// 72 parallel requests. Caches each result in Redis with a 23-hour TTL so
// the next cron run always gets fresh data.
export async function GET() {
  const redis = Redis.fromEnv();

  // Fetch fixture list just to get IDs — do NOT cache it here.
  // The fixture list has a 2-minute TTL managed by apiFetch; warm-cache
  // only pre-populates the per-fixture event data which is slower to refresh.
  const fixtures = await rawFetch(
    `/fixtures?league=${LEAGUE_ID}&season=${SEASON}&status=FT-AET-PEN-WO-AWD`
  );
  if (!fixtures || !Array.isArray(fixtures)) {
    return NextResponse.json({ error: "Could not fetch fixtures" }, { status: 500 });
  }

  const results: { fixtureId: number; events: number | "error" }[] = [];

  for (const f of fixtures) {
    const fixtureId = f.fixture.id as number;
    const path = `/fixtures/events?fixture=${fixtureId}`;
    const cacheKey = `apifootball:${TODAY}:${path}`;

    const events = await rawFetch(path);
    if (events !== null) {
      await redis.set(cacheKey, events, { ex: 23 * 3600 });
      results.push({ fixtureId, events: (events as unknown[]).length });
    } else {
      results.push({ fixtureId, events: "error" });
    }

    // ~200ms between requests → well under the 7,500/day rate limit
    await sleep(200);
  }

  const errors = results.filter((r) => r.events === "error").length;
  return NextResponse.json({
    fixturesProcessed: fixtures.length,
    eventsWarmed: results.length - errors,
    errors,
    results,
  });
}
