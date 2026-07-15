"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildChallengePrefetchKey,
  hashChallengePrefetchKey,
  type ChallengePrefetchEntry,
} from "@/lib/live-game/challenge-prefetch";
import { LiveGameChallengePrefetchController } from "@/lib/live-game/challenge-prefetch-controller";
import {
  positionSyncInteractionFields,
  requireLiveGamePositionSync,
} from "@/lib/live-game/challenge-position-sync";
import type { PositionSyncResult } from "@/lib/live-game/interaction-position-sync-controller";
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
import { createLiveGameSubmissionId } from "@/lib/live-game/submission-id";
import { openLiveGameQuestionEncounter } from "@/lib/live-game/open-question-encounter";
import { diagnosticFetch, recordLiveGameDiagnostic } from "@/lib/live-game/diagnostics/client";

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
  const controllerRef = useRef(
    new LiveGameChallengePrefetchController<EnglishCraftMcQuestionClient>(),
  );
  const submitInFlightRef = useRef(false);
  const interactionPositionSyncRef = useRef<Promise<boolean | PositionSyncResult> | null>(null);
  const encounterOpenRef = useRef<Promise<void> | null>(null);
  const challengeOpenedAtRef = useRef(0);
  const pendingSubmissionRef = useRef<{ challengeId: string; answerKey: string; id: string; responseTimeMs: number } | null>(null);

  const isOpen = activeChallenge != null;

  const ensureController = useCallback(() => {
    const current = controllerRef.current;
    if (!current.isDisposed()) return current;
    const replacement = new LiveGameChallengePrefetchController<EnglishCraftMcQuestionClient>();
    controllerRef.current = replacement;
    return replacement;
  }, []);

  const buildKey = useCallback(
    (nodeId: string) =>
      buildChallengePrefetchKey({
        roomId,
        activity: "harvest",
        targetId: nodeId,
        playerId,
        questionBundleVersion: getPreloadedQuestionBundleVersion(roomId),
      }),
    [playerId, roomId],
  );

  useEffect(() => {
    const controllerAtMount = ensureController();
    return () => {
      controllerAtMount.dispose();
    };
  }, [ensureController]);

  useEffect(() => {
    ensureController().cancelAll("room_change");
  }, [ensureController, roomId, playerId]);

  const clearPrefetchCache = useCallback(
    (nodeId?: string) => {
      const controller = ensureController();
      if (nodeId) {
        controller.invalidateTarget(nodeId);
      } else {
        controller.cancelAll("session_change");
      }
    },
    [ensureController],
  );

  const cancelPrefetch = useCallback(() => {
    ensureController().cancelAll("session_change");
  }, [ensureController]);

  const releasePrefetchFocus = useCallback(() => {
    ensureController().releaseFocus();
  }, [ensureController]);

  const requestChallengeToken = useCallback(
    async (
      nodeId: string,
      signal?: AbortSignal,
      prefetchMeta?: { keyHash: string; prefetchOutcome: string },
    ): Promise<ChallengeTokenPayload> => {
      const requestToken = async (questionBundleVersion?: number) => {
        const response = await diagnosticFetch("/api/live-game/challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, nodeId, questionBundleVersion, prefetch: Boolean(signal) }),
          signal,
        }, {
          phase: "gameplay",
          name: "harvest_question_request",
          detail: {
            nodeId,
            prefetched: Boolean(signal),
            prefetchKeyHash: prefetchMeta?.keyHash,
            prefetchOutcome: prefetchMeta?.prefetchOutcome,
          },
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

  const fetchTokenEntry = useCallback(
    async (
      nodeId: string,
      signal: AbortSignal,
      prefetchMeta: { keyHash: string; prefetchOutcome: string },
    ): Promise<ChallengePrefetchEntry<EnglishCraftMcQuestionClient>> => {
      const payload = await requestChallengeToken(nodeId, signal, prefetchMeta);
      return toPrefetchEntry(nodeId, payload, Date.now());
    },
    [requestChallengeToken],
  );

  const prefetchForNode = useCallback(
    async (nodeId: string, cooldownEndsAt: number | null | undefined) => {
      const now = Date.now();
      if (cooldownEndsAt != null && cooldownEndsAt > now) return;

      const key = buildKey(nodeId);
      const keyHash = hashChallengePrefetchKey(key);
      let requestReachedFetch = false;
      let prefetchEntryCreated = false;
      let prefetchStored = false;
      const result = await ensureController().ensure({
        key,
        targetId: nodeId,
        now,
        validity: { cooldownEndsAt },
        fetcher: async (signal) => {
          requestReachedFetch = true;
          const entry = await fetchTokenEntry(nodeId, signal, {
            keyHash,
            prefetchOutcome: "started",
          });
          prefetchEntryCreated = true;
          return entry;
        },
      });
      if (result.outcome === "retained" && result.entry) {
        prefetchStored = true;
      }
      if (result.promise) {
        try {
          await result.promise;
          prefetchStored = true;
        } catch (prefetchError) {
          if (prefetchError instanceof Error && prefetchError.name === "AbortError") {
            recordLiveGameDiagnostic("gameplay", "harvest_prefetch", {
              nodeId,
              prefetchKeyHash: result.keyHash,
              prefetchOutcome: "failed",
              prefetchFailReason: "request_aborted",
              cancelReason: result.cancelReason ?? "failed",
              requestCallbackInvoked: result.requestCallbackInvoked ?? false,
              requestReachedFetch,
              prefetchEntryCreated,
              prefetchStored: false,
              prefetched: true,
            });
            return;
          }
          recordLiveGameDiagnostic("gameplay", "harvest_prefetch", {
            nodeId,
            prefetchKeyHash: result.keyHash,
            prefetchOutcome: "failed",
            prefetchFailReason: result.prefetchFailReason ?? "request_http_error",
            cancelReason: result.cancelReason ?? null,
            requestCallbackInvoked: result.requestCallbackInvoked ?? false,
            requestReachedFetch,
            prefetchEntryCreated,
            prefetchStored: false,
            prefetched: true,
          });
          return;
        }
      }

      recordLiveGameDiagnostic("gameplay", "harvest_prefetch", {
        nodeId,
        prefetchKeyHash: result.keyHash,
        prefetchOutcome: result.outcome,
        prefetchFailReason: result.prefetchFailReason ?? null,
        cancelReason: result.cancelReason ?? null,
        requestCallbackInvoked: result.requestCallbackInvoked ?? false,
        requestReachedFetch,
        prefetchEntryCreated,
        prefetchStored,
        prefetched: true,
        inFlightAgeMs: result.inFlightAgeMs ?? null,
        challengeRemainingValidityMs: result.challengeRemainingValidityMs ?? null,
        prefetchRemainingValidityMs: result.challengeRemainingValidityMs ?? null,
      });
    },
    [buildKey, ensureController, fetchTokenEntry],
  );

  const resolveTokenForNode = useCallback(
    async (
      nodeId: string,
      previewQuestion: EnglishCraftMcQuestionClient,
      requestId: number,
      cooldownEndsAt?: number | null,
    ) => {
      const now = Date.now();
      const key = buildKey(nodeId);
      const lookup = ensureController().lookupInteraction(key, nodeId, now, { cooldownEndsAt });

      if (lookup.entry) {
        applyTokenToActiveChallenge(
          nodeId,
          {
            challengeId: lookup.entry.challengeId,
            expiresAt: new Date(lookup.entry.expiresAt).toISOString(),
            question: lookup.entry.question,
          },
          previewQuestion,
        );
        const encounterOpen = openLiveGameQuestionEncounter({
          roomId,
          challengeId: lookup.entry.challengeId,
        });
        encounterOpenRef.current = encounterOpen;
        void encounterOpen.catch((openError) => {
          if (beginRequestRef.current === requestId) {
            setTokenStatus("error");
            setError(openError instanceof Error ? openError.message : "Could not open challenge.");
          }
        });
        return;
      }

      if (lookup.promise) {
        try {
          const entry = await lookup.promise;
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
          const encounterOpen = openLiveGameQuestionEncounter({ roomId, challengeId: entry.challengeId });
          encounterOpenRef.current = encounterOpen;
          void encounterOpen.catch((openError) => {
            if (beginRequestRef.current === requestId) {
              setTokenStatus("error");
              setError(openError instanceof Error ? openError.message : "Could not open challenge.");
            }
          });
          return;
        } catch {
          if (beginRequestRef.current !== requestId) return;
        }
      }

      try {
        const keyHash = hashChallengePrefetchKey(key);
        const payload = await requestChallengeToken(nodeId, undefined, {
          keyHash,
          prefetchOutcome: "started",
        });
        const entry = toPrefetchEntry(nodeId, payload, Date.now());
        if (beginRequestRef.current !== requestId) return;
        applyTokenToActiveChallenge(nodeId, payload, previewQuestion);
        void entry;
      } catch (challengeError) {
        if (beginRequestRef.current !== requestId) return;
        const message =
          challengeError instanceof Error ? challengeError.message : "Could not start challenge.";
        setTokenStatus("error");
        setError(message);
        clearPrefetchCache(nodeId);
      }
    },
    [applyTokenToActiveChallenge, buildKey, clearPrefetchCache, ensureController, requestChallengeToken, roomId],
  );

  const beginChallenge = useCallback(
    async (
      node: EnglishCraftResourceNodeDef,
      cooldownEndsAt?: number | null,
      positionSync?: Promise<boolean | PositionSyncResult>,
    ) => {
      const requestId = beginRequestRef.current + 1;
      beginRequestRef.current = requestId;
      interactionPositionSyncRef.current = positionSync ?? null;
      challengeOpenedAtRef.current = Date.now();

      setError(null);
      setLastResult(null);

      const previewQuestion =
        getNextPreloadedHarvestQuestion(roomId, playerId, questionCursor) ??
        ENGLISH_CRAFT_MC_PREVIEW;
      const now = Date.now();
      const key = buildKey(node.id);
      const controller = ensureController();
      controller.setFocus(key);
      const lookup = controller.lookupInteraction(key, node.id, now, { cooldownEndsAt });

      recordLiveGameDiagnostic("gameplay", "harvest_interaction", {
        nodeId: node.id,
        cacheState: lookup.cacheState,
        prefetchKeyHash: lookup.keyHash,
        prefetchOutcome: lookup.outcome,
        retentionAgeMs: lookup.retentionAgeMs,
        inFlightAgeMs: lookup.inFlightAgeMs,
        challengeRemainingValidityMs: lookup.challengeRemainingValidityMs,
        sameTargetReturn: lookup.cacheState !== "cold",
        waitedForPositionSync: false,
        positionWaitMs: 0,
      });
      if (lookup.entry) {
        setActiveChallenge({
          nodeId: node.id,
          resourceType: node.resourceType,
          challengeId: lookup.entry.challengeId,
          question:
            lookup.entry.question.id !== previewQuestion.id ? lookup.entry.question : previewQuestion,
        });
        setTokenStatus("ready");
        const encounterOpen = openLiveGameQuestionEncounter({
          roomId,
          challengeId: lookup.entry.challengeId,
        });
        encounterOpenRef.current = encounterOpen;
        void encounterOpen.catch((openError) => {
          if (beginRequestRef.current === requestId) {
            setTokenStatus("error");
            setError(openError instanceof Error ? openError.message : "Could not open challenge.");
          }
        });
        return;
      }

      if (lookup.promise) {
        setTokenStatus("pending");
        setActiveChallenge({
          nodeId: node.id,
          resourceType: node.resourceType,
          challengeId: null,
          question: previewQuestion,
        });
        try {
          const entry = await lookup.promise;
          if (beginRequestRef.current !== requestId) return;
          applyTokenToActiveChallenge(
            node.id,
            {
              challengeId: entry.challengeId,
              expiresAt: new Date(entry.expiresAt).toISOString(),
              question: entry.question,
            },
            previewQuestion,
          );
          const encounterOpen = openLiveGameQuestionEncounter({ roomId, challengeId: entry.challengeId });
          encounterOpenRef.current = encounterOpen;
          void encounterOpen.catch((openError) => {
            if (beginRequestRef.current === requestId) {
              setTokenStatus("error");
              setError(openError instanceof Error ? openError.message : "Could not open challenge.");
            }
          });
        } catch (challengeError) {
          if (beginRequestRef.current !== requestId) return;
          try {
            const positionDetail = await requireLiveGamePositionSync(positionSync);
            recordLiveGameDiagnostic("gameplay", "harvest_interaction", {
              nodeId: node.id,
              cacheState: lookup.cacheState,
              ...positionSyncInteractionFields(positionDetail),
            });
            if (beginRequestRef.current !== requestId) return;
            await resolveTokenForNode(node.id, previewQuestion, requestId, cooldownEndsAt);
          } catch (positionError) {
            if (beginRequestRef.current !== requestId) return;
            setTokenStatus("error");
            setError(
              positionError instanceof Error ? positionError.message
              : challengeError instanceof Error ? challengeError.message
              : "Could not start challenge.",
            );
          }
        }
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
        const positionDetail = await requireLiveGamePositionSync(positionSync);
        recordLiveGameDiagnostic("gameplay", "harvest_interaction", {
          nodeId: node.id,
          cacheState: lookup.cacheState,
          ...positionSyncInteractionFields(positionDetail),
        });
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
    [
      applyTokenToActiveChallenge,
      buildKey,
      ensureController,
      playerId,
      questionCursor,
      resolveTokenForNode,
      roomId,
    ],
  );

  const submitAnswer = useCallback(
    async (answer: string, options?: { skip?: boolean }) => {
      if (!activeChallenge?.challengeId || tokenStatus !== "ready" || submitInFlightRef.current) return;
      const clickAt = performance.now();
      submitInFlightRef.current = true;
      setIsSubmitting(true);
      setLastResult(null);
      setError(null);
      recordLiveGameDiagnostic("gameplay", "answer_submit_clicked", {
        questionType: "harvest",
        recipeOrNodeId: activeChallenge.nodeId,
      });
      try {
        await requireLiveGamePositionSync(interactionPositionSyncRef.current);
        await encounterOpenRef.current;
        const answerKey = options?.skip ? "skip" : answer;
        const pending = pendingSubmissionRef.current;
        const submission = pending?.challengeId === activeChallenge.challengeId && pending.answerKey === answerKey ? pending : {
          challengeId: activeChallenge.challengeId,
          answerKey,
          id: createLiveGameSubmissionId(),
          responseTimeMs: Date.now() - challengeOpenedAtRef.current,
        };
        pendingSubmissionRef.current = submission;
        recordLiveGameDiagnostic("gameplay", "question_attempt", {
          questionType: "harvest",
          questionId: activeChallenge.question.id,
          questionPrompt: activeChallenge.question.prompt,
          gameObjectId: activeChallenge.nodeId,
          challengeId: activeChallenge.challengeId,
          action: options?.skip ? "skip" : "answer",
          selectedAnswer: options?.skip ? null : answer,
        });
        recordLiveGameDiagnostic("gameplay", "answer_request_started", {
          questionType: "harvest",
          clickToRequestMs: Math.round(performance.now() - clickAt),
        });
        const response = await diagnosticFetch("/api/live-game/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            challengeId: activeChallenge.challengeId,
            answer: options?.skip ? "" : answer,
            skip: options?.skip === true,
            submissionId: submission.id,
            responseTimeMs: submission.responseTimeMs,
          }),
        }, { phase: "gameplay", name: "harvest_answer_request", detail: { skipped: options?.skip === true, responseTimeMs: submission.responseTimeMs } });
        recordLiveGameDiagnostic("gameplay", "answer_headers_received", {
          questionType: "harvest",
          status: response.status,
          clickToHeadersMs: Math.round(performance.now() - clickAt),
        });
        const payload = (await response.json()) as {
          error?: string;
          correct?: boolean;
          carryGranted?: { type: LiveGameResourceType; sourceNodeId: string } | null;
          poolTotal?: LiveGamePoolTotal;
          skipped?: boolean;
          alreadyAwarded?: boolean;
        };
        recordLiveGameDiagnostic("gameplay", "answer_body_parsed", {
          questionType: "harvest",
          clickToBodyMs: Math.round(performance.now() - clickAt),
        });
        if (response.status === 404) {
          pendingSubmissionRef.current = null;
          ensureController().consume(buildKey(activeChallenge.nodeId));
          setActiveChallenge(null);
          setTokenStatus("pending");
          setLastResult(null);
          return;
        }
        if (!response.ok) {
          recordLiveGameDiagnostic("gameplay", "question_attempt_rejected", {
            questionType: "harvest",
            questionId: activeChallenge.question.id,
            gameObjectId: activeChallenge.nodeId,
            challengeId: activeChallenge.challengeId,
            action: options?.skip ? "skip" : "answer",
            status: response.status,
            message: payload.error ?? "Could not submit answer.",
          }, { kind: "error" });
          throw new Error(payload.error ?? "Could not submit answer.");
        }
        pendingSubmissionRef.current = null;

        if (payload.skipped === true) {
          ensureController().consume(buildKey(activeChallenge.nodeId));
          setActiveChallenge(null);
          setTokenStatus("pending");
          setLastResult(null);
          return;
        }
        const correct = payload.correct === true;
        const authoritativeAt = performance.now();
        recordLiveGameDiagnostic("gameplay", "authoritative_result_received", {
          questionType: "harvest",
          correct,
          alreadyAwarded: payload.alreadyAwarded === true,
          clickToAuthoritativeMs: Math.round(authoritativeAt - clickAt),
        });
        recordLiveGameDiagnostic("gameplay", "question_attempt_result", {
          questionType: "harvest",
          questionId: activeChallenge.question.id,
          gameObjectId: activeChallenge.nodeId,
          challengeId: activeChallenge.challengeId,
          action: options?.skip ? "skip" : "answer",
          correct,
        });
        setLastResult(correct ? "correct" : "incorrect");
        recordLiveGameDiagnostic("gameplay", "result_state_committed", {
          questionType: "harvest",
          correct,
          authoritativeToCommittedMs: Math.round(performance.now() - authoritativeAt),
        });
        recordLiveGameDiagnostic("gameplay", "harvest_result_visible", {
          correct,
          clickToVisibleMs: Math.round(performance.now() - clickAt),
          authoritativeToVisibleMs: Math.round(performance.now() - authoritativeAt),
        });
        recordLiveGameDiagnostic("gameplay", "result_visible", {
          questionType: "harvest",
          correct,
          clickToVisibleMs: Math.round(performance.now() - clickAt),
          authoritativeToVisibleMs: Math.round(performance.now() - authoritativeAt),
        });
        const poolTotal = payload.poolTotal ?? {
          wood: 0,
          stone: 0,
          wheat: 0,
          cotton: 0,
        };
        onAnswered?.({
          correct,
          carryGranted: payload.carryGranted ?? null,
          poolTotal,
        });
        recordLiveGameDiagnostic("gameplay", "liveblocks_reconciled", {
          questionType: "harvest",
          note: "storage_updates_via_subscription",
          visibleToReconcileMs: 0,
        });

        if (correct) {
          ensureController().consume(buildKey(activeChallenge.nodeId));
          setActiveChallenge(null);
          setTokenStatus("pending");
        } else {
          challengeOpenedAtRef.current = Date.now();
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
    [activeChallenge, buildKey, ensureController, onAnswered, roomId, tokenStatus],
  );

  const closeChallenge = useCallback(() => {
    beginRequestRef.current += 1;
    interactionPositionSyncRef.current = null;
    encounterOpenRef.current = null;
    pendingSubmissionRef.current = null;
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
      releasePrefetchFocus,
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
      releasePrefetchFocus,
      skipChallenge,
      submitAnswer,
      tokenStatus,
    ],
  );
}
