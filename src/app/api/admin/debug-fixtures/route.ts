import { NextResponse } from "next/server";
import { getFixtures, getFinishedFixtures } from "@/lib/api-football";
import { TEAM_BY_API_ID } from "../../../../../data/teams";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamSlug = searchParams.get("team"); // e.g. ?team=paraguay

  if (teamSlug) {
    // Show all finished fixtures for a specific team with scores + card counts
    const fixtures = await getFinishedFixtures();
    if (!fixtures) return NextResponse.json({ error: "no fixtures" });

    const matches = fixtures
      .filter((f) => {
        const h = TEAM_BY_API_ID[f.teams.home.id];
        const a = TEAM_BY_API_ID[f.teams.away.id];
        return h?.id === teamSlug || a?.id === teamSlug;
      })
      .map((f) => ({
        round: f.league.round,
        date: f.fixture.date?.slice(0, 10),
        status: f.fixture.status.short,
        home: TEAM_BY_API_ID[f.teams.home.id]?.id ?? f.teams.home.name,
        away: TEAM_BY_API_ID[f.teams.away.id]?.id ?? f.teams.away.name,
        score: `${f.goals.home ?? "?"}-${f.goals.away ?? "?"}`,
        penalties: f.score.penalty.home !== null
          ? `(${f.score.penalty.home}-${f.score.penalty.away} pens)`
          : null,
      }));

    return NextResponse.json({ team: teamSlug, matches });
  }

  // Default: round summary
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
