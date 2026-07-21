import "server-only";

import { packFlashcardsAdapter } from "@/lib/assignable-activities/adapters/pack-flashcards";
import { packMcQuizAdapter } from "@/lib/assignable-activities/adapters/pack-mc-quiz";
import type {
  AssignableActivityAdapter,
  AssignableActivityCard,
  AssignableActivityKind,
} from "@/lib/assignable-activities/types";
import { isAssignableActivityKind } from "@/lib/assignable-activities/types";

const ADAPTERS: Record<AssignableActivityKind, AssignableActivityAdapter> = {
  pack_mc_quiz: packMcQuizAdapter,
  pack_flashcards: packFlashcardsAdapter,
};

export function listAssignableActivityKinds(): AssignableActivityKind[] {
  return Object.keys(ADAPTERS) as AssignableActivityKind[];
}

export function getAssignableActivityAdapter(
  kind: AssignableActivityKind,
): AssignableActivityAdapter {
  const adapter = ADAPTERS[kind];
  if (!adapter) {
    throw new Error(`No assignable activity adapter for kind: ${kind}`);
  }
  return adapter;
}

export function tryGetAssignableActivityAdapter(
  kind: string,
): AssignableActivityAdapter | null {
  if (!isAssignableActivityKind(kind)) return null;
  return ADAPTERS[kind] ?? null;
}

/** Aggregate cards from every registered adapter for a class. */
export async function listAssignableActivitiesForClass(
  classId: string,
): Promise<AssignableActivityCard[]> {
  const cards: AssignableActivityCard[] = [];
  for (const kind of listAssignableActivityKinds()) {
    const adapter = getAssignableActivityAdapter(kind);
    const listed = await adapter.listForClass(classId);
    cards.push(...listed);
  }
  return cards;
}
