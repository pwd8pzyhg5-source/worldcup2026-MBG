import { NextResponse } from "next/server";
import { getLiveFixtures, getFixtures, getFixtureEvents } from "@/lib/api-football";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const live = searchParams.get("live") === "true";
  const upcoming = searchParams.get("upcoming") === "true";

  if (upcoming) {
    const data = await getFixtures();
    if (!data) {
      return NextResponse.json({ fixtures: [], lastUpdated: new Date().toISOString() });
    }
    const now = Date.now();
    const next = data
      .filter((f) => f.fixture.status.short === "NS" && new Date(f.fixture.date).getTime() > now)
      .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())
      .slice(0, 4);
    return NextResponse.json({ fixtures: next, lastUpdated: new Date().toISOString() });
  }

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
