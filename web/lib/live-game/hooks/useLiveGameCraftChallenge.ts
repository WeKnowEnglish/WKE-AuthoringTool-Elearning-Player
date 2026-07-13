"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  canStartChallengePrefetch,
  isChallengePrefetchValid,
  type ChallengePrefetchEntry,
} from "@/lib/live-game/challenge-prefetch";
import { requireLiveGamePositionSync } from "@/lib/live-game/challenge-position-sync";
import type { LiveGameChallengeTokenStatus } from "@/lib/live-game/challenge-token-status";
import type {
  LiveGameCraftedItems,
  LiveGameResourcePool,
} from "@/lib/live-game/liveblocks/config";
import { ENGLISH_CRAFT_CRAFT_BENCH_ID } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import {
  ENGLISH_CRAFT_CRAFT_PREVIEW,
  type EnglishCraftCraftQuestionClient,
} from "@/lib/live-game/modes/english-craft/questions-client";
import type { CraftRecipeId } from "@/lib/live-game/modes/english-craft/craft-recipes-v1";

type ActiveCraftChallenge = {
  challengeId: string | null;
  question: EnglishCraftCraftQuestionClient;
  recipeId: CraftRecipeId;
  recipeLabel: string;
  costSummary: string;
};

type CraftAnswerResult = {
  correct: boolean;
  poolTotal: LiveGameResourcePool;
  craftedItems: LiveGameCraftedItems;
  recipeId?: CraftRecipeId;
};

type CraftTokenPayload = {
  challengeId: string;
  expiresAt: string;
  question: EnglishCraftCraftQuestionClient;
  recipeId: CraftRecipeId;
  recipeLabel: string;
  costSummary: string;
};

type CraftPrefetchEntry = ChallengePrefetchEntry<EnglishCraftCraftQuestionClient> & {
  recipeId: CraftRecipeId;
  recipeLabel: string;
  costSummary: string;
};

type Options = {
  roomId: string;
  onAnswered?: (result: CraftAnswerResult) => void;
};

const CRAFT_PREVIEW_QUESTION = ENGLISH_CRAFT_CRAFT_PREVIEW;
const CRAFT_NODE_ID = ENGLISH_CRAFT_CRAFT_BENCH_ID;

function parseCraftPayload(
  payload: {
    error?: string;
    challengeId?: string;
    expiresAt?: string;
    question?: EnglishCraftCraftQuestionClient;
    recipeId?: CraftRecipeId;
    recipeLabel?: string;
    costSummary?: string;
  },
  recipeId: CraftRecipeId,
): CraftTokenPayload {
  if (!payload.challengeId || !payload.expiresAt || !payload.question) {
    throw new Error(payload.error ?? "Could not start craft challenge.");
  }
  return {
    challengeId: payload.challengeId,
    expiresAt: payload.expiresAt,
    question: payload.question,
    recipeId: payload.recipeId ?? recipeId,
    recipeLabel: payload.recipeLabel ?? "Craft",
    costSummary: payload.costSummary ?? "",
  };
}

function isCraftPrefetchValid(
  entry: CraftPrefetchEntry | null | undefined,
  recipeId: CraftRecipeId,
  now: number,
): entry is CraftPrefetchEntry {
  return (
    entry != null &&
    entry.recipeId === recipeId &&
    isChallengePrefetchValid(entry, CRAFT_NODE_ID, now)
  );
}

function toCraftPrefetchEntry(
  payload: CraftTokenPayload,
  fetchedAt: number,
): CraftPrefetchEntry {
  return {
    nodeId: CRAFT_NODE_ID,
    recipeId: payload.recipeId,
    recipeLabel: payload.recipeLabel,
    costSummary: payload.costSummary,
    challengeId: payload.challengeId,
    expiresAt: new Date(payload.expiresAt).getTime(),
    question: payload.question,
    fetchedAt,
  };
}

