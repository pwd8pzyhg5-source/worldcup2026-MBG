import { NextResponse } from "next/server";
import { getFixtures } from "@/lib/api-football";

export async function GET() {
  const fixtures = await getFixtures();
  if (!fixtures) return NextResponse.json({ error: "no fixtures" });

  const roundCounts: Record<string, number> = {};
  const rawRoundSamples: Record<string, string[]> = {};

  for (const f of fixtures) {
    const r = f.league.round;
    roundCounts[r] = (roundCounts[r] || 0) + 1;
    if (!rawRoundSamples[r]) rawRoundSamples[r] = [];
    if (rawRoundSamples[r].length < 2) {
      rawRoundSamples[r].push(
        `${f.teams.home.name}(${f.teams.home.id}) vs ${f.teams.away.name}(${f.teams.away.id}) [${f.fixture.status.short}] ${f.fixture.date?.slice(0, 10)}`
      );
    }
  }

  return NextResponse.json({
    totalFixtures: fixtures.length,
    rounds: Object.entries(roundCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([round, count]) => ({ round, count, samples: rawRoundSamples[round] })),
  });
}
