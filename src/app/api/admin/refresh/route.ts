import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

// Force-busts the Next.js Data Cache for all fixture data.
// Call this when points/scores look stale or wrong — the next request
// to /api/points, /api/standings, etc. will fetch fresh data from API-Football.
export async function POST() {
  revalidateTag("fixtures", {});
  revalidateTag("fixtures-finished", {});
  return NextResponse.json({ ok: true, revalidated: ["fixtures", "fixtures-finished"], ts: new Date().toISOString() });
}
