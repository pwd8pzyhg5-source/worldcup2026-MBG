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
  { id: "mexico", name: "Mexico", code: "mx", group: "A", apiId: 16 },
  { id: "south-africa", name: "South Africa", code: "za", group: "A", apiId: 1531 },
  { id: "korea-republic", name: "Korea Republic", code: "kr", group: "A", apiId: 17 },
  { id: "czechia", name: "Czechia", code: "cz", group: "A", apiId: 770 },
  // Group B
  { id: "canada", name: "Canada", code: "ca", group: "B", apiId: 5529 },
  { id: "bosnia", name: "Bosnia and Herzegovina", code: "ba", group: "B", apiId: 1113 },
  { id: "qatar", name: "Qatar", code: "qa", group: "B", apiId: 1569 },
  { id: "switzerland", name: "Switzerland", code: "ch", group: "B", apiId: 15 },
  // Group C
  { id: "brazil", name: "Brazil", code: "br", group: "C", apiId: 6 },
  { id: "morocco", name: "Morocco", code: "ma", group: "C", apiId: 31 },
  { id: "haiti", name: "Haiti", code: "ht", group: "C", apiId: 2386 },
  { id: "scotland", name: "Scotland", code: "gb-sct", group: "C", apiId: 1108 },
  // Group D
  { id: "usa", name: "USA", code: "us", group: "D", apiId: 2384 },
  { id: "paraguay", name: "Paraguay", code: "py", group: "D", apiId: 2380 },
  { id: "australia", name: "Australia", code: "au", group: "D", apiId: 20 },
  { id: "turkey", name: "Türkiye", code: "tr", group: "D", apiId: 777 },
  // Group E
  { id: "germany", name: "Germany", code: "de", group: "E", apiId: 25 },
  { id: "curacao", name: "Curaçao", code: "cw", group: "E", apiId: 5530 },
  { id: "ivory-coast", name: "Côte d'Ivoire", code: "ci", group: "E", apiId: 1501 },
  { id: "ecuador", name: "Ecuador", code: "ec", group: "E", apiId: 2382 },
  // Group F
  { id: "netherlands", name: "Netherlands", code: "nl", group: "F", apiId: 1118 },
  { id: "japan", name: "Japan", code: "jp", group: "F", apiId: 12 },
  { id: "sweden", name: "Sweden", code: "se", group: "F", apiId: 5 },
  { id: "tunisia", name: "Tunisia", code: "tn", group: "F", apiId: 28 },
  // Group G
  { id: "belgium", name: "Belgium", code: "be", group: "G", apiId: 1 },
  { id: "egypt", name: "Egypt", code: "eg", group: "G", apiId: 32 },
  { id: "iran", name: "IR Iran", code: "ir", group: "G", apiId: 22 },
  { id: "new-zealand", name: "New Zealand", code: "nz", group: "G", apiId: 4673 },
  // Group H
  { id: "spain", name: "Spain", code: "es", group: "H", apiId: 9 },
  { id: "cabo-verde", name: "Cabo Verde", code: "cv", group: "H", apiId: 1533 },
  { id: "saudi-arabia", name: "Saudi Arabia", code: "sa", group: "H", apiId: 23 },
  { id: "uruguay", name: "Uruguay", code: "uy", group: "H", apiId: 7 },
  // Group I
  { id: "france", name: "France", code: "fr", group: "I", apiId: 2 },
  { id: "senegal", name: "Senegal", code: "sn", group: "I", apiId: 13 },
  { id: "iraq", name: "Iraq", code: "iq", group: "I", apiId: 1567 },
  { id: "norway", name: "Norway", code: "no", group: "I", apiId: 1090 },
  // Group J
  { id: "argentina", name: "Argentina", code: "ar", group: "J", apiId: 26 },
  { id: "algeria", name: "Algeria", code: "dz", group: "J", apiId: 1532 },
  { id: "austria", name: "Austria", code: "at", group: "J", apiId: 775 },
  { id: "jordan", name: "Jordan", code: "jo", group: "J", apiId: 1548 },
  // Group K
  { id: "portugal", name: "Portugal", code: "pt", group: "K", apiId: 27 },
  { id: "congo-dr", name: "Congo DR", code: "cd", group: "K", apiId: 1508 },
  { id: "uzbekistan", name: "Uzbekistan", code: "uz", group: "K", apiId: 1568 },
  { id: "colombia", name: "Colombia", code: "co", group: "K", apiId: 8 },
  // Group L
  { id: "england", name: "England", code: "gb-eng", group: "L", apiId: 10 },
  { id: "croatia", name: "Croatia", code: "hr", group: "L", apiId: 3 },
  { id: "ghana", name: "Ghana", code: "gh", group: "L", apiId: 1504 },
  { id: "panama", name: "Panama", code: "pa", group: "L", apiId: 11 },
];

export const TEAM_BY_ID: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t])
);

export const TEAM_BY_API_ID: Record<number, Team> = Object.fromEntries(
  TEAMS.filter((t) => t.apiId).map((t) => [t.apiId!, t])
);
