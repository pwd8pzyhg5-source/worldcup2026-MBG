export interface Team {
  id: string;
  name: string;
  code: string; // 2-letter ISO for flag CDN
  group: string;
  apiId?: number; // API-Football team ID
}

// All 48 FIFA World Cup 2026 teams
export const TEAMS: Team[] = [
  // Group A
  { id: "usa", name: "USA", code: "us", group: "A", apiId: 2 },
  { id: "mexico", name: "Mexico", code: "mx", group: "A", apiId: 16 },
  { id: "canada", name: "Canada", code: "ca", group: "A", apiId: 94 },
  { id: "honduras", name: "Honduras", code: "hn", group: "A", apiId: 81 },
  // Group B
  { id: "argentina", name: "Argentina", code: "ar", group: "B", apiId: 26 },
  { id: "ecuador", name: "Ecuador", code: "ec", group: "B", apiId: 130 },
  { id: "chile", name: "Chile", code: "cl", group: "B", apiId: 7 },
  { id: "bolivia", name: "Bolivia", code: "bo", group: "B", apiId: 39 },
  // Group C
  { id: "brazil", name: "Brazil", code: "br", group: "C", apiId: 6 },
  { id: "colombia", name: "Colombia", code: "co", group: "C", apiId: 31 },
  { id: "venezuela", name: "Venezuela", code: "ve", group: "C", apiId: 233 },
  { id: "peru", name: "Peru", code: "pe", group: "C", apiId: 17 },
  // Group D
  { id: "france", name: "France", code: "fr", group: "D", apiId: 2 },
  { id: "germany", name: "Germany", code: "de", group: "D", apiId: 25 },
  { id: "portugal", name: "Portugal", code: "pt", group: "D", apiId: 27 },
  { id: "belgium", name: "Belgium", code: "be", group: "D", apiId: 1 },
  // Group E
  { id: "spain", name: "Spain", code: "es", group: "E", apiId: 9 },
  { id: "england", name: "England", code: "gb-eng", group: "E", apiId: 10 },
  { id: "netherlands", name: "Netherlands", code: "nl", group: "E", apiId: 1118 },
  { id: "turkey", name: "Turkey", code: "tr", group: "E", apiId: 29 },
  // Group F
  { id: "italy", name: "Italy", code: "it", group: "F", apiId: 768 },
  { id: "croatia", name: "Croatia", code: "hr", group: "F", apiId: 3 },
  { id: "denmark", name: "Denmark", code: "dk", group: "F", apiId: 21 },
  { id: "serbia", name: "Serbia", code: "rs", group: "F", apiId: 14 },
  // Group G
  { id: "morocco", name: "Morocco", code: "ma", group: "G", apiId: 32 },
  { id: "senegal", name: "Senegal", code: "sn", group: "G", apiId: 8 },
  { id: "algeria", name: "Algeria", code: "dz", group: "G", apiId: 63 },
  { id: "egypt", name: "Egypt", code: "eg", group: "G", apiId: 20 },
  // Group H
  { id: "japan", name: "Japan", code: "jp", group: "H", apiId: 15 },
  { id: "south-korea", name: "South Korea", code: "kr", group: "H", apiId: 35 },
  { id: "australia", name: "Australia", code: "au", group: "H", apiId: 23 },
  { id: "indonesia", name: "Indonesia", code: "id", group: "H", apiId: 251 },
  // Group I
  { id: "iran", name: "Iran", code: "ir", group: "I", apiId: 289 },
  { id: "saudi-arabia", name: "Saudi Arabia", code: "sa", group: "I", apiId: 36 },
  { id: "iraq", name: "Iraq", code: "iq", group: "I", apiId: 5 },
  { id: "uzbekistan", name: "Uzbekistan", code: "uz", group: "I", apiId: 80 },
  // Group J
  { id: "nigeria", name: "Nigeria", code: "ng", group: "J", apiId: 34 },
  { id: "ghana", name: "Ghana", code: "gh", group: "J", apiId: 34 },
  { id: "ivory-coast", name: "Ivory Coast", code: "ci", group: "J", apiId: 1227 },
  { id: "cameroon", name: "Cameroon", code: "cm", group: "J", apiId: 40 },
  // Group K
  { id: "uruguay", name: "Uruguay", code: "uy", group: "K", apiId: 28 },
  { id: "paraguay", name: "Paraguay", code: "py", group: "K", apiId: 45 },
  { id: "panama", name: "Panama", code: "pa", group: "K", apiId: 85 },
  { id: "cuba", name: "Cuba", code: "cu", group: "K", apiId: 83 },
  // Group L
  { id: "switzerland", name: "Switzerland", code: "ch", group: "L", apiId: 18 },
  { id: "austria", name: "Austria", code: "at", group: "L", apiId: 773 },
  { id: "slovakia", name: "Slovakia", code: "sk", group: "L", apiId: 13 },
  { id: "ukraine", name: "Ukraine", code: "ua", group: "L", apiId: 22 },
];

export const TEAM_BY_ID: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t])
);

export const TEAM_BY_API_ID: Record<number, Team> = Object.fromEntries(
  TEAMS.filter((t) => t.apiId).map((t) => [t.apiId!, t])
);
