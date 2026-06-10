// FIFA World Rankings (June 2026) — keyed by our internal team ID slugs
// Source: inside.fifa.com/fifa-world-ranking/men

export const FIFA_RANKINGS_BY_ID: Record<string, number> = {
  argentina: 1,
  spain: 2,
  france: 3,
  england: 4,
  portugal: 5,
  brazil: 6,
  morocco: 7,
  netherlands: 8,
  belgium: 9,
  germany: 10,
  croatia: 11,
  colombia: 13,
  mexico: 14,
  senegal: 15,
  uruguay: 16,
  usa: 17,
  japan: 18,
  switzerland: 19,
  iran: 20,
  turkey: 22,
  ecuador: 23,
  austria: 24,
  "korea-republic": 25,
  australia: 27,
  algeria: 28,
  egypt: 29,
  canada: 30,
  norway: 31,
  "ivory-coast": 33,
  panama: 34,
  sweden: 38,
  czechia: 40,
  paraguay: 41,
  scotland: 42,
  tunisia: 45,
  "congo-dr": 46,
  uzbekistan: 50,
  qatar: 56,
  iraq: 57,
  "south-africa": 60,
  "saudi-arabia": 61,
  jordan: 63,
  bosnia: 64,
  "cabo-verde": 67,
  ghana: 73,
  curacao: 82,
  haiti: 83,
  "new-zealand": 85,
};

// Top-10 team IDs — beating/drawing one of these triggers upset bonus check
export const FIFA_TOP_10_IDS = new Set([
  "argentina",
  "spain",
  "france",
  "england",
  "portugal",
  "brazil",
  "morocco",
  "netherlands",
  "belgium",
  "germany",
]);

// A team is eligible for the upset bonus if ranked 30th or lower (higher number)
const UPSET_THRESHOLD = 30;

export function isUpsetEligible(teamId: string): boolean {
  const rank = FIFA_RANKINGS_BY_ID[teamId];
  // Teams not in our rankings list are considered unranked underdogs — eligible
  return rank === undefined || rank >= UPSET_THRESHOLD;
}

export function isTopTen(teamId: string): boolean {
  return FIFA_TOP_10_IDS.has(teamId);
}
