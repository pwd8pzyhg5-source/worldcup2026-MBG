import { NextResponse } from "next/server";
import { getVotesForFixtures, castVote, PARTICIPANTS, VoteChoice } from "@/lib/votes";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("fixtureIds");
  if (!idsParam) {
    return NextResponse.json({ votes: {} });
  }
  const fixtureIds = idsParam.split(",").map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
  const votes = await getVotesForFixtures(fixtureIds);
  return NextResponse.json({ votes });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { fixtureId, participant, choice, kickoff } = body as {
    fixtureId: number;
    participant: string;
    choice: VoteChoice;
    kickoff: string;
  };

  if (!fixtureId || !participant || !choice || !kickoff) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!PARTICIPANTS.includes(participant)) {
    return NextResponse.json({ error: "Unknown participant" }, { status: 400 });
  }
  if (!["home", "draw", "away"].includes(choice)) {
    return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
  }
  if (new Date(kickoff).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Voting closed — match has started" }, { status: 400 });
  }

  await castVote(fixtureId, participant, choice);
  return NextResponse.json({ ok: true });
}
