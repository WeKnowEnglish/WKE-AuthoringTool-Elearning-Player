"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  canStartChallengePrefetch,
  isChallengePrefetchValid,
  type ChallengePrefetchEntry,
} from "@/lib/live-game/challenge-prefetch";
import type { LiveGameChallengeTokenStatus } from "@/lib/live-game/challenge-token-status";
import { ENGLISH_CRAFT_CRAFT_BENCH_ID } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import {
  ENGLISH_CRAFT_CRAFT_BRIDGE_V1,
  toClientCraftQuestion,
  type EnglishCraftCraftQuestionClient,
} from "@/lib/live-game/modes/english-craft/questions-v1";

type ActiveCraftChallenge = {
  challengeId: string | null;
  question: EnglishCraftCraftQuestionClient;
};

type CraftAnswerResult = {
  correct: boolean;
  poolWood: number;
  bridgeCrafted: boolean;
};

type CraftTokenPayload = {
  challengeId: string;
  expiresAt: string;
  question: EnglishCraftCraftQuestionClient;
};

type Options = {
  roomId: string;
  playerId: string;
  onAnswered?: (result: CraftAnswerResult) => void;
};

const CRAFT_PREVIEW_QUESTION = toClientCraftQuestion(ENGLISH_CRAFT_CRAFT_BRIDGE_V1);
const CRAFT_NODE_ID = ENGLISH_CRAFT_CRAFT_BENCH_ID;

function parseCraftPayload(payload: {
  error?: string;
  challengeId?: string;
  expiresAt?: string;
  question?: EnglishCraftCraftQuestionClient;
}): CraftTokenPayload {
  if (!payload.challengeId || !payload.expiresAt || !payload.question) {
    throw new Error(payload.error ?? "Could not start craft challenge.");
  }
  return {
    challengeId: payload.challengeId,
    expiresAt: payload.expiresAt,
    question: payload.question,
  };
}

function toCraftPrefetchEntry(
  payload: CraftTokenPayload,
  fetchedAt: number,
): ChallengePrefetchEntry<EnglishCraftCraftQuestionClient> {
  return {
    nodeId: CRAFT_NODE_ID,
    challengeId: payload.challengeId,
    expiresAt: new Date(payload.expiresAt).getTime(),
    question: payload.question,
    fetchedAt,
  };
}

export function useLiveGameCraftChallenge({ roomId, playerId, onAnswered }: Options) {
  const [activeChallenge, setActiveChallenge] = useState<ActiveCraftChallenge | null>(null);
  const [tokenStatus, setTokenStatus] = useState<LiveGameChallengeTokenStatus>("pending");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<"correct" | "incorrect" | null>(null);
  const beginRequestRef = useRef(0);
  const prefetchCacheRef = useRef<ChallengePrefetchEntry<EnglishCraftCraftQuestionClient> | null>(
    null,
  );
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const prefetchRequestRef = useRef(0);
  const lastPrefetchAtRef = useRef(0);
  const inFlightPrefetchRef = useRef<{
    promise: Promise<ChallengePrefetchEntry<EnglishCraftCraftQuestionClient>>;
  } | null>(null);

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
    async (signal?: AbortSignal): Promise<CraftTokenPayload> => {
      const response = await fetch("/api/live-game/craft/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, playerId }),
        signal,
      });
      const payload = (await response.json()) as {
        error?: string;
        challengeId?: string;
        expiresAt?: string;
        question?: EnglishCraftCraftQuestionClient;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not start craft challenge.");
      }
      return parseCraftPayload(payload);
    },
    [playerId, roomId],
  );

  const applyTokenToActiveChallenge = useCallback((payload: CraftTokenPayload) => {
    setActiveChallenge((current) => {
      if (!current) return current;
      return {
        challengeId: payload.challengeId,
        question:
          payload.question.id !== current.question.id ? payload.question : current.question,
      };
    });
    setTokenStatus("ready");
  }, []);

  const fetchAndCacheToken = useCallback(async (signal?: AbortSignal) => {
    const payload = await requestCraftToken(signal);
    const entry = toCraftPrefetchEntry(payload, Date.now());
    prefetchCacheRef.current = entry;
    return entry;
  }, [requestCraftToken]);

  const prefetchChallenge = useCallback(async () => {
    const now = Date.now();
    if (
      isChallengePrefetchValid(prefetchCacheRef.current, CRAFT_NODE_ID, now) ||
      inFlightPrefetchRef.current
    ) {
      return;
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

    const promise = fetchAndCacheToken(controller.signal);
    inFlightPrefetchRef.current = { promise };

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
  }, [clearPrefetchCache, fetchAndCacheToken]);

  const resolveToken = useCallback(
    async (requestId: number) => {
      const now = Date.now();
      const cached = prefetchCacheRef.current;
      if (isChallengePrefetchValid(cached, CRAFT_NODE_ID, now) && cached) {
        applyTokenToActiveChallenge({
          challengeId: cached.challengeId,
          expiresAt: new Date(cached.expiresAt).toISOString(),
          question: cached.question,
        });
        return;
      }

      const inFlight = inFlightPrefetchRef.current;
      if (inFlight) {
        try {
          const entry = await inFlight.promise;
          if (beginRequestRef.current !== requestId) return;
          applyTokenToActiveChallenge({
            challengeId: entry.challengeId,
            expiresAt: new Date(entry.expiresAt).toISOString(),
            question: entry.question,
          });
          return;
        } catch {
          if (beginRequestRef.current !== requestId) return;
        }
      }

      try {
        const entry = await fetchAndCacheToken();
        if (beginRequestRef.current !== requestId) return;
        applyTokenToActiveChallenge({
          challengeId: entry.challengeId,
          expiresAt: new Date(entry.expiresAt).toISOString(),
          question: entry.question,
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

  const beginChallenge = useCallback(async () => {
    const requestId = beginRequestRef.current + 1;
    beginRequestRef.current = requestId;

    setError(null);
    setLastResult(null);

    const now = Date.now();
    const cached = prefetchCacheRef.current;
    if (isChallengePrefetchValid(cached, CRAFT_NODE_ID, now) && cached) {
      setActiveChallenge({
        challengeId: cached.challengeId,
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
      question: CRAFT_PREVIEW_QUESTION,
    });

    await resolveToken(requestId);
  }, [resolveToken]);

  const submitAnswer = useCallback(
    async (order: string[]) => {
      if (!activeChallenge?.challengeId || tokenStatus !== "ready") return;
      setIsSubmitting(true);
      setError(null);
      try {
        const response = await fetch("/api/live-game/craft/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            challengeId: activeChallenge.challengeId,
            playerId,
            order,
          }),
        });
        const payload = (await response.json()) as {
          error?: string;
          correct?: boolean;
          poolTotal?: { wood: number };
          bridgeCrafted?: boolean;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not submit craft answer.");
        }

        const correct = payload.correct === true;
        const poolWood = payload.poolTotal?.wood ?? 0;
        const bridgeCrafted = payload.bridgeCrafted === true;
        setLastResult(correct ? "correct" : "incorrect");
        onAnswered?.({ correct, poolWood, bridgeCrafted });

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
        setIsSubmitting(false);
      }
    },
    [activeChallenge, clearPrefetchCache, onAnswered, playerId, roomId, tokenStatus],
  );

  const closeChallenge = useCallback(() => {
    beginRequestRef.current += 1;
    setActiveChallenge(null);
    setTokenStatus("pending");
    setError(null);
    setLastResult(null);
  }, []);

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
      submitAnswer,
      tokenStatus,
    ],
  );
}
