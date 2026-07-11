"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  canStartChallengePrefetch,
  isChallengePrefetchValid,
  type ChallengePrefetchEntry,
} from "@/lib/live-game/challenge-prefetch";
import type { LiveGameChallengeTokenStatus } from "@/lib/live-game/challenge-token-status";
import type { EnglishCraftWoodTreeDef } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import {
  pickMcQuestionForNode,
  toClientMcQuestion,
  type EnglishCraftMcQuestionClient,
} from "@/lib/live-game/modes/english-craft/questions-v1";

type ActiveChallenge = {
  nodeId: string;
  challengeId: string | null;
  question: EnglishCraftMcQuestionClient;
};

type AnswerResult = {
  correct: boolean;
  poolWood: number;
};

type ChallengeTokenPayload = {
  challengeId: string;
  expiresAt: string;
  question: EnglishCraftMcQuestionClient;
};

type Options = {
  roomId: string;
  playerId: string;
  onAnswered?: (result: AnswerResult) => void;
};

function parseChallengePayload(payload: {
  error?: string;
  challengeId?: string;
  expiresAt?: string;
  question?: EnglishCraftMcQuestionClient;
}): ChallengeTokenPayload {
  if (!payload.challengeId || !payload.expiresAt || !payload.question) {
    throw new Error(payload.error ?? "Could not start challenge.");
  }
  return {
    challengeId: payload.challengeId,
    expiresAt: payload.expiresAt,
    question: payload.question,
  };
}

function toPrefetchEntry(
  nodeId: string,
  payload: ChallengeTokenPayload,
  fetchedAt: number,
): ChallengePrefetchEntry<EnglishCraftMcQuestionClient> {
  return {
    nodeId,
    challengeId: payload.challengeId,
    expiresAt: new Date(payload.expiresAt).getTime(),
    question: payload.question,
    fetchedAt,
  };
}