export function useLiveGameCraftChallenge({ roomId, onAnswered }: Options) {
  const [activeChallenge, setActiveChallenge] = useState<ActiveCraftChallenge | null>(null);
  const [tokenStatus, setTokenStatus] = useState<LiveGameChallengeTokenStatus>("pending");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<"correct" | "incorrect" | null>(null);
  const beginRequestRef = useRef(0);
  const prefetchCacheRef = useRef<CraftPrefetchEntry | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const prefetchRequestRef = useRef(0);
  const lastPrefetchAtRef = useRef(0);
  const inFlightPrefetchRef = useRef<{
    recipeId: CraftRecipeId;
    promise: Promise<CraftPrefetchEntry>;
  } | null>(null);
  const submitInFlightRef = useRef(false);
  const interactionPositionSyncRef = useRef<Promise<boolean> | null>(null);

  const isOpen = activeChallenge != null;

  const clearPrefetchCache = useCallback(() => {
    prefetchCacheRef.current = null;
  }, []);

  const cancelPrefetch = useCallback(() => {
    prefetchRequestRef.current += 1;
    prefetchAbortRef.current?.abort();
    prefetchAbortRef.current = null;
    inFlightPrefetchRef.current = null;
  }, []);

  const requestCraftToken = useCallback(
    async (recipeId: CraftRecipeId, signal?: AbortSignal): Promise<CraftTokenPayload> => {
      const response = await fetch("/api/live-game/craft/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, recipeId }),
        signal,
      });
      const payload = (await response.json()) as {
        error?: string;
        challengeId?: string;
        expiresAt?: string;
        question?: EnglishCraftCraftQuestionClient;
        recipeId?: CraftRecipeId;
        recipeLabel?: string;
        costSummary?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not start craft challenge.");
      }
      return parseCraftPayload(payload, recipeId);
    },
    [roomId],
  );

  const applyTokenToActiveChallenge = useCallback((payload: CraftTokenPayload) => {
    setActiveChallenge((current) => {
      if (!current) return current;
      return {
        challengeId: payload.challengeId,
        recipeId: payload.recipeId,
        recipeLabel: payload.recipeLabel,
        costSummary: payload.costSummary,
        question:
          payload.question.id !== current.question.id ? payload.question : current.question,
      };
    });
    setTokenStatus("ready");
  }, []);

  const fetchAndCacheToken = useCallback(
    async (recipeId: CraftRecipeId, signal?: AbortSignal) => {
      const payload = await requestCraftToken(recipeId, signal);
      const entry = toCraftPrefetchEntry(payload, Date.now());
      prefetchCacheRef.current = entry;
      return entry;
    },
    [requestCraftToken],
  );

  const prefetchChallenge = useCallback(
    async (recipeId: CraftRecipeId) => {
      const now = Date.now();
      if (isCraftPrefetchValid(prefetchCacheRef.current, recipeId, now)) {
        return;
      }
      if (
        inFlightPrefetchRef.current?.recipeId === recipeId ||
        (inFlightPrefetchRef.current != null && inFlightPrefetchRef.current.recipeId !== recipeId)
      ) {
        if (inFlightPrefetchRef.current?.recipeId === recipeId) return;
      }
      if (!canStartChallengePrefetch(lastPrefetchAtRef.current, now)) {
        return;
      }

      const requestId = prefetchRequestRef.current + 1;
      prefetchRequestRef.current = requestId;
      prefetchAbortRef.current?.abort();

      const controller = new AbortController();
      prefetchAbortRef.current = controller;
      lastPrefetchAtRef.current = now;

      const promise = fetchAndCacheToken(recipeId, controller.signal);
      inFlightPrefetchRef.current = { recipeId, promise };

      try {
        await promise;
      } catch (prefetchError) {
        if (controller.signal.aborted || prefetchRequestRef.current !== requestId) return;
        clearPrefetchCache();
        if (prefetchError instanceof Error && prefetchError.name === "AbortError") return;
      } finally {
        if (inFlightPrefetchRef.current?.promise === promise) {
          inFlightPrefetchRef.current = null;
        }
        if (prefetchAbortRef.current === controller) {
          prefetchAbortRef.current = null;
        }
      }
    },
    [clearPrefetchCache, fetchAndCacheToken],
  );

  const resolveToken = useCallback(
    async (requestId: number, recipeId: CraftRecipeId) => {
      const now = Date.now();
      const cached = prefetchCacheRef.current;
      if (isCraftPrefetchValid(cached, recipeId, now)) {
        applyTokenToActiveChallenge({
          challengeId: cached.challengeId,
          expiresAt: new Date(cached.expiresAt).toISOString(),
          question: cached.question,
          recipeId: cached.recipeId,
          recipeLabel: cached.recipeLabel,
          costSummary: cached.costSummary,
        });
        return;
      }

      const inFlight = inFlightPrefetchRef.current;
      if (inFlight?.recipeId === recipeId) {
        try {
          const entry = await inFlight.promise;
          if (beginRequestRef.current !== requestId) return;
          applyTokenToActiveChallenge({
            challengeId: entry.challengeId,
            expiresAt: new Date(entry.expiresAt).toISOString(),
            question: entry.question,
            recipeId: entry.recipeId,
            recipeLabel: entry.recipeLabel,
            costSummary: entry.costSummary,
          });
          return;
        } catch {
          if (beginRequestRef.current !== requestId) return;
        }
      }

      try {
        const entry = await fetchAndCacheToken(recipeId);
        if (beginRequestRef.current !== requestId) return;
        applyTokenToActiveChallenge({
          challengeId: entry.challengeId,
          expiresAt: new Date(entry.expiresAt).toISOString(),
          question: entry.question,
          recipeId: entry.recipeId,
          recipeLabel: entry.recipeLabel,
          costSummary: entry.costSummary,
        });
      } catch (challengeError) {
        if (beginRequestRef.current !== requestId) return;
        const message =
          challengeError instanceof Error ? challengeError.message : "Could not start craft challenge.";
        setTokenStatus("error");
        setError(message);
        clearPrefetchCache();
      }
    },
    [applyTokenToActiveChallenge, clearPrefetchCache, fetchAndCacheToken],
  );

  const beginChallenge = useCallback(
    async (
      recipeId: CraftRecipeId,
      recipeLabel = "Craft",
      costSummary = "",
      positionSync?: Promise<boolean>,
    ) => {
      const requestId = beginRequestRef.current + 1;
      beginRequestRef.current = requestId;
      interactionPositionSyncRef.current = positionSync ?? null;

      setError(null);
      setLastResult(null);

      const now = Date.now();
      const cached = prefetchCacheRef.current;
      if (isCraftPrefetchValid(cached, recipeId, now)) {
        setActiveChallenge({
          challengeId: cached.challengeId,
          recipeId: cached.recipeId,
          recipeLabel: cached.recipeLabel,
          costSummary: cached.costSummary,
          question:
            cached.question.id !== CRAFT_PREVIEW_QUESTION.id ?
              cached.question
            : CRAFT_PREVIEW_QUESTION,
        });
        setTokenStatus("ready");
        return;
      }

      setTokenStatus("pending");
      setActiveChallenge({
        challengeId: null,
        recipeId,
        recipeLabel,
        costSummary,
        question: CRAFT_PREVIEW_QUESTION,
      });

      try {
        await requireLiveGamePositionSync(positionSync);
      } catch (positionError) {
        if (beginRequestRef.current !== requestId) return;
        setTokenStatus("error");
        setError(
          positionError instanceof Error ? positionError.message : "Could not verify your position.",
        );
        return;
      }
      if (beginRequestRef.current !== requestId) return;
      await resolveToken(requestId, recipeId);
    },
    [resolveToken],
  );

  const submitAnswer = useCallback(
    async (order: string[], options?: { skip?: boolean }) => {
      if (!activeChallenge?.challengeId || tokenStatus !== "ready" || submitInFlightRef.current) return;
      submitInFlightRef.current = true;
      setIsSubmitting(true);
      setError(null);
      try {
        await requireLiveGamePositionSync(interactionPositionSyncRef.current);
        const response = await fetch("/api/live-game/craft/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            challengeId: activeChallenge.challengeId,
            recipeId: activeChallenge.recipeId,
            order: options?.skip ? [] : order,
            skip: options?.skip === true,
          }),
        });
        const payload = (await response.json()) as {
          error?: string;
          correct?: boolean;
          poolTotal?: LiveGameResourcePool;
          craftedItems?: LiveGameCraftedItems;
          recipeId?: CraftRecipeId;
          skipped?: boolean;
        };
        if (response.status === 404) {
          clearPrefetchCache();
          setActiveChallenge(null);
          setTokenStatus("pending");
          setLastResult(null);
          return;
        }
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not submit craft answer.");
        }

        if (payload.skipped === true) {
          clearPrefetchCache();
          setActiveChallenge(null);
          setTokenStatus("pending");
          setLastResult(null);
          return;
        }
        const correct = payload.correct === true;
        const poolTotal = payload.poolTotal ?? {
          wood: 0,
          stone: 0,
          wheat: 0,
          cotton: 0,
        };
        const craftedItems = payload.craftedItems ?? {
          benchBuilt: false,
          hammers: 0,
          boat: false,
        };
        setLastResult(correct ? "correct" : "incorrect");
        onAnswered?.({
          correct,
          poolTotal,
          craftedItems,
          recipeId: payload.recipeId ?? activeChallenge.recipeId,
        });

        if (correct) {
          clearPrefetchCache();
          setActiveChallenge(null);
          setTokenStatus("pending");
        }
      } catch (answerError) {
        const message =
          answerError instanceof Error ? answerError.message : "Could not submit craft answer.";
        setError(message);
      } finally {
        submitInFlightRef.current = false;
        setIsSubmitting(false);
      }
    },
    [activeChallenge, clearPrefetchCache, onAnswered, roomId, tokenStatus],
  );

  const closeChallenge = useCallback(() => {
    beginRequestRef.current += 1;
    interactionPositionSyncRef.current = null;
    setActiveChallenge(null);
    setTokenStatus("pending");
    setError(null);
    setLastResult(null);
  }, []);

  const skipChallenge = useCallback(() => {
    void submitAnswer([], { skip: true });
  }, [submitAnswer]);

  return useMemo(
    () => ({
      activeChallenge,
      isOpen,
      tokenStatus,
      isSubmitting,
      error,
      lastResult,
      beginChallenge,
      submitAnswer,
      skipChallenge,
      closeChallenge,
      prefetchChallenge,
      cancelPrefetch,
      clearPrefetchCache,
    }),
    [
      activeChallenge,
      beginChallenge,
      cancelPrefetch,
      clearPrefetchCache,
      closeChallenge,
      error,
      isOpen,
      isSubmitting,
      lastResult,
      prefetchChallenge,
      skipChallenge,
      submitAnswer,
      tokenStatus,
    ],
  );
}
