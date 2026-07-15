import { NextResponse } from "next/server";

const BASE_URL = "https://v3.football.api-sports.io";

export async function GET() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return NextResponse.json({ error: "API_FOOTBALL_KEY not set" });

  try {
    const [statusRes, fixturesRes] = await Promise.all([
      fetch(`${BASE_URL}/status`, { headers: { "x-apisports-key": apiKey }, cache: "no-store" }),
      fetch(`${BASE_URL}/fixtures?league=1&season=2026&status=FT-AET-PEN-WO-AWD`, { headers: { "x-apisports-key": apiKey }, cache: "no-store" }),
    ]);
    const statusBody = await statusRes.json();
    const fixturesBody = await fixturesRes.json();
    return NextResponse.json({
      account: statusBody.response,
      fixturesHttpStatus: fixturesRes.status,
      fixturesErrors: fixturesBody.errors,
      fixturesCount: Array.isArray(fixturesBody.response) ? fixturesBody.response.length : null,
    });
  } catch (e) {
    return NextResponse.json({ fetchError: String(e) });
  }
}
