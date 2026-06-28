import { NextResponse } from "next/server";

const BASE = "https://v3.football.api-sports.io";

const NAME_TO_SLUG: Record<string, string> = {
  "Brazil": "brazil", "Germany": "germany", "Japan": "japan", "Mexico": "mexico",
  "Algeria": "algeria", "Ivory Coast": "ivory-coast", "Uzbekistan": "uzbekistan", "Qatar": "qatar",
  "England": "england", "Netherlands": "netherlands", "Senegal": "senegal", "United States": "usa",
  "Australia": "australia", "Panama": "panama", "Tunisia": "tunisia", "Cape Verde": "cabo-verde",
  "Spain": "spain", "Croatia": "croatia", "Norway": "norway", "IR Iran": "iran",
  "Austria": "austria", "Paraguay": "paraguay", "Sweden": "sweden", "Curaçao": "curacao",
  "Argentina": "argentina", "Morocco": "morocco", "Canada": "canada", "Ecuador": "ecuador",
  "Ghana": "ghana", "Bosnia and Herzegovina": "bosnia", "South Africa": "south-africa", "New Zealand": "new-zealand",
  "France": "france", "Belgium": "belgium", "Colombia": "colombia", "Egypt": "egypt",
  "Korea Republic": "korea-republic", "South Korea": "korea-republic",
  "Czech Republic": "czechia", "Czechia": "czechia",
  "Jordan": "jordan", "Iraq": "iraq",
  "Portugal": "portugal", "Uruguay": "uruguay", "Switzerland": "switzerland",
  "Turkey": "turkey", "Türkiye": "turkey",
  "Scotland": "scotland",
  "DR Congo": "congo-dr", "Congo DR": "congo-dr",
  "Saudi Arabia": "saudi-arabia", "Haiti": "haiti",
  "Bosnia & Herzegovina": "bosnia",
  "USA": "usa",
  "Cape Verde Islands": "cabo-verde",
  "Iran": "iran",
};

const TEAM_BY_SLUG: Record<string, string> = {
  brazil: "Dr. Rick", germany: "Dr. Rick", japan: "Dr. Rick", mexico: "Dr. Rick",
  algeria: "Dr. Rick", "ivory-coast": "Dr. Rick", uzbekistan: "Dr. Rick", qatar: "Dr. Rick",
  england: "Sexy Tecsy", netherlands: "Sexy Tecsy", senegal: "Sexy Tecsy", usa: "Sexy Tecsy",
  australia: "Sexy Tecsy", panama: "Sexy Tecsy", tunisia: "Sexy Tecsy", "cabo-verde": "Sexy Tecsy",
  spain: "Gordo", croatia: "Gordo", norway: "Gordo", iran: "Gordo",
  austria: "Gordo", paraguay: "Gordo", sweden: "Gordo", curacao: "Gordo",
  argentina: "Lazy Bones", morocco: "Lazy Bones", canada: "Lazy Bones", ecuador: "Lazy Bones",
  ghana: "Lazy Bones", bosnia: "Lazy Bones", "south-africa": "Lazy Bones", "new-zealand": "Lazy Bones",
  france: "Shun", belgium: "Shun", colombia: "Shun", egypt: "Shun",
  "korea-republic": "Shun", czechia: "Shun", jordan: "Shun", iraq: "Shun",
  portugal: "Bradical Bray", uruguay: "Bradical Bray", switzerland: "Bradical Bray", turkey: "Bradical Bray",
  scotland: "Bradical Bray", "congo-dr": "Bradical Bray", "saudi-arabia": "Bradical Bray", haiti: "Bradical Bray",
};

export async function GET() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return NextResponse.json({ error: "No API key" }, { status: 500 });

  const res = await fetch(
    `${BASE}/fixtures?league=1&season=2026&status=FT-AET-PEN-WO-AWD`,
    { headers: { "x-apisports-key": apiKey }, cache: "no-store" }
  );
  const json = await res.json();
  const fixtures = json.response as Array<{
    fixture: { date: string };
    teams: { home: { name: string }; away: { name: string } };
    goals: { home: number | null; away: number | null };
  }>;

  const unmapped: string[] = [];
  const PARTICIPANTS = ["Dr. Rick", "Sexy Tecsy", "Gordo", "Lazy Bones", "Shun", "Bradical Bray"];

  function calcPoints(maxDate: string) {
    const pts = Object.fromEntries(PARTICIPANTS.map((p) => [p, 0]));
    for (const f of fixtures) {
      const date = f.fixture.date.slice(0, 10);
      if (date > maxDate) continue;
      const hSlug = NAME_TO_SLUG[f.teams.home.name];
      const aSlug = NAME_TO_SLUG[f.teams.away.name];
      if (!hSlug) { if (!unmapped.includes(f.teams.home.name)) unmapped.push(f.teams.home.name); continue; }
      if (!aSlug) { if (!unmapped.includes(f.teams.away.name)) unmapped.push(f.teams.away.name); continue; }
      const hOwner = TEAM_BY_SLUG[hSlug];
      const aOwner = TEAM_BY_SLUG[aSlug];
      if (!hOwner || !aOwner) continue;
      const hg = f.goals.home ?? 0, ag = f.goals.away ?? 0;
      pts[hOwner] += hg; pts[aOwner] += ag;
      if (hg > ag) pts[hOwner] += 3;
      else if (ag > hg) pts[aOwner] += 3;
      else { pts[hOwner] += 1; pts[aOwner] += 1; }
      if (ag === 0) pts[hOwner] += 2;
      if (hg === 0) pts[aOwner] += 2;
    }
    return pts;
  }

  const dates = ["2026-06-23", "2026-06-24", "2026-06-25", "2026-06-26", "2026-06-27"];
  const results = dates.map((date) => ({ date, points: calcPoints(date) }));

  return NextResponse.json({ fixtureCount: fixtures.length, unmapped, results });
}
