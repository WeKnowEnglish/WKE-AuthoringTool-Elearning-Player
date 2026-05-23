import type { ExploreGate } from "@/lib/lesson-schemas";
import { lookupWordIdFromLemma } from "@/lib/word-collection";

export type ThemedGateInput = {
  id: string;
  targetWord: string;
  prompt: string;
  sceneImageUrl?: string;
  timeLimitSec?: number;
};

/** Build a gate; throws if the lemma is missing from master vocabulary (loot pool safety). */
export function buildThemedGate(input: ThemedGateInput): ExploreGate {
  const lemma = input.targetWord.trim().toLowerCase();
  if (!lookupWordIdFromLemma(lemma)) {
    throw new Error(`explore chapter gate: unknown vocabulary lemma "${input.targetWord}"`);
  }
  return {
    id: input.id,
    prompt: input.prompt,
    target_word: lemma,
    time_limit_sec: input.timeLimitSec ?? 10,
    min_words_to_clear: 1,
    scene_image_url: input.sceneImageUrl,
  };
}
