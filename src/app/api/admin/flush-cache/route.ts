import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export async function POST() {
  const redis = Redis.fromEnv();
  let cursor = 0;
  let deleted = 0;
  do {
    const [next, keys] = await redis.scan(cursor, { match: "apifootball:*", count: 100 });
    cursor = Number(next);
    if (keys.length > 0) {
      await redis.del(...keys);
      deleted += keys.length;
    }
  } while (cursor !== 0);
  return NextResponse.json({ deleted, message: "Cache flushed" });
}