export function useLiveGameWoodChallenge({ roomId, playerId, onAnswered }: Options) {
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge | null>(null);
  const [tokenStatus, setTokenStatus] = useState<LiveGameChallengeTokenStatus>("pending");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<"correct" | "incorrect" | null>(null);
  const beginRequestRef = useRef(0);
  const prefetchCacheRef = useRef<ChallengePrefetchEntry<EnglishCraftMcQuestionClient> | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const prefetchRequestRef = useRef(0);
  const lastPrefetchAtRef = useRef(0);
  const inFlightPrefetchRef = useRef<{
    nodeId: string;
    promise: Promise<ChallengePrefetchEntry<EnglishCraftMcQuestionClient>>;
  } | null>(null);

  const isOpen = activeChallenge != null;

  const clearPrefetchCache = useCallback((nodeId?: string) => {
    if (!nodeId || prefetchCacheRef.current?.nodeId === nodeId) {
      prefetchCacheRef.current = null;
    }
  }, []);

  const cancelPrefetch = useCallback(() => {
    prefetchRequestRef.current += 1;
    prefetchAbortRef.current?.abort();
    prefetchAbortRef.current = null;
    inFlightPrefetchRef.current = null;
  }, []);

  const requestChallengeToken = useCallback(
    async (nodeId: string, signal?: AbortSignal): Promise<ChallengeTokenPayload> => {
      const response = await fetch("/api/live-game/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, nodeId, playerId }),
        signal,
      });
      const payload = (await response.json()) as {
        error?: string;
        challengeId?: string;
        expiresAt?: string;
        question?: EnglishCraftMcQuestionClient;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not start challenge.");
      }
      return parseChallengePayload(payload);
    },
    [playerId, roomId],
  );

  const applyTokenToActiveChallenge = useCallback(
    (treeId: string, payload: ChallengeTokenPayload, previewQuestion: EnglishCraftMcQuestionClient) => {
      setActiveChallenge((current) => {
        if (!current || current.nodeId !== treeId) return current;
        return {
          nodeId: treeId,
          challengeId: payload.challengeId,
          question:
            payload.question.id !== previewQuestion.id ? payload.question : current.question,
        };
      });
      setTokenStatus("ready");
    },
    [],
  );

  const fetchAndCacheToken = useCallback(
    async (
      nodeId: string,
      signal?: AbortSignal,
    ): Promise<ChallengePrefetchEntry<EnglishCraftMcQuestionClient>> => {
      const payload = await requestChallengeToken(nodeId, signal);
      const fetchedAt = Date.now();
      const entry = toPrefetchEntry(nodeId, payload, fetchedAt);
      prefetchCacheRef.current = entry;
      return entry;
    },
    [requestChallengeToken],
  );

  const prefetchForNode = useCallback(
    async (nodeId: string, cooldownEndsAt: number | null | undefined) => {
      const now = Date.now();
      if (
        isChallengePrefetchValid(prefetchCacheRef.current, nodeId, now, { cooldownEndsAt }) ||
        inFlightPrefetchRef.current?.nodeId === nodeId
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

      const promise = fetchAndCacheToken(nodeId, controller.signal);
      inFlightPrefetchRef.current = { nodeId, promise };

      try {
        await promise;
      } catch (prefetchError) {
        if (controller.signal.aborted || prefetchRequestRef.current !== requestId) return;
        clearPrefetchCache(nodeId);
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

  const resolveTokenForNode = useCallback(
    async (
      treeId: string,
      previewQuestion: EnglishCraftMcQuestionClient,
      requestId: number,
      cooldownEndsAt?: number | null,
    ) => {
      const now = Date.now();
      const cached = prefetchCacheRef.current;
      if (isChallengePrefetchValid(cached, treeId, now, { cooldownEndsAt }) && cached) {
        applyTokenToActiveChallenge(treeId, {
          challengeId: cached.challengeId,
          expiresAt: new Date(cached.expiresAt).toISOString(),
          question: cached.question,
        }, previewQuestion);
        return;
      }

      const inFlight = inFlightPrefetchRef.current;
      if (inFlight?.nodeId === treeId) {
        try {
          const entry = await inFlight.promise;
          if (beginRequestRef.current !== requestId) return;
          applyTokenToActiveChallenge(
            treeId,
            {
              challengeId: entry.challengeId,
              expiresAt: new Date(entry.expiresAt).toISOString(),
              question: entry.question,
            },
            previewQuestion,
          );
          return;
        } catch {
          if (beginRequestRef.current !== requestId) return;
        }
      }

      try {
        const entry = await fetchAndCacheToken(treeId);
        if (beginRequestRef.current !== requestId) return;
        applyTokenToActiveChallenge(
          treeId,
          {
            challengeId: entry.challengeId,
            expiresAt: new Date(entry.expiresAt).toISOString(),
            question: entry.question,
          },
          previewQuestion,
        );
      } catch (challengeError) {
        if (beginRequestRef.current !== requestId) return;
        const message =
          challengeError instanceof Error ? challengeError.message : "Could not start challenge.";
        setTokenStatus("error");
        setError(message);
        clearPrefetchCache(treeId);
      }
    },
    [applyTokenToActiveChallenge, clearPrefetchCache, fetchAndCacheToken],
  );

  const beginChallenge = useCallback(
    async (tree: EnglishCraftWoodTreeDef, cooldownEndsAt?: number | null) => {
      const requestId = beginRequestRef.current + 1;
      beginRequestRef.current = requestId;

      setError(null);
      setLastResult(null);

      const previewQuestion = toClientMcQuestion(pickMcQuestionForNode(tree.id));
      const now = Date.now();
      const cached = prefetchCacheRef.current;

      if (isChallengePrefetchValid(cached, tree.id, now, { cooldownEndsAt }) && cached) {
        setActiveChallenge({
          nodeId: tree.id,
          challengeId: cached.challengeId,
          question:
            cached.question.id !== previewQuestion.id ? cached.question : previewQuestion,
        });
        setTokenStatus("ready");
        return;
      }

      setTokenStatus("pending");
      setActiveChallenge({
        nodeId: tree.id,
        challengeId: null,
        question: previewQuestion,
      });

      await resolveTokenForNode(tree.id, previewQuestion, requestId, cooldownEndsAt);
    },
    [resolveTokenForNode],
  );

  const submitAnswer = useCallback(
    async (answer: string) => {
      if (!activeChallenge?.challengeId || tokenStatus !== "ready") return;
      setIsSubmitting(true);
      setError(null);
      try {
        const response = await fetch("/api/live-game/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            challengeId: activeChallenge.challengeId,
            answer,
            playerId,
          }),
        });
        const payload = (await response.json()) as {
          error?: string;
          correct?: boolean;
          poolTotal?: { wood: number };
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not submit answer.");
        }

        const correct = payload.correct === true;
        const poolWood = payload.poolTotal?.wood ?? 0;
        setLastResult(correct ? "correct" : "incorrect");
        onAnswered?.({ correct, poolWood });

        if (correct) {
          clearPrefetchCache(activeChallenge.nodeId);
          setActiveChallenge(null);
          setTokenStatus("pending");
        }
      } catch (answerError) {
        const message =
          answerError instanceof Error ? answerError.message : "Could not submit answer.";
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
      prefetchForNode,
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
      prefetchForNode,
      submitAnswer,
      tokenStatus,
    ],
  );
}
