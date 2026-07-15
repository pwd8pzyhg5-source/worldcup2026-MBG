import { NextResponse } from "next/server";

const BASE_URL = "https://v3.football.api-sports.io";

export async function GET() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return NextResponse.json({ error: "API_FOOTBALL_KEY not set" });

  try {
    const res = await fetch(`${BASE_URL}/fixtures?league=1&season=2026&status=FT-AET-PEN-WO-AWD`, {
      headers: { "x-apisports-key": apiKey },
      cache: "no-store",
    });
    const body = await res.json();
    return NextResponse.json({
      httpStatus: res.status,
      ok: res.ok,
      errors: body.errors,
      responseCount: Array.isArray(body.response) ? body.response.length : null,
      paging: body.paging,
      resultsPreview: Array.isArray(body.response) ? body.response.slice(0, 2).map((f: { fixture: { id: number; status: { short: string } }; league: { round: string } }) => ({
        id: f.fixture.id, status: f.fixture.status.short, round: f.league.round
      })) : null,
      rawKeys: Object.keys(body),
    });
  } catch (e) {
    return NextResponse.json({ fetchError: String(e) });
  }
}
