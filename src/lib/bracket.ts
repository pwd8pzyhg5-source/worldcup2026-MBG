// Official WC 2026 bracket structure.
// API-Football doesn't pre-create R16+ fixtures until teams are confirmed,
// so we derive them from finished R32 results using these fixed structures.

export type Slot =
  | { type: "fixed"; team: string }
  | { type: "winnerOf"; teams: [string, string] };

export interface BracketPairing {
  home: Slot;
  away: Slot;
}

// Canonical R32 bracket positions (0-indexed).
// Positions 0-7 = left half, 8-15 = right half.
// Each consecutive pair of positions feeds into the same R16 slot.
export const R32_BRACKET_ORDER: [string, string][] = [
  // ── LEFT HALF ──
  ["germany", "paraguay"],     // 0 → R16 slot 0 (top)
  ["france", "sweden"],        // 1 → R16 slot 0 (bottom)
  ["south-africa", "canada"],  // 2 → R16 slot 1 (top)
  ["netherlands", "morocco"],  // 3 → R16 slot 1 (bottom)
  ["portugal", "croatia"],     // 4 → R16 slot 2 (top)
  ["spain", "austria"],        // 5 → R16 slot 2 (bottom)
  ["usa", "bosnia"],           // 6 → R16 slot 3 (top)
  ["belgium", "senegal"],      // 7 → R16 slot 3 (bottom)
  // ── RIGHT HALF ──
  ["brazil", "japan"],         // 8 → R16 slot 4 (top)
  ["ivory-coast", "norway"],   // 9 → R16 slot 4 (bottom)
  ["mexico", "ecuador"],       // 10 → R16 slot 5 (top)
  ["england", "congo-dr"],     // 11 → R16 slot 5 (bottom)
  ["argentina", "cabo-verde"], // 12 → R16 slot 6 (top)
  ["australia", "egypt"],      // 13 → R16 slot 6 (bottom)
  ["switzerland", "algeria"],  // 14 → R16 slot 7 (top)
  ["colombia", "ghana"],       // 15 → R16 slot 7 (bottom)
];

// Manual result overrides — used when the API hasn't updated yet.
// Key: sorted "teamA|teamB", value: winner slug.
// Safe to leave in place once the API catches up (API result takes precedence when FINISHED).
export const MANUAL_RESULTS: Record<string, string> = {
  "germany|paraguay": "paraguay", // Paraguay won on penalties (Jun 29)
};

// Manual advancement bonuses for points calculation — merged into advancementMap
// when the API fixture hasn't been marked finished yet. Remove entries once API confirms.
export const MANUAL_ADVANCEMENTS: Record<string, string[]> = {
  "paraguay": ["Round of 32"], // Beat Germany on pens (Jun 29) — API not yet updated
};

// R32 winner → R16 pairings (first 4 = left bracket, last 4 = right bracket).
export const R16_PAIRINGS: BracketPairing[] = [
  // LEFT BRACKET
  { home: { type: "winnerOf", teams: ["germany", "paraguay"] },    away: { type: "winnerOf", teams: ["france", "sweden"] } },       // M89
  { home: { type: "fixed", team: "canada" },                       away: { type: "winnerOf", teams: ["netherlands", "morocco"] } },  // M90: CAN top
  { home: { type: "winnerOf", teams: ["portugal", "croatia"] },    away: { type: "winnerOf", teams: ["spain", "austria"] } },        // M93
  { home: { type: "winnerOf", teams: ["usa", "bosnia"] },          away: { type: "winnerOf", teams: ["belgium", "senegal"] } },      // M94
  // RIGHT BRACKET
  { home: { type: "fixed", team: "brazil" },                       away: { type: "winnerOf", teams: ["ivory-coast", "norway"] } },  // M91: BRA top
  { home: { type: "winnerOf", teams: ["mexico", "ecuador"] },      away: { type: "winnerOf", teams: ["england", "congo-dr"] } },    // M92
  { home: { type: "winnerOf", teams: ["argentina", "cabo-verde"] },away: { type: "winnerOf", teams: ["australia", "egypt"] } },     // M95
  { home: { type: "winnerOf", teams: ["switzerland", "algeria"] }, away: { type: "winnerOf", teams: ["colombia", "ghana"] } },      // M96
];
