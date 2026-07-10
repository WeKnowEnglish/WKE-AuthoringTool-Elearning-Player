import type { StudentMasteryRecord } from "@/lib/mastery/types";
import { isWordMasteredForSlowReplace } from "@/lib/secondary/secondary-session-slow-replace";
import type { SecondaryTodaySession } from "@/lib/secondary/types";

export type WarmupPruneResult = {
  session: SecondaryTodaySession;
  changed: boolean;
  removedWordItemIds: string[];
};

function rebuildAllWordItemIds(session: SecondaryTodaySession): string[] {
  return [...new Set([...session.warmUpWordItemIds, ...session.todayWordItemIds])];
}

/** Drops mastered warm-up words from the session and activity pools. */
export function reconcileSecondarySessionWarmupPrune(input: {
  session: SecondaryTodaySession;
  masteryRecords: Record<string, StudentMasteryRecord>;
}): WarmupPruneResult {
  const { session, masteryRecords } = input;
  const remainingWarmUp = session.warmUpWordItemIds.filter(
    (wordItemId) => !isWordMasteredForSlowReplace(wordItemId, masteryRecords),
  );

  const removedWordItemIds = session.warmUpWordItemIds.filter(
    (wordItemId) => !remainingWarmUp.includes(wordItemId),
  );

  if (removedWordItemIds.length === 0) {
    return { session, changed: false, removedWordItemIds: [] };
  }

  const nextSession: SecondaryTodaySession = {
    ...session,
    warmUpWordItemIds: remainingWarmUp,
    allWordItemIds: rebuildAllWordItemIds({
      ...session,
      warmUpWordItemIds: remainingWarmUp,
    }),
  };

  return {
    session: nextSession,
    changed: true,
    removedWordItemIds,
  };
}
