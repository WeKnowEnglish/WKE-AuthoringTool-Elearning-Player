import { isSecondaryWordMastered } from "@/lib/secondary/secondary-mastery-display";
import type { SecondaryWordDisplaySnapshot } from "@/lib/secondary/secondary-mastery-display";
import { TARGET_TODAY_WORDS } from "@/lib/secondary/secondary-session-selection";
import type { SecondaryTodaySession } from "@/lib/secondary/types";

export type SecondaryDailyMasteryGoalProgress = {
  masteredCount: number;
  goal: number;
  remainingCount: number;
  goalReached: boolean;
};

export function countSecondaryDailyMasteryGoalProgress(input: {
  todayWordItemIds: string[];
  replacedOutWordItemIds?: string[];
  snapshotForWord: (wordItemId: string) => SecondaryWordDisplaySnapshot;
  goal?: number;
}): SecondaryDailyMasteryGoalProgress {
  const goal = input.goal ?? TARGET_TODAY_WORDS;
  const masteredIds = new Set<string>(input.replacedOutWordItemIds ?? []);

  for (const wordItemId of input.todayWordItemIds) {
    if (isSecondaryWordMastered(input.snapshotForWord(wordItemId))) {
      masteredIds.add(wordItemId);
    }
  }

  const masteredCount = Math.min(goal, masteredIds.size);
  const remainingCount = Math.max(0, goal - masteredCount);

  return {
    masteredCount,
    goal,
    remainingCount,
    goalReached: masteredCount >= goal,
  };
}

export function dailyMasteryGoalProgressFromSession(
  session: Pick<SecondaryTodaySession, "todayWordItemIds" | "replacedOutWordItemIds">,
  snapshotForWord: (wordItemId: string) => SecondaryWordDisplaySnapshot,
  goal = TARGET_TODAY_WORDS,
): SecondaryDailyMasteryGoalProgress {
  return countSecondaryDailyMasteryGoalProgress({
    todayWordItemIds: session.todayWordItemIds,
    replacedOutWordItemIds: session.replacedOutWordItemIds,
    snapshotForWord,
    goal,
  });
}
