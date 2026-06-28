import { NextResponse } from "next/server";

const BASE = "https://v3.football.api-sports.io";

async function rawFetch(path: string) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return null;
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) return null;
  return json.response;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamApiId = parseInt(searchParams.get("teamId") ?? "0");
  if (!teamApiId) return NextResponse.json({ error: "Pass ?teamId=<api_id>" });

  const fixtures = await rawFetch(`/fixtures?league=1&season=2026&status=FT-AET-PEN-WO-AWD`);
  if (!fixtures) return NextResponse.json({ error: "API unavailable" });

  const teamFixtures = (fixtures as Array<{
    fixture: { id: number; date: string };
    teams: { home: { id: number; name: string }; away: { id: number; name: string } };
    goals: { home: number | null; away: number | null };
  }>).filter(f => f.teams.home.id === teamApiId || f.teams.away.id === teamApiId);

  const result = [];
  for (const f of teamFixtures) {
    const events = await rawFetch(`/fixtures/events?fixture=${f.fixture.id}`);
    const cards = ((events ?? []) as Array<{
      type: string; detail: string; time: { elapsed: number };
      team: { id: number; name: string }; player: { name: string };
    }>).filter(e => e.type === "Card");

    result.push({
      date: f.fixture.date.slice(0, 10),
      home: f.teams.home.name,
      away: f.teams.away.name,
      score: `${f.goals.home}-${f.goals.away}`,
      fixtureId: f.fixture.id,
      totalEvents: (events ?? []).length,
      cards: cards.map(c => ({ team: c.team.name, player: c.player.name, detail: c.detail, minute: c.time.elapsed })),
    });
  }

  return NextResponse.json({ teamApiId, fixtures: result }, { headers: { "Cache-Control": "no-store" } });
}
