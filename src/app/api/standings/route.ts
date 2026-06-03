import { NextResponse } from "next/server";
import { getStandings } from "@/lib/api-football";

export async function GET() {
  const data = await getStandings();
  if (!data) {
    return NextResponse.json({ error: "API unavailable", standings: [] }, { status: 200 });
  }
  return NextResponse.json({ standings: data, lastUpdated: new Date().toISOString() });
}
