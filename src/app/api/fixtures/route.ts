import { NextResponse } from "next/server";
import { getLiveFixtures, getFixtureEvents } from "@/lib/api-football";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const live = searchParams.get("live") === "true";

  if (!live) {
    return NextResponse.json({ fixtures: [], lastUpdated: new Date().toISOString() });
  }

  const data = await getLiveFixtures();
  if (!data) {
    return NextResponse.json({ error: "API unavailable", lastUpdated: null, fixtures: [] });
  }

  // Fetch events for each live fixture in parallel
  const withEvents = await Promise.all(
    data.map(async (fixture) => {
      const events = await getFixtureEvents(fixture.fixture.id);
      return { ...fixture, events: events ?? [] };
    })
  );

  return NextResponse.json({ fixtures: withEvents, lastUpdated: new Date().toISOString() });
}
