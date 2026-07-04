import { bumpDailyQuestProgress } from "@/lib/teststartpage/daily-quests";

export function recordGardenHarvestQuest(): void {
  bumpDailyQuestProgress("garden_harvests", 1);
}

export function recordGardenWordSpelledQuest(): void {
  bumpDailyQuestProgress("garden_words", 1);
}

export function recordGardenWeedClearedQuest(): void {
  bumpDailyQuestProgress("garden_weeds_cleared", 1);
}
