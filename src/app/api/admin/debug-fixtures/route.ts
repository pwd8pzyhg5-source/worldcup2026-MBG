import { NextResponse } from "next/server";
import { getFixtures, getFinishedFixtures, getFixtureEvents } from "@/lib/api-football";
import { TEAM_BY_API_ID } from "../../../../../data/teams";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamSlug = searchParams.get("team"); // e.g. ?team=paraguay

  if (teamSlug) {
    const fixtures = await getFinishedFixtures();
    if (!fixtures) return NextResponse.json({ error: "no fixtures" });

    const teamFixtures = fixtures.filter((f) => {
      const h = TEAM_BY_API_ID[f.teams.home.id];
      const a = TEAM_BY_API_ID[f.teams.away.id];
      return h?.id === teamSlug || a?.id === teamSlug;
    });

    // Fetch card events for each match in parallel
    const eventsPerFixture = await Promise.all(
      teamFixtures.map((f) => getFixtureEvents(f.fixture.id, 6 * 3600))
    );

    const matches = teamFixtures.map((f, i) => {
      const isHome = TEAM_BY_API_ID[f.teams.home.id]?.id === teamSlug;
      const events = eventsPerFixture[i] ?? [];
      const seenDismissals = new Set<string>();
      let yellows = 0, reds = 0;

      for (const ev of events) {
        const evIsHome = ev.team.id === f.teams.home.id;
        const isTeamEvent = isHome ? evIsHome : !evIsHome;
        if (!isTeamEvent || ev.type !== "Card") continue;
        if (ev.detail === "Red Card" || ev.detail === "Second Yellow Card") {
          const key = `${ev.team.id}-${ev.player.name}-${ev.time.elapsed}`;
          if (!seenDismissals.has(key)) { seenDismissals.add(key); reds++; }
        } else if (ev.detail === "Yellow Card") {
          yellows++;
        }
      }

      const myGoals = isHome ? (f.goals.home ?? 0) : (f.goals.away ?? 0);
      const theirGoals = isHome ? (f.goals.away ?? 0) : (f.goals.home ?? 0);
      const opponent = isHome
        ? (TEAM_BY_API_ID[f.teams.away.id]?.id ?? f.teams.away.name)
        : (TEAM_BY_API_ID[f.teams.home.id]?.id ?? f.teams.home.name);

      return {
        round: f.league.round,
        date: f.fixture.date?.slice(0, 10),
        status: f.fixture.status.short,
        opponent,
        score: `${myGoals}-${theirGoals}`,
        penalties: f.score.penalty.home !== null
          ? `(${f.score.penalty.home}-${f.score.penalty.away} pens)` : null,
        yellows,
        reds,
      };
    });

    const totalYellows = matches.reduce((s, m) => s + m.yellows, 0);
    const totalReds = matches.reduce((s, m) => s + m.reds, 0);

    return NextResponse.json({
      team: teamSlug,
      matches,
      totals: {
        yellows: totalYellows,
        yellowPenalty: -Math.floor(totalYellows / 3),
        reds: totalReds,
        redPenalty: totalReds * -2,
        totalCardPenalty: -Math.floor(totalYellows / 3) + (totalReds * -2),
      },
    });
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
