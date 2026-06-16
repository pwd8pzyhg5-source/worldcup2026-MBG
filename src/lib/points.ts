import { TEAM_BY_ID } from "../../data/teams";
import { isTopTen, isUpsetEligible } from "./fifaRankings";

export interface MatchResult {
  fixtureId: number;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
  status: "NS" | "1H" | "HT" | "2H" | "ET" | "P" | "FT" | "AET" | "PEN";
  stage: "Group Stage" | "Round of 32" | "Round of 16" | "Quarter-finals" | "Semi-finals" | "3rd Place Final" | "Final";
  homeRedCards: number;
  awayRedCards: number;
  homeYellowCards: number;
  awayYellowCards: number;
}

export interface TeamPoints {
  teamId: string;
  total: number;
  breakdown: {
    groupWins: number;
    groupDraws: number;
    cleanSheets: number;
    goalsScored: number;
    upsetWins: number;
    upsetDraws: number;
    advancedRound32: number;
    advancedRound16: number;
    advancedQF: number;
    advancedSF: number;
    bronze: number;
    runnerUp: number;
    champion: number;
    redCardPenalty: number;
    yellowCardPenalty: number;
  };
}

export interface ParticipantStanding {
  name: string;
  teams: string[];
  totalPoints: number;
  teamPoints: TeamPoints[];
}

const POINTS = {
  groupWin: 3,
  groupDraw: 1,
  cleanSheet: 2,
  goal: 1,
  upsetWin: 3,
  upsetDraw: 1,
  round32: 2,
  round16: 4,
  quarterFinal: 6,
  semiFinal: 0,
  bronze: 9,
  runnerUp: 11,
  champion: 15,
  redCard: -2,
  yellowCardPair: -1,
};

export function calculateTeamPoints(
  teamId: string,
  results: MatchResult[],
  advancementMap: Record<string, string[]> // teamId -> stages advanced to
): TeamPoints {
  const breakdown = {
    groupWins: 0,
    groupDraws: 0,
    cleanSheets: 0,
    goalsScored: 0,
    upsetWins: 0,
    upsetDraws: 0,
    advancedRound32: 0,
    advancedRound16: 0,
    advancedQF: 0,
    advancedSF: 0,
    bronze: 0,
    runnerUp: 0,
    champion: 0,
    redCardPenalty: 0,
    yellowCardPenalty: 0,
  };

  let totalYellows = 0;

  for (const match of results) {
    const isHome = match.homeTeamId === teamId;
    const isAway = match.awayTeamId === teamId;
    if (!isHome && !isAway) continue;

    // Include both finished and in-progress matches for live standings

    const myGoals = isHome ? match.homeGoals : match.awayGoals;
    const theirGoals = isHome ? match.awayGoals : match.homeGoals;
    const myRedCards = isHome ? match.homeRedCards : match.awayRedCards;
    const myYellowCards = isHome ? match.homeYellowCards : match.awayYellowCards;

    // Goals scored
    breakdown.goalsScored += myGoals;

    // Clean sheets
    if (theirGoals === 0) breakdown.cleanSheets += 1;

    // Group stage results
    if (match.stage === "Group Stage") {
      if (myGoals > theirGoals) breakdown.groupWins += 1;
      else if (myGoals === theirGoals) breakdown.groupDraws += 1;
    }

    // Upset bonus: team ranked 30+ beats or draws a top-10 team
    const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
    if (isUpsetEligible(teamId) && isTopTen(opponentId)) {
      if (myGoals > theirGoals) breakdown.upsetWins += 1;
      else if (myGoals === theirGoals) breakdown.upsetDraws += 1;
    }

    // Cards
    breakdown.redCardPenalty += myRedCards;
    totalYellows += myYellowCards;
  }

  // Every 3 yellows = -1
  breakdown.yellowCardPenalty = Math.floor(totalYellows / 3);

  // Advancement bonuses
  const stages = advancementMap[teamId] || [];
  if (stages.includes("Round of 32")) breakdown.advancedRound32 = 1;
  if (stages.includes("Round of 16")) breakdown.advancedRound16 = 1;
  if (stages.includes("Quarter-finals")) breakdown.advancedQF = 1;
  if (stages.includes("Semi-finals")) breakdown.advancedSF = 1;
  if (stages.includes("3rd Place")) breakdown.bronze = 1;
  if (stages.includes("Runner-up")) breakdown.runnerUp = 1;
  if (stages.includes("Champion")) breakdown.champion = 1;

  const total =
    breakdown.groupWins * POINTS.groupWin +
    breakdown.groupDraws * POINTS.groupDraw +
    breakdown.cleanSheets * POINTS.cleanSheet +
    breakdown.goalsScored * POINTS.goal +
    breakdown.upsetWins * POINTS.upsetWin +
    breakdown.upsetDraws * POINTS.upsetDraw +
    breakdown.advancedRound32 * POINTS.round32 +
    breakdown.advancedRound16 * POINTS.round16 +
    breakdown.advancedQF * POINTS.quarterFinal +
    breakdown.advancedSF * POINTS.semiFinal +
    breakdown.bronze * POINTS.bronze +
    breakdown.runnerUp * POINTS.runnerUp +
    breakdown.champion * POINTS.champion +
    breakdown.redCardPenalty * POINTS.redCard +
    breakdown.yellowCardPenalty * POINTS.yellowCardPair;

  return { teamId, total, breakdown };
}

export function calculateStandings(
  draft: Record<string, string[]>,
  results: MatchResult[],
  advancementMap: Record<string, string[]>
): ParticipantStanding[] {
  return Object.entries(draft)
    .map(([name, teams]) => {
      const teamPoints = teams.map((teamId) =>
        calculateTeamPoints(teamId, results, advancementMap)
      );
      return {
        name,
        teams,
        totalPoints: teamPoints.reduce((sum, t) => sum + t.total, 0),
        teamPoints,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);
}
