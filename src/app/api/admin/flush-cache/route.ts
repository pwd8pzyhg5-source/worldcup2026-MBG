import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

async function flush() {
  const redis = Redis.fromEnv();
  let cursor = 0;
  let deleted = 0;
  do {
    const [next, keys] = await redis.scan(cursor, { match: "apifootball:*:*", count: 100 });
    cursor = Number(next);
    if (keys.length > 0) {
      await redis.del(...keys);
      deleted += keys.length;
    }
  } while (cursor !== 0);
  return NextResponse.json({ deleted, message: "Cache flushed" });
}

// GET — called by Vercel cron (daily at 06:00 UTC)
export async function GET() { return flush(); }
// POST — called manually
export async function POST() { return flush(); }
