import { NextResponse } from "next/server";
import { getFixtures, getLiveFixtures, APIFixture } from "@/lib/api-football";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const live = searchParams.get("live") === "true";

  const data = live ? await getLiveFixtures() : await getFixtures();

  if (!data) {
    return NextResponse.json({ error: "API unavailable", lastUpdated: null, fixtures: [] }, { status: 200 });
  }

  return NextResponse.json({ fixtures: data, lastUpdated: new Date().toISOString() });
}
