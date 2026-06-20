import { NextResponse } from "next/server";
import history from "../../../../data/standingsHistory.json";

export async function GET() {
  return NextResponse.json(history);
}
