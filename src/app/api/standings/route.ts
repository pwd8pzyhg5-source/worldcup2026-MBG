import { NextResponse } from "next/server";
import { getStandings } from "@/lib/api-football";

export async function GET() {
  const data = await getStandings();
  if (!data) {
    return NextResponse.json({ error: "API unavailable", standings: [] }, { status: 200 });
  }
  // API-Football returns response: [{ league: { standings: [[...], [...]] } }]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any;
  const standings = Array.isArray(raw[0]?.league?.standings)
    ? raw[0].league.standings
    : data;
  return NextResponse.json({ standings, lastUpdated: new Date().toISOString() });
}
