import { NextResponse } from "next/server";
import { getTopScorers, getTopAssists, getFixtures } from "@/lib/api-football";
import { TEAM_BY_API_ID } from "../../../../data/teams";

const FINISHED = ["FT", "AET", "PEN", "WO", "AWD"];

export async function GET() {
  const [scorers, assists, fixtures] = await Promise.all([
    getTopScorers(),
    getTopAssists(),
    getFixtures(),
  ]);

  const cleanSheets: Record<string, { teamName: string; teamCode: string; count: number }> = {};

  if (fixtures) {
    for (const f of fixtures) {
      if (!FINISHED.includes(f.fixture.status.short)) continue;
      const hg = f.goals.home ?? 0, ag = f.goals.away ?? 0;
      const homeTeam = TEAM_BY_API_ID[f.teams.home.id];
      const awayTeam = TEAM_BY_API_ID[f.teams.away.id];
      if (homeTeam && ag === 0) {
        if (!cleanSheets[homeTeam.id]) cleanSheets[homeTeam.id] = { teamName: homeTeam.name, teamCode: homeTeam.code, count: 0 };
        cleanSheets[homeTeam.id].count++;
      }
      if (awayTeam && hg === 0) {
        if (!cleanSheets[awayTeam.id]) cleanSheets[awayTeam.id] = { teamName: awayTeam.name, teamCode: awayTeam.code, count: 0 };
        cleanSheets[awayTeam.id].count++;
      }
    }
  }

  return NextResponse.json({
    scorers: scorers || [],
    assists: assists || [],
    cleanSheets: Object.entries(cleanSheets).map(([id, v]) => ({ teamId: id, ...v })).sort((a, b) => b.count - a.count),
    lastUpdated: new Date().toISOString(),
  });
}
