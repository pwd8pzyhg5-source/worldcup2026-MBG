import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const PARTICIPANTS = ["Gordo", "Shun", "Dr. Rick", "Sexy Tecsy", "Lazy Bones", "Bradical Bray"];

export type VoteChoice = "home" | "draw" | "away";

// One Redis hash per fixture: { "Gordo": "home", "Shun": "away", ... }
function voteKey(fixtureId: number) {
  return `votes:${fixtureId}`;
}

export async function getVotes(fixtureId: number): Promise<Record<string, VoteChoice>> {
  const data = await redis.hgetall<Record<string, VoteChoice>>(voteKey(fixtureId));
  return data ?? {};
}

export async function getVotesForFixtures(fixtureIds: number[]): Promise<Record<number, Record<string, VoteChoice>>> {
  const results = await Promise.all(fixtureIds.map((id) => getVotes(id)));
  const out: Record<number, Record<string, VoteChoice>> = {};
  fixtureIds.forEach((id, i) => { out[id] = results[i]; });
  return out;
}

export async function castVote(fixtureId: number, participant: string, choice: VoteChoice): Promise<void> {
  if (!PARTICIPANTS.includes(participant)) throw new Error("Unknown participant");
  await redis.hset(voteKey(fixtureId), { [participant]: choice });
}
