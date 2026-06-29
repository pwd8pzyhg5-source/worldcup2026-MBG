// Official WC 2026 Round of 32 -> Round of 16 bracket pairings, provided by the user.
// The API doesn't pre-create knockout fixtures beyond R32 until teams are confirmed,
// so we derive R16 matchups ourselves from finished R32 results using this fixed structure.

export type Slot =
  | { type: "fixed"; team: string }
  | { type: "winnerOf"; teams: [string, string] };

export interface BracketPairing {
  home: Slot;
  away: Slot;
}

export const R16_PAIRINGS: BracketPairing[] = [
  { home: { type: "winnerOf", teams: ["germany", "paraguay"] }, away: { type: "winnerOf", teams: ["france", "sweden"] } },
  { home: { type: "winnerOf", teams: ["morocco", "netherlands"] }, away: { type: "fixed", team: "canada" } },
  { home: { type: "winnerOf", teams: ["portugal", "croatia"] }, away: { type: "winnerOf", teams: ["spain", "austria"] } },
  { home: { type: "winnerOf", teams: ["usa", "bosnia"] }, away: { type: "winnerOf", teams: ["belgium", "senegal"] } },
  { home: { type: "fixed", team: "brazil" }, away: { type: "winnerOf", teams: ["ivory-coast", "norway"] } },
  { home: { type: "winnerOf", teams: ["mexico", "ecuador"] }, away: { type: "winnerOf", teams: ["england", "congo-dr"] } },
  { home: { type: "winnerOf", teams: ["argentina", "cabo-verde"] }, away: { type: "winnerOf", teams: ["australia", "egypt"] } },
  { home: { type: "winnerOf", teams: ["switzerland", "algeria"] }, away: { type: "winnerOf", teams: ["colombia", "ghana"] } },
];
