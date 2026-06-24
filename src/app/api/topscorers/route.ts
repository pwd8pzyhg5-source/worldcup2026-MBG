import { NextResponse } from "next/server";
import { getTopScorers, getTopAssists, getFinishedFixtures } from "@/lib/api-football";
import { TEAM_BY_API_ID } from "../../../../data/teams";

export async function GET() {
  const [scorers, assists, fixtures] = await Promise.all([
    getTopScorers(),
    getTopAssists(),
    getFinishedFixtures(),
  ]);

  // Build clean sheet counts per team from completed fixtures
  const cleanSheets: Record<string, { teamName: string; teamCode: string; count: number }> = {};

  if (fixtures) {
    for (const f of fixtures) {
      const status = f.fixture.status.short;
      if (!["FT", "AET", "PEN", "WO", "AWD"].includes(status)) continue;

      const homeGoals = f.goals.home ?? 0;
      const awayGoals = f.goals.away ?? 0;

      const homeTeam = TEAM_BY_API_ID[f.teams.home.id];
      const awayTeam = TEAM_BY_API_ID[f.teams.away.id];

      if (homeTeam && awayGoals === 0) {
        if (!cleanSheets[homeTeam.id]) cleanSheets[homeTeam.id] = { teamName: homeTeam.name, teamCode: homeTeam.code, count: 0 };
        cleanSheets[homeTeam.id].count++;
      }
      if (awayTeam && homeGoals === 0) {
        if (!cleanSheets[awayTeam.id]) cleanSheets[awayTeam.id] = { teamName: awayTeam.name, teamCode: awayTeam.code, count: 0 };
        cleanSheets[awayTeam.id].count++;
      }
    }
  }

  const cleanSheetsList = Object.entries(cleanSheets)
    .map(([id, v]) => ({ teamId: id, ...v }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    scorers: scorers || [],
    assists: assists || [],
    cleanSheets: cleanSheetsList,
    lastUpdated: new Date().toISOString(),
  });
}
