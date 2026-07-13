"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  canStartChallengePrefetch,
  isChallengePrefetchValid,
  type ChallengePrefetchEntry,
} from "@/lib/live-game/challenge-prefetch";
import { requireLiveGamePositionSync } from "@/lib/live-game/challenge-position-sync";
import {
  getPreloadedHarvestQuestion,
  getPreloadedQuestionBundleVersion,
  getNextPreloadedHarvestQuestion,
} from "@/lib/live-game/question-bundle-cache";
import type { LiveGameChallengeTokenStatus } from "@/lib/live-game/challenge-token-status";
import type { LiveGamePoolTotal } from "@/lib/live-game/api-types";
import type { LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import type { EnglishCraftResourceNodeDef } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import {
  ENGLISH_CRAFT_MC_PREVIEW,
  type EnglishCraftMcQuestionClient,
} from "@/lib/live-game/modes/english-craft/questions-client";

type ActiveChallenge = {
  nodeId: string;
  resourceType: LiveGameResourceType;
  challengeId: string | null;
  question: EnglishCraftMcQuestionClient;
};

type AnswerResult = {
  correct: boolean;
  carryGranted: { type: LiveGameResourceType; sourceNodeId: string } | null;
  poolTotal: LiveGamePoolTotal;
};

type ChallengeTokenPayload = {
  challengeId: string;
  expiresAt: string;
  question: EnglishCraftMcQuestionClient;
};

class PreloadedHarvestQuestionMissError extends Error {}

type Options = {
  roomId: string;
  playerId: string;
  questionCursor: number;
  onAnswered?: (result: AnswerResult) => void;
};

function parseChallengePayload(payload: {
  error?: string;
  challengeId?: string;
  expiresAt?: string;
  question?: EnglishCraftMcQuestionClient;
  questionId?: string;
}, roomId: string): ChallengeTokenPayload {
  if (!payload.challengeId || !payload.expiresAt) {
    throw new Error(payload.error ?? "Could not start challenge.");
  }
  const question =
    payload.question ??
    (payload.questionId ?
      getPreloadedHarvestQuestion(roomId, payload.questionId, payload.challengeId)
    : null);
  if (!question) throw new PreloadedHarvestQuestionMissError("The preloaded question was unavailable.");
  return {
    challengeId: payload.challengeId,
    expiresAt: payload.expiresAt,
    question,
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

export function useLiveGameHarvestChallenge({ roomId, playerId, questionCursor, onAnswered }: Options) {
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
  const submitInFlightRef = useRef(false);
  const interactionPositionSyncRef = useRef<Promise<boolean> | null>(null);

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
      const requestToken = async (questionBundleVersion?: number) => {
        const response = await fetch("/api/live-game/challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, nodeId, questionBundleVersion }),
          signal,
        });
        const payload = (await response.json()) as {
          error?: string;
          challengeId?: string;
          expiresAt?: string;
          questionId?: string;
          question?: EnglishCraftMcQuestionClient;
        };
        if (!response.ok) throw new Error(payload.error ?? "Could not start challenge.");
        return parseChallengePayload(payload, roomId);
      };

      const bundleVersion = getPreloadedQuestionBundleVersion(roomId);
      if (bundleVersion == null) return requestToken();
      try {
        return await requestToken(bundleVersion);
      } catch (error) {
        if (signal?.aborted || !(error instanceof PreloadedHarvestQuestionMissError)) throw error;
        return requestToken();
      }
    },
    [roomId],
  );

  const applyTokenToActiveChallenge = useCallback(
    (
      nodeId: string,
      payload: ChallengeTokenPayload,
      previewQuestion: EnglishCraftMcQuestionClient,
    ) => {
      setActiveChallenge((current) => {
        if (!current || current.nodeId !== nodeId) return current;
        return {
          ...current,
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
      nodeId: string,
      previewQuestion: EnglishCraftMcQuestionClient,
      requestId: number,
      cooldownEndsAt?: number | null,
    ) => {
      const now = Date.now();
      const cached = prefetchCacheRef.current;
      if (isChallengePrefetchValid(cached, nodeId, now, { cooldownEndsAt }) && cached) {
        applyTokenToActiveChallenge(
          nodeId,
          {
            challengeId: cached.challengeId,
            expiresAt: new Date(cached.expiresAt).toISOString(),
            question: cached.question,
          },
          previewQuestion,
        );
        return;
      }

      const inFlight = inFlightPrefetchRef.current;
      if (inFlight?.nodeId === nodeId) {
        try {
          const entry = await inFlight.promise;
          if (beginRequestRef.current !== requestId) return;
          applyTokenToActiveChallenge(
            nodeId,
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
        const entry = await fetchAndCacheToken(nodeId);
        if (beginRequestRef.current !== requestId) return;
        applyTokenToActiveChallenge(
          nodeId,
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
        clearPrefetchCache(nodeId);
      }
    },
    [applyTokenToActiveChallenge, clearPrefetchCache, fetchAndCacheToken],
  );

  const beginChallenge = useCallback(
    async (
      node: EnglishCraftResourceNodeDef,
      cooldownEndsAt?: number | null,
      positionSync?: Promise<boolean>,
    ) => {
      const requestId = beginRequestRef.current + 1;
      beginRequestRef.current = requestId;
      interactionPositionSyncRef.current = positionSync ?? null;

      setError(null);
      setLastResult(null);

      const previewQuestion =
        getNextPreloadedHarvestQuestion(roomId, playerId, questionCursor) ??
        ENGLISH_CRAFT_MC_PREVIEW;
      const now = Date.now();
      const cached = prefetchCacheRef.current;

      if (isChallengePrefetchValid(cached, node.id, now, { cooldownEndsAt }) && cached) {
        setActiveChallenge({
          nodeId: node.id,
          resourceType: node.resourceType,
          challengeId: cached.challengeId,
          question:
            cached.question.id !== previewQuestion.id ? cached.question : previewQuestion,
        });
        setTokenStatus("ready");
        return;
      }

      setTokenStatus("pending");
      setActiveChallenge({
        nodeId: node.id,
        resourceType: node.resourceType,
        challengeId: null,
        question: previewQuestion,
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
      await resolveTokenForNode(node.id, previewQuestion, requestId, cooldownEndsAt);
    },
    [playerId, questionCursor, resolveTokenForNode, roomId],
  );

  const submitAnswer = useCallback(
    async (answer: string, options?: { skip?: boolean }) => {
      if (!activeChallenge?.challengeId || tokenStatus !== "ready" || submitInFlightRef.current) return;
      submitInFlightRef.current = true;
      setIsSubmitting(true);
      setError(null);
      try {
        await requireLiveGamePositionSync(interactionPositionSyncRef.current);
        const response = await fetch("/api/live-game/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            challengeId: activeChallenge.challengeId,
            answer: options?.skip ? "" : answer,
            skip: options?.skip === true,
          }),
        });
        const payload = (await response.json()) as {
          error?: string;
          correct?: boolean;
          carryGranted?: { type: LiveGameResourceType; sourceNodeId: string } | null;
          poolTotal?: LiveGamePoolTotal;
          skipped?: boolean;
        };
        if (response.status === 404) {
          clearPrefetchCache(activeChallenge.nodeId);
          setActiveChallenge(null);
          setTokenStatus("pending");
          setLastResult(null);
          return;
        }
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not submit answer.");
        }

        if (payload.skipped === true) {
          clearPrefetchCache(activeChallenge.nodeId);
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
        setLastResult(correct ? "correct" : "incorrect");
        onAnswered?.({
          correct,
          carryGranted: payload.carryGranted ?? null,
          poolTotal,
        });

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
    void submitAnswer("", { skip: true });
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
      skipChallenge,
      submitAnswer,
      tokenStatus,
    ],
  );
}
