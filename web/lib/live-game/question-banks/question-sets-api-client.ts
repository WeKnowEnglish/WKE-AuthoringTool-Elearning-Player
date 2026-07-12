import type { LiveGameQuestionSetCard } from "@/lib/live-game/question-banks/types";
import { formatQuestionSetCountLabel } from "@/lib/live-game/question-banks/question-set-card-utils";

export type { LiveGameQuestionSetCard };
export {
  DEFAULT_LIVE_GAME_QUESTION_SET_UUID,
} from "@/lib/live-game/question-banks/question-set-ids";
export { formatQuestionSetCountLabel, totalQuestionCount } from "@/lib/live-game/question-banks/question-set-card-utils";

export const LIVE_GAME_LAST_QUESTION_SET_STORAGE_KEY = "wke-live-game-last-question-set-id";

type QuestionSetsResponse = {
  sets?: LiveGameQuestionSetCard[];
  error?: string;
};

export async function fetchPublishedQuestionSets(): Promise<LiveGameQuestionSetCard[]> {
  const response = await fetch("/api/live-game/question-sets");
  const payload = (await response.json()) as QuestionSetsResponse;
  if (!response.ok || !payload.sets) {
    throw new Error(payload.error ?? "Could not load question sets.");
  }
  return payload.sets;
}

export function readLastSelectedQuestionSetId(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(LIVE_GAME_LAST_QUESTION_SET_STORAGE_KEY);
  return value && value.length > 0 ? value : null;
}

export function writeLastSelectedQuestionSetId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIVE_GAME_LAST_QUESTION_SET_STORAGE_KEY, id);
}

export function resolveInitialQuestionSetSelection(
  sets: LiveGameQuestionSetCard[],
): string | null {
  if (sets.length === 0) return null;
  const stored = readLastSelectedQuestionSetId();
  if (stored && sets.some((set) => set.id === stored)) {
    return stored;
  }
  return sets[0]!.id;
}

export function formatQuestionSetCardCount(set: LiveGameQuestionSetCard): string {
  return formatQuestionSetCountLabel({ level: set.level, questionCount: set.questionCount });
}
