import { NextResponse } from "next/server";
import { getTopScorers } from "@/lib/api-football";

export async function GET() {
  const data = await getTopScorers();
  if (!data) {
    return NextResponse.json({ error: "API unavailable", scorers: [] }, { status: 200 });
  }
  return NextResponse.json({ scorers: data, lastUpdated: new Date().toISOString() });
}
