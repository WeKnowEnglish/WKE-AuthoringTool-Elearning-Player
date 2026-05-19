import { bumpDailyQuestProgress } from "./daily-quests";

/** One correct spell screen in a vocabulary set run (feeds shared letter_mixup quest). */
export function recordVocabSpellDailyQuestProgress(): void {
  bumpDailyQuestProgress("letter_mixup", 1);
}

/** Finishing a full vocabulary set run (opening through reward screen). */
export function recordVocabSetCompletionDailyQuestProgress(): void {
  bumpDailyQuestProgress("vocab_set_completions", 1);
}
