"use client";

import type { EnglishCraftCraftQuestionClient, EnglishCraftMcQuestionClient } from "@/lib/live-game/modes/english-craft/questions-client";
import type { LiveGameSafeQuestionBundle } from "@/lib/live-game/question-bundle";
import { pickQuestionFromSessionDeck } from "@/lib/live-game/question-deck";
import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";
import { diagnosticFetch, recordLiveGameDiagnostic } from "@/lib/live-game/diagnostics/client";

const bundles = new Map<string, LiveGameSafeQuestionBundle>();
const bundleLoads = new Map<string, Promise<LiveGameSafeQuestionBundle | null>>();

export function getPreloadedQuestionBundleVersion(roomId: string): number | null {
  return bundles.get(roomId)?.questionSetVersion ?? null;
}

export async function preloadLiveGameQuestionBundle(
  roomId: string,
): Promise<LiveGameSafeQuestionBundle | null> {
  const cached = bundles.get(roomId);
  if (cached) {
    recordLiveGameDiagnostic("room", "question_bundle_cache_hit", { roomId });
    return cached;
  }
  const inFlight = bundleLoads.get(roomId);
  if (inFlight) {
    recordLiveGameDiagnostic("room", "question_bundle_inflight", { roomId });
    return inFlight;
  }

  const load = (async () => {
    try {
      const response = await diagnosticFetch("/api/live-game/question-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      }, { phase: "room", name: "question_bundle_request", detail: { roomId } });
      if (!response.ok) return null;
      const payload = (await response.json()) as LiveGameSafeQuestionBundle;
      if (payload.roomId !== roomId || !Number.isInteger(payload.questionSetVersion)) return null;
      bundles.set(roomId, payload);
      recordLiveGameDiagnostic("room", "question_bundle_ready", {
        roomId,
        questionSetVersion: payload.questionSetVersion,
      });
      return payload;
    } catch {
      return null;
    }
  })();
  bundleLoads.set(roomId, load);
  try {
    return await load;
  } finally {
    if (bundleLoads.get(roomId) === load) bundleLoads.delete(roomId);
  }
}

export function getPreloadedHarvestQuestion(
  roomId: string,
  questionId: string,
  challengeId: string,
): EnglishCraftMcQuestionClient | null {
  const row = bundles
    .get(roomId)
    ?.harvest.find((question) => question.id === questionId || question.clientId === questionId);
  if (!row) return null;
  return {
    id: row.clientId,
    type: "multiple_choice",
    prompt: row.prompt,
    options: shuffleWithSeed(row.options, `${challengeId}:mc-options`),
  };
}

export function getNextPreloadedHarvestQuestion(
  roomId: string,
  playerId: string,
  cursor: number,
): EnglishCraftMcQuestionClient | null {
  const rows = bundles.get(roomId)?.harvest;
  if (!rows?.length) return null;
  const row = pickQuestionFromSessionDeck(rows, {
    roomId,
    playerId,
    bank: "harvest",
    cursor,
  });
  return {
    id: row.clientId,
    type: "multiple_choice",
    prompt: row.prompt,
    options: shuffleWithSeed(row.options, `${roomId}:${playerId}:harvest:${cursor}:mc-options`),
  };
}

export function getPreloadedCraftQuestion(
  roomId: string,
  questionId: string,
  challengeId: string,
): EnglishCraftCraftQuestionClient | null {
  const row = bundles
    .get(roomId)
    ?.craft.find((question) => question.id === questionId || question.clientId === questionId);
  if (!row) return null;
  return {
    id: row.clientId,
    type: "drag_sentence",
    prompt: row.prompt,
    wordBank: shuffleWithSeed(row.wordBank, `${challengeId}:craft-bank`),
    slotCount: row.slotCount,
  };
}

export function getNextPreloadedCraftQuestion(
  roomId: string,
  playerId: string,
  cursor: number,
): EnglishCraftCraftQuestionClient | null {
  const rows = bundles.get(roomId)?.craft;
  if (!rows?.length) return null;
  const row = pickQuestionFromSessionDeck(rows, {
    roomId,
    playerId,
    bank: "craft",
    cursor,
  });
  return {
    id: row.clientId,
    type: "drag_sentence",
    prompt: row.prompt,
    wordBank: shuffleWithSeed(row.wordBank, `${roomId}:${playerId}:craft:${cursor}:craft-bank`),
    slotCount: row.slotCount,
  };
}

export function clearLiveGameQuestionBundleCacheForTests(): void {
  bundles.clear();
  bundleLoads.clear();
}
