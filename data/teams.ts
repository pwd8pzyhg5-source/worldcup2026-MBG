export interface Team {
  id: string;
  name: string;
  code: string; // 2-letter ISO for flag CDN
  group: string;
  apiId?: number; // API-Football team ID
}

// All 48 FIFA World Cup 2026 teams — official draw
export const TEAMS: Team[] = [
  // Group A
  { id: "mexico", name: "Mexico", code: "mx", group: "A" },
  { id: "south-africa", name: "South Africa", code: "za", group: "A" },
  { id: "korea-republic", name: "Korea Republic", code: "kr", group: "A" },
  { id: "czechia", name: "Czechia", code: "cz", group: "A" },
  // Group B
  { id: "canada", name: "Canada", code: "ca", group: "B" },
  { id: "bosnia", name: "Bosnia and Herzegovina", code: "ba", group: "B" },
  { id: "qatar", name: "Qatar", code: "qa", group: "B" },
  { id: "switzerland", name: "Switzerland", code: "ch", group: "B" },
  // Group C
  { id: "brazil", name: "Brazil", code: "br", group: "C" },
  { id: "morocco", name: "Morocco", code: "ma", group: "C" },
  { id: "haiti", name: "Haiti", code: "ht", group: "C" },
  { id: "scotland", name: "Scotland", code: "gb-sct", group: "C" },
  // Group D
  { id: "usa", name: "USA", code: "us", group: "D" },
  { id: "paraguay", name: "Paraguay", code: "py", group: "D" },
  { id: "australia", name: "Australia", code: "au", group: "D" },
  { id: "turkey", name: "Türkiye", code: "tr", group: "D" },
  // Group E
  { id: "germany", name: "Germany", code: "de", group: "E" },
  { id: "curacao", name: "Curaçao", code: "cw", group: "E" },
  { id: "ivory-coast", name: "Côte d'Ivoire", code: "ci", group: "E" },
  { id: "ecuador", name: "Ecuador", code: "ec", group: "E" },
  // Group F
  { id: "netherlands", name: "Netherlands", code: "nl", group: "F" },
  { id: "japan", name: "Japan", code: "jp", group: "F" },
  { id: "sweden", name: "Sweden", code: "se", group: "F" },
  { id: "tunisia", name: "Tunisia", code: "tn", group: "F" },
  // Group G
  { id: "belgium", name: "Belgium", code: "be", group: "G" },
  { id: "egypt", name: "Egypt", code: "eg", group: "G" },
  { id: "iran", name: "IR Iran", code: "ir", group: "G" },
  { id: "new-zealand", name: "New Zealand", code: "nz", group: "G" },
  // Group H
  { id: "spain", name: "Spain", code: "es", group: "H" },
  { id: "cabo-verde", name: "Cabo Verde", code: "cv", group: "H" },
  { id: "saudi-arabia", name: "Saudi Arabia", code: "sa", group: "H" },
  { id: "uruguay", name: "Uruguay", code: "uy", group: "H" },
  // Group I
  { id: "france", name: "France", code: "fr", group: "I" },
  { id: "senegal", name: "Senegal", code: "sn", group: "I" },
  { id: "iraq", name: "Iraq", code: "iq", group: "I" },
  { id: "norway", name: "Norway", code: "no", group: "I" },
  // Group J
  { id: "argentina", name: "Argentina", code: "ar", group: "J" },
  { id: "algeria", name: "Algeria", code: "dz", group: "J" },
  { id: "austria", name: "Austria", code: "at", group: "J" },
  { id: "jordan", name: "Jordan", code: "jo", group: "J" },
  // Group K
  { id: "portugal", name: "Portugal", code: "pt", group: "K" },
  { id: "congo-dr", name: "Congo DR", code: "cd", group: "K" },
  { id: "uzbekistan", name: "Uzbekistan", code: "uz", group: "K" },
  { id: "colombia", name: "Colombia", code: "co", group: "K" },
  // Group L
  { id: "england", name: "England", code: "gb-eng", group: "L" },
  { id: "croatia", name: "Croatia", code: "hr", group: "L" },
  { id: "ghana", name: "Ghana", code: "gh", group: "L" },
  { id: "panama", name: "Panama", code: "pa", group: "L" },
];

export const TEAM_BY_ID: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t])
);

export const TEAM_BY_API_ID: Record<number, Team> = Object.fromEntries(
  TEAMS.filter((t) => t.apiId).map((t) => [t.apiId!, t])
);
