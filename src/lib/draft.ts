import fs from "fs";
import path from "path";

const DRAFT_PATH = path.join(process.cwd(), "data", "draft.json");

export interface DraftState {
  completed: boolean;
  draftOrder: string[]; // participant names in snake order
  currentPick: number;
  picks: Array<{ participant: string; teamId: string; pickNumber: number }>;
  participants: Record<string, string[]>; // name -> teamIds
}

export function readDraft(): DraftState {
  const raw = fs.readFileSync(DRAFT_PATH, "utf-8");
  return JSON.parse(raw) as DraftState;
}

export function writeDraft(state: DraftState): void {
  fs.writeFileSync(DRAFT_PATH, JSON.stringify(state, null, 2));
}

const PARTICIPANTS = ["Gordo", "Shun", "Dr. Rick", "Sexy Tecsy", "Lazy Bones", "Bradical Bray Bray"];

export function buildSnakeOrder(participants: string[]): string[] {
  const order: string[] = [];
  const total = 48;
  const n = participants.length;
  for (let round = 0; round < Math.ceil(total / n); round++) {
    const slice = round % 2 === 0 ? [...participants] : [...participants].reverse();
    order.push(...slice);
    if (order.length >= total) break;
  }
  return order.slice(0, total);
}

export function randomizeOrder(participants: string[]): string[] {
  const arr = [...participants];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function initDraft(): DraftState {
  const shuffled = randomizeOrder(PARTICIPANTS);
  const draftOrder = buildSnakeOrder(shuffled);
  const state: DraftState = {
    completed: false,
    draftOrder,
    currentPick: 0,
    picks: [],
    participants: Object.fromEntries(PARTICIPANTS.map((p) => [p, []])),
  };
  writeDraft(state);
  return state;
}
