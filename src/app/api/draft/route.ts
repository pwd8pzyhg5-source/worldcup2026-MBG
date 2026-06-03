import { NextRequest, NextResponse } from "next/server";
import { readDraft, writeDraft, initDraft } from "@/lib/draft";
import { TEAMS, TEAM_BY_ID } from "../../../../data/teams";

export async function GET() {
  const draft = readDraft();
  return NextResponse.json(draft);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, teamId, admin } = body;

  if (action === "init") {
    if (admin !== "true") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const state = initDraft();
    return NextResponse.json(state);
  }

  if (action === "pick") {
    const draft = readDraft();

    if (draft.completed) {
      return NextResponse.json({ error: "Draft is complete" }, { status: 400 });
    }

    if (draft.draftOrder.length === 0) {
      return NextResponse.json({ error: "Draft not initialized" }, { status: 400 });
    }

    if (!TEAM_BY_ID[teamId]) {
      return NextResponse.json({ error: "Invalid team" }, { status: 400 });
    }

    // Check not already picked
    if (draft.picks.some((p) => p.teamId === teamId)) {
      return NextResponse.json({ error: "Team already picked" }, { status: 400 });
    }

    const currentParticipant = draft.draftOrder[draft.currentPick];
    draft.picks.push({ participant: currentParticipant, teamId, pickNumber: draft.currentPick + 1 });
    draft.participants[currentParticipant].push(teamId);
    draft.currentPick += 1;

    if (draft.currentPick >= TEAMS.length) {
      draft.completed = true;
    }

    writeDraft(draft);
    return NextResponse.json(draft);
  }

  if (action === "reset") {
    if (admin !== "true") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const state = initDraft();
    return NextResponse.json(state);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
