import "server-only";

import { clientQuestionId } from "@/lib/live-game/question-banks/client-payloads";
import type { LiveGameQuestionSetSnapshot } from "@/lib/live-game/question-banks/types";
import type { LiveGameSafeQuestionBundle } from "@/lib/live-game/question-bundle";

type SafeBanks = Omit<LiveGameSafeQuestionBundle, "roomId">;

type CacheEntry = {
  expiresAt: number;
  banks: SafeBanks;
};

// Immutable published set versions — warm safe (answer-stripped) banks for the classroom day.
const SAFE_BUNDLE_TTL_MS = 8 * 60 * 60 * 1_000;
const MAX_SAFE_BUNDLE_ENTRIES = 32;
const safeBundleCache = new Map<string, CacheEntry>();

function safeBundleKey(questionSetId: string, version: number) {
  return `${questionSetId}:v${version}`;
}

function writeSafeBundleCache(questionSetId: string, version: number, banks: SafeBanks) {
  if (safeBundleCache.size >= MAX_SAFE_BUNDLE_ENTRIES) {
    const oldest = safeBundleCache.keys().next().value as string | undefined;
    if (oldest) safeBundleCache.delete(oldest);
  }
  safeBundleCache.set(safeBundleKey(questionSetId, version), {
    expiresAt: Date.now() + SAFE_BUNDLE_TTL_MS,
    banks,
  });
}

export function peekSafeLiveGameQuestionBundleCache(
  questionSetId: string,
  version: number,
): boolean {
  const entry = safeBundleCache.get(safeBundleKey(questionSetId, version));
  return Boolean(entry && entry.expiresAt > Date.now());
}

export function buildSafeLiveGameQuestionBundle(input: {
  roomId: string;
  questionSetId: string;
  questionSetVersion: number;
  snapshot: LiveGameQuestionSetSnapshot;
}): LiveGameSafeQuestionBundle {
  const banks: SafeBanks = {
    questionSetId: input.questionSetId,
    questionSetVersion: input.questionSetVersion,
    harvest: input.snapshot.harvest.map((row) => ({
      id: row.id,
      clientId: clientQuestionId(row),
      prompt: row.prompt,
      options: row.payload.type === "multiple_choice" ? row.payload.options : [],
    })),
    deposit: input.snapshot.deposit.map((row) => ({
      id: row.id,
      clientId: clientQuestionId(row),
      prompt: row.prompt,
      spellHint: row.payload.type === "deposit_spell" ? row.payload.spellHint : "",
      slotCount: row.payload.type === "deposit_spell" ? [...row.payload.targetWord].length : 0,
    })),
    craft: input.snapshot.craft.map((row) => ({
      id: row.id,
      clientId: clientQuestionId(row),
      prompt: row.prompt,
      wordBank: row.payload.type === "drag_sentence" ? row.payload.wordBank : [],
      slotCount: row.payload.type === "drag_sentence" ? row.payload.slotCount : 0,
    })),
  };
  writeSafeBundleCache(input.questionSetId, input.questionSetVersion, banks);
  return { roomId: input.roomId, ...banks };
}

export function getOrBuildSafeLiveGameQuestionBundle(input: {
  roomId: string;
  questionSetId: string;
  questionSetVersion: number;
  snapshot: LiveGameQuestionSetSnapshot;
}): { bundle: LiveGameSafeQuestionBundle; bundleCacheOutcome: "hit" | "miss" } {
  const cached = safeBundleCache.get(safeBundleKey(input.questionSetId, input.questionSetVersion));
  if (cached && cached.expiresAt > Date.now()) {
    return {
      bundle: { roomId: input.roomId, ...cached.banks },
      bundleCacheOutcome: "hit",
    };
  }
  return {
    bundle: buildSafeLiveGameQuestionBundle(input),
    bundleCacheOutcome: "miss",
  };
}

/** Test helper */
export function clearSafeLiveGameQuestionBundleCacheForTests() {
  safeBundleCache.clear();
}
