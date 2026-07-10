import { emojiToTwemojiAssetUrl } from "@/lib/secondary/secondary-topic-icons";
import type { SecondaryTodayActivityKey } from "@/lib/secondary/types";

export const SECONDARY_ACTIVITY_EMOJI: Record<SecondaryTodayActivityKey, string> = {
  match: "🧩",
  cloze: "📝",
  spelling: "🔤",
  sentence: "✍️",
};

export const SECONDARY_HOME_GOAL_EMOJI = "🎯";
export const SECONDARY_HOME_NEXT_EMOJI = "▶️";
export const SECONDARY_HOME_COMPLETE_EMOJI = "🎉";

export function getSecondaryActivityIconUrl(activityKey: SecondaryTodayActivityKey): string {
  return emojiToTwemojiAssetUrl(SECONDARY_ACTIVITY_EMOJI[activityKey]);
}

export function getSecondaryHomeGoalIconUrl(): string {
  return emojiToTwemojiAssetUrl(SECONDARY_HOME_GOAL_EMOJI);
}

export function getSecondaryHomeNextIconUrl(): string {
  return emojiToTwemojiAssetUrl(SECONDARY_HOME_NEXT_EMOJI, 36);
}

export function getSecondaryHomeCompleteIconUrl(): string {
  return emojiToTwemojiAssetUrl(SECONDARY_HOME_COMPLETE_EMOJI);
}
