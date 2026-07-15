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
  getPreloadedCraftQuestion,
  getPreloadedQuestionBundleVersion,
  getNextPreloadedCraftQuestion,
} from "@/lib/live-game/question-bundle-cache";
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
import { createLiveGameSubmissionId } from "@/lib/live-game/submission-id";
import { openLiveGameQuestionEncounter } from "@/lib/live-game/open-question-encounter";
import { diagnosticFetch, recordLiveGameDiagnostic } from "@/lib/live-game/diagnostics/client";

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

class PreloadedCraftQuestionMissError extends Error {}

type CraftPrefetchEntry = ChallengePrefetchEntry<EnglishCraftCraftQuestionClient> & {
  recipeId: CraftRecipeId;
  recipeLabel: string;
  costSummary: string;
};

type Options = {
  roomId: string;
  playerId: string;
  questionCursor: number;
  onAnswered?: (result: CraftAnswerResult) => void;
};

const CRAFT_PREVIEW_QUESTION = ENGLISH_CRAFT_CRAFT_PREVIEW;
const CRAFT_MACHINE_ID = ENGLISH_CRAFT_CRAFT_BENCH_ID;

function parseCraftPayload(
  payload: {
    error?: string;
    challengeId?: string;
    expiresAt?: string;
    question?: EnglishCraftCraftQuestionClient;
    questionId?: string;
    recipeId?: CraftRecipeId;
    recipeLabel?: string;
    costSummary?: string;
  },
  recipeId: CraftRecipeId,
  roomId: string,
): CraftTokenPayload {
  if (!payload.challengeId || !payload.expiresAt) {
    throw new Error(payload.error ?? "Could not start craft challenge.");
  }
  const question =
    payload.question ??
    (payload.questionId ?
      getPreloadedCraftQuestion(roomId, payload.questionId, payload.challengeId)
    : null);
  if (!question) throw new PreloadedCraftQuestionMissError("The preloaded craft question was unavailable.");
  return {
    challengeId: payload.challengeId,
    expiresAt: payload.expiresAt,
    question,
    recipeId: payload.recipeId ?? recipeId,
    recipeLabel: payload.recipeLabel ?? "Craft",
    costSummary: payload.costSummary ?? "",
  };
}

function toCraftPrefetchEntry(
  payload: CraftTokenPayload,
  fetchedAt: number,
): CraftPrefetchEntry {
  return {
    nodeId: CRAFT_MACHINE_ID,
    recipeId: payload.recipeId,
    recipeLabel: payload.recipeLabel,
    costSummary: payload.costSummary,
    challengeId: payload.challengeId,
    expiresAt: new Date(payload.expiresAt).getTime(),
    question: payload.question,
    fetchedAt,
  };
}

export function useLiveGameCraftChallenge({ roomId, playerId, questionCursor, onAnswered }: Options) {
  const [activeChallenge, setActiveChallenge] = useState<ActiveCraftChallenge | null>(null);
  const [tokenStatus, setTokenStatus] = useState<LiveGameChallengeTokenStatus>("pending");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<"correct" | "incorrect" | null>(null);
  const beginRequestRef = useRef(0);
  const controllerRef = useRef(
    new LiveGameChallengePrefetchController<EnglishCraftCraftQuestionClient>(),
  );
  const submitInFlightRef = useRef(false);
  const interactionPositionSyncRef = useRef<Promise<boolean | PositionSyncResult> | null>(null);
  const encounterOpenRef = useRef<Promise<void> | null>(null);
  const challengeOpenedAtRef = useRef(0);
  const pendingSubmissionRef = useRef<{
    challengeId: string;
    answerKey: string;
    id: string;
    responseTimeMs: number;
  } | null>(null);

  const isOpen = activeChallenge != null;

  const ensureController = useCallback(() => {
    const current = controllerRef.current;
    if (!current.isDisposed()) return current;
    const replacement = new LiveGameChallengePrefetchController<EnglishCraftCraftQuestionClient>();
    controllerRef.current = replacement;
    return replacement;
  }, []);

  const buildKey = useCallback(
    (recipeId: CraftRecipeId) =>
      buildChallengePrefetchKey({
        roomId,
        activity: "craft",
        targetId: CRAFT_MACHINE_ID,
        recipeId,
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
    (recipeId?: CraftRecipeId) => {
      const controller = ensureController();
      if (recipeId) {
        controller.invalidateKey(buildKey(recipeId), "consumed");
      } else {
        controller.cancelAll("session_change");
      }
    },
    [buildKey, ensureController],
  );

  const cancelPrefetch = useCallback(() => {
    ensureController().cancelAll("session_change");
  }, [ensureController]);

  const releasePrefetchFocus = useCallback(() => {
    ensureController().releaseFocus();
  }, [ensureController]);

  const requestCraftToken = useCallback(
    async (
      recipeId: CraftRecipeId,
      signal?: AbortSignal,
      prefetchMeta?: { keyHash: string; prefetchOutcome: string },
    ): Promise<CraftTokenPayload> => {
      const requestToken = async (questionBundleVersion?: number) => {
        const response = await diagnosticFetch(
          "/api/live-game/craft/challenge",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roomId,
              recipeId,
              questionBundleVersion,
              prefetch: Boolean(signal),
            }),
            signal,
          },
          {
            phase: "gameplay",
            name: "craft_question_request",
            detail: {
              recipeId,
              machineId: CRAFT_MACHINE_ID,
              prefetched: Boolean(signal),
              prefetchKeyHash: prefetchMeta?.keyHash,
              prefetchOutcome: prefetchMeta?.prefetchOutcome,
            },
          },
        );
        const payload = (await response.json()) as {
          error?: string;
          challengeId?: string;
          expiresAt?: string;
          questionId?: string;
          question?: EnglishCraftCraftQuestionClient;
          recipeId?: CraftRecipeId;
          recipeLabel?: string;
          costSummary?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Could not start craft challenge.");
        return parseCraftPayload(payload, recipeId, roomId);
      };

      const bundleVersion = getPreloadedQuestionBundleVersion(roomId);
      if (bundleVersion == null) return requestToken();
      try {
        return await requestToken(bundleVersion);
      } catch (error) {
        if (signal?.aborted || !(error instanceof PreloadedCraftQuestionMissError)) throw error;
        return requestToken();
      }
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

  const fetchTokenEntry = useCallback(
    async (
      recipeId: CraftRecipeId,
      signal: AbortSignal,
      prefetchMeta: { keyHash: string; prefetchOutcome: string },
    ): Promise<CraftPrefetchEntry> => {
      const payload = await requestCraftToken(recipeId, signal, prefetchMeta);
      return toCraftPrefetchEntry(payload, Date.now());
    },
    [requestCraftToken],
  );

  const prefetchChallenge = useCallback(
    async (recipeId: CraftRecipeId) => {
      const key = buildKey(recipeId);
      const keyHash = hashChallengePrefetchKey(key);
      let requestReachedFetch = false;
      let prefetchEntryCreated = false;
      let prefetchStored = false;
      const controller = ensureController();
      const result = await controller.ensure({
        key,
        targetId: CRAFT_MACHINE_ID,
        fetcher: async (signal) => {
          requestReachedFetch = true;
          const entry = await fetchTokenEntry(recipeId, signal, {
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
            recordLiveGameDiagnostic("gameplay", "craft_prefetch", {
              recipeId,
              machineId: CRAFT_MACHINE_ID,
              prefetchKeyHash: result.keyHash,
              prefetchOutcome: "failed",
              prefetchFailReason: "request_aborted",
              cancelReason: result.cancelReason ?? "failed",
              requestCallbackInvoked: result.requestCallbackInvoked ?? false,
              requestReachedFetch,
              prefetchEntryCreated,
              prefetchStored: false,
              cacheSize: controller.getEntryCount(),
              prefetched: true,
            });
            return;
          }
          recordLiveGameDiagnostic("gameplay", "craft_prefetch", {
            recipeId,
            machineId: CRAFT_MACHINE_ID,
            prefetchKeyHash: result.keyHash,
            prefetchOutcome: "failed",
            prefetchFailReason: result.prefetchFailReason ?? "request_http_error",
            cancelReason: result.cancelReason ?? null,
            requestCallbackInvoked: result.requestCallbackInvoked ?? false,
            requestReachedFetch,
            prefetchEntryCreated,
            prefetchStored: false,
            cacheSize: controller.getEntryCount(),
            prefetched: true,
          });
          return;
        }
      }

      recordLiveGameDiagnostic("gameplay", "craft_prefetch", {
        recipeId,
        machineId: CRAFT_MACHINE_ID,
        prefetchKeyHash: result.keyHash,
        prefetchOutcome: result.outcome,
        prefetchFailReason: result.prefetchFailReason ?? null,
        cancelReason: result.cancelReason ?? null,
        requestCallbackInvoked: result.requestCallbackInvoked ?? false,
        requestReachedFetch,
        prefetchEntryCreated,
        prefetchStored,
        cacheSize: controller.getEntryCount(),
        evictionOutcome: result.evictionOutcome ?? "none",
        prefetched: true,
        inFlightAgeMs: result.inFlightAgeMs ?? null,
        challengeRemainingValidityMs: result.challengeRemainingValidityMs ?? null,
        prefetchRemainingValidityMs: result.challengeRemainingValidityMs ?? null,
      });
    },
    [buildKey, ensureController, fetchTokenEntry],
  );

  const resolveToken = useCallback(
    async (requestId: number, recipeId: CraftRecipeId) => {
      const now = Date.now();
      const key = buildKey(recipeId);
      const lookup = ensureController().lookupInteraction(key, CRAFT_MACHINE_ID, now);

      if (lookup.entry) {
        const entry = lookup.entry as CraftPrefetchEntry;
        applyTokenToActiveChallenge({
          challengeId: entry.challengeId,
          expiresAt: new Date(entry.expiresAt).toISOString(),
          question: entry.question,
          recipeId: (entry.recipeId as CraftRecipeId) ?? recipeId,
          recipeLabel: entry.recipeLabel ?? "Craft",
          costSummary: entry.costSummary ?? "",
        });
        const encounterOpen = openLiveGameQuestionEncounter({
          roomId,
          challengeId: entry.challengeId,
          recipeId,
        });
        encounterOpenRef.current = encounterOpen;
        void encounterOpen.catch((openError) => {
          if (beginRequestRef.current === requestId) {
            setTokenStatus("error");
            setError(openError instanceof Error ? openError.message : "Could not open craft question.");
          }
        });
        return;
      }

      if (lookup.promise) {
        try {
          const entry = (await lookup.promise) as CraftPrefetchEntry;
          if (beginRequestRef.current !== requestId) return;
          applyTokenToActiveChallenge({
            challengeId: entry.challengeId,
            expiresAt: new Date(entry.expiresAt).toISOString(),
            question: entry.question,
            recipeId: (entry.recipeId as CraftRecipeId) ?? recipeId,
            recipeLabel: entry.recipeLabel ?? "Craft",
            costSummary: entry.costSummary ?? "",
          });
          const encounterOpen = openLiveGameQuestionEncounter({
            roomId,
            challengeId: entry.challengeId,
            recipeId,
          });
          encounterOpenRef.current = encounterOpen;
          void encounterOpen.catch((openError) => {
            if (beginRequestRef.current === requestId) {
              setTokenStatus("error");
              setError(
                openError instanceof Error ? openError.message : "Could not open craft question.",
              );
            }
          });
          return;
        } catch {
          if (beginRequestRef.current !== requestId) return;
        }
      }

      try {
        const keyHash = hashChallengePrefetchKey(key);
        const payload = await requestCraftToken(recipeId, undefined, {
          keyHash,
          prefetchOutcome: "started",
        });
        if (beginRequestRef.current !== requestId) return;
        applyTokenToActiveChallenge(payload);
        const encounterOpen = openLiveGameQuestionEncounter({
          roomId,
          challengeId: payload.challengeId,
          recipeId,
        });
        encounterOpenRef.current = encounterOpen;
        void encounterOpen.catch((openError) => {
          if (beginRequestRef.current === requestId) {
            setTokenStatus("error");
            setError(
              openError instanceof Error ? openError.message : "Could not open craft question.",
            );
          }
        });
      } catch (challengeError) {
        if (beginRequestRef.current !== requestId) return;
        const message =
          challengeError instanceof Error ? challengeError.message : "Could not start craft challenge.";
        setTokenStatus("error");
        setError(message);
        clearPrefetchCache(recipeId);
      }
    },
    [applyTokenToActiveChallenge, buildKey, clearPrefetchCache, ensureController, requestCraftToken, roomId],
  );

  const beginChallenge = useCallback(
    async (
      recipeId: CraftRecipeId,
      recipeLabel = "Craft",
      costSummary = "",
      positionSync?: Promise<boolean | PositionSyncResult>,
    ) => {
      const requestId = beginRequestRef.current + 1;
      beginRequestRef.current = requestId;
      interactionPositionSyncRef.current = positionSync ?? null;
      challengeOpenedAtRef.current = Date.now();

      setError(null);
      setLastResult(null);

      const previewQuestion =
        getNextPreloadedCraftQuestion(roomId, playerId, questionCursor) ??
        CRAFT_PREVIEW_QUESTION;
      const now = Date.now();
      const key = buildKey(recipeId);
      const controller = ensureController();
      controller.setFocus(key);
      const lookup = controller.lookupInteraction(key, CRAFT_MACHINE_ID, now);

      recordLiveGameDiagnostic("gameplay", "craft_interaction", {
        recipeId,
        machineId: CRAFT_MACHINE_ID,
        cacheState: lookup.cacheState,
        prefetchKeyHash: lookup.keyHash,
        prefetchOutcome: lookup.outcome,
        retentionAgeMs: lookup.retentionAgeMs ?? null,
        inFlightAgeMs: lookup.inFlightAgeMs ?? null,
        challengeRemainingValidityMs: lookup.challengeRemainingValidityMs ?? null,
        sameTargetReturn: lookup.cacheState !== "cold",
        waitedForPositionSync: false,
        positionWaitMs: 0,
        reusedChallengeRequest: lookup.cacheState !== "cold",
        duplicateRequestPrevented: lookup.cacheState !== "cold",
      });

      if (lookup.entry) {
        const entry = lookup.entry as CraftPrefetchEntry;
        setActiveChallenge({
          challengeId: entry.challengeId,
          recipeId: (entry.recipeId as CraftRecipeId) ?? recipeId,
          recipeLabel: entry.recipeLabel ?? recipeLabel,
          costSummary: entry.costSummary ?? costSummary,
          question:
            entry.question.id !== previewQuestion.id ? entry.question : previewQuestion,
        });
        setTokenStatus("ready");
        const encounterOpen = openLiveGameQuestionEncounter({
          roomId,
          challengeId: entry.challengeId,
          recipeId,
        });
        encounterOpenRef.current = encounterOpen;
        void encounterOpen.catch((openError) => {
          if (beginRequestRef.current === requestId) {
            setTokenStatus("error");
            setError(
              openError instanceof Error ? openError.message : "Could not open craft question.",
            );
          }
        });
        return;
      }

      if (lookup.promise) {
        setTokenStatus("pending");
        setActiveChallenge({
          challengeId: null,
          recipeId,
          recipeLabel,
          costSummary,
          question: previewQuestion,
        });
        try {
          const entry = (await lookup.promise) as CraftPrefetchEntry;
          if (beginRequestRef.current !== requestId) return;
          applyTokenToActiveChallenge({
            challengeId: entry.challengeId,
            expiresAt: new Date(entry.expiresAt).toISOString(),
            question: entry.question,
            recipeId: (entry.recipeId as CraftRecipeId) ?? recipeId,
            recipeLabel: entry.recipeLabel ?? recipeLabel,
            costSummary: entry.costSummary ?? costSummary,
          });
          const encounterOpen = openLiveGameQuestionEncounter({
            roomId,
            challengeId: entry.challengeId,
            recipeId,
          });
          encounterOpenRef.current = encounterOpen;
          void encounterOpen.catch((openError) => {
            if (beginRequestRef.current === requestId) {
              setTokenStatus("error");
              setError(
                openError instanceof Error ? openError.message : "Could not open craft question.",
              );
            }
          });
        } catch {
          if (beginRequestRef.current !== requestId) return;
          try {
            const positionDetail = await requireLiveGamePositionSync(positionSync);
            recordLiveGameDiagnostic("gameplay", "craft_interaction", {
              recipeId,
              machineId: CRAFT_MACHINE_ID,
              cacheState: lookup.cacheState,
              ...positionSyncInteractionFields(positionDetail),
            });
            if (beginRequestRef.current !== requestId) return;
            await resolveToken(requestId, recipeId);
          } catch (positionError) {
            if (beginRequestRef.current !== requestId) return;
            setTokenStatus("error");
            setError(
              positionError instanceof Error ?
                positionError.message
              : "Could not verify your position.",
            );
          }
        }
        return;
      }

      setTokenStatus("pending");
      setActiveChallenge({
        challengeId: null,
        recipeId,
        recipeLabel,
        costSummary,
        question: previewQuestion,
      });

      try {
        const positionDetail = await requireLiveGamePositionSync(positionSync);
        recordLiveGameDiagnostic("gameplay", "craft_interaction", {
          recipeId,
          machineId: CRAFT_MACHINE_ID,
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
      await resolveToken(requestId, recipeId);
    },
    [
      applyTokenToActiveChallenge,
      buildKey,
      ensureController,
      playerId,
      questionCursor,
      resolveToken,
      roomId,
    ],
  );

  const submitAnswer = useCallback(
    async (order: string[], options?: { skip?: boolean }) => {
      if (!activeChallenge?.challengeId || tokenStatus !== "ready" || submitInFlightRef.current) {
        return;
      }
      const clickAt = performance.now();
      submitInFlightRef.current = true;
      setIsSubmitting(true);
      setLastResult(null);
      setError(null);
      recordLiveGameDiagnostic("gameplay", "answer_submit_clicked", {
        questionType: "craft",
        gameObjectId: activeChallenge.recipeId,
      });
      try {
        await requireLiveGamePositionSync(interactionPositionSyncRef.current);
        await encounterOpenRef.current;
        const answerKey = options?.skip ? "skip" : order.join("\u0000");
        const pending = pendingSubmissionRef.current;
        const submission =
          pending?.challengeId === activeChallenge.challengeId && pending.answerKey === answerKey ?
            pending
          : {
              challengeId: activeChallenge.challengeId,
              answerKey,
              id: createLiveGameSubmissionId(),
              responseTimeMs: Date.now() - challengeOpenedAtRef.current,
            };
        pendingSubmissionRef.current = submission;
        recordLiveGameDiagnostic("gameplay", "question_attempt", {
          questionType: "craft",
          questionId: activeChallenge.question.id,
          questionPrompt: activeChallenge.question.prompt,
          gameObjectId: activeChallenge.recipeId,
          challengeId: activeChallenge.challengeId,
          action: options?.skip ? "skip" : "answer",
          selectedAnswer: options?.skip ? null : order.join(" "),
        });
        recordLiveGameDiagnostic("gameplay", "answer_request_started", {
          questionType: "craft",
          clickToRequestMs: Math.round(performance.now() - clickAt),
        });
        const response = await diagnosticFetch(
          "/api/live-game/craft/answer",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roomId,
              challengeId: activeChallenge.challengeId,
              recipeId: activeChallenge.recipeId,
              order: options?.skip ? [] : order,
              skip: options?.skip === true,
              submissionId: submission.id,
              responseTimeMs: submission.responseTimeMs,
            }),
          },
          {
            phase: "gameplay",
            name: "craft_answer_request",
            detail: {
              skipped: options?.skip === true,
              responseTimeMs: submission.responseTimeMs,
            },
          },
        );
        recordLiveGameDiagnostic("gameplay", "answer_headers_received", {
          questionType: "craft",
          status: response.status,
          clickToHeadersMs: Math.round(performance.now() - clickAt),
        });
        const payload = (await response.json()) as {
          error?: string;
          correct?: boolean;
          poolTotal?: LiveGameResourcePool;
          craftedItems?: LiveGameCraftedItems;
          recipeId?: CraftRecipeId;
          skipped?: boolean;
          alreadyAwarded?: boolean;
        };
        recordLiveGameDiagnostic("gameplay", "answer_body_parsed", {
          questionType: "craft",
          clickToBodyMs: Math.round(performance.now() - clickAt),
        });
        if (response.status === 404) {
          pendingSubmissionRef.current = null;
          ensureController().consume(buildKey(activeChallenge.recipeId));
          setActiveChallenge(null);
          setTokenStatus("pending");
          setLastResult(null);
          return;
        }
        if (!response.ok) {
          recordLiveGameDiagnostic(
            "gameplay",
            "question_attempt_rejected",
            {
              questionType: "craft",
              questionId: activeChallenge.question.id,
              gameObjectId: activeChallenge.recipeId,
              challengeId: activeChallenge.challengeId,
              action: options?.skip ? "skip" : "answer",
              status: response.status,
              message: payload.error ?? "Could not submit craft answer.",
            },
            { kind: "error" },
          );
          throw new Error(payload.error ?? "Could not submit craft answer.");
        }
        pendingSubmissionRef.current = null;

        if (payload.skipped === true) {
          ensureController().consume(buildKey(activeChallenge.recipeId));
          setActiveChallenge(null);
          setTokenStatus("pending");
          setLastResult(null);
          return;
        }
        const correct = payload.correct === true;
        const authoritativeAt = performance.now();
        recordLiveGameDiagnostic("gameplay", "authoritative_result_received", {
          questionType: "craft",
          correct,
          alreadyAwarded: payload.alreadyAwarded === true,
          clickToAuthoritativeMs: Math.round(authoritativeAt - clickAt),
        });
        recordLiveGameDiagnostic("gameplay", "question_attempt_result", {
          questionType: "craft",
          questionId: activeChallenge.question.id,
          gameObjectId: activeChallenge.recipeId,
          challengeId: activeChallenge.challengeId,
          action: options?.skip ? "skip" : "answer",
          correct,
        });
        setLastResult(correct ? "correct" : "incorrect");
        recordLiveGameDiagnostic("gameplay", "result_state_committed", {
          questionType: "craft",
          correct,
          authoritativeToCommittedMs: Math.round(performance.now() - authoritativeAt),
        });
        recordLiveGameDiagnostic("gameplay", "craft_result_visible", {
          correct,
          clickToVisibleMs: Math.round(performance.now() - clickAt),
          authoritativeToVisibleMs: Math.round(performance.now() - authoritativeAt),
        });
        recordLiveGameDiagnostic("gameplay", "result_visible", {
          questionType: "craft",
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
        const craftedItems = payload.craftedItems ?? {
          benchBuilt: false,
          hammers: 0,
          boat: false,
        };
        onAnswered?.({
          correct,
          poolTotal,
          craftedItems,
          recipeId: payload.recipeId ?? activeChallenge.recipeId,
        });
        recordLiveGameDiagnostic("gameplay", "liveblocks_reconciled", {
          questionType: "craft",
          note: "storage_updates_via_subscription",
          visibleToReconcileMs: 0,
        });

        if (correct) {
          ensureController().consume(buildKey(activeChallenge.recipeId));
          setActiveChallenge(null);
          setTokenStatus("pending");
        } else {
          challengeOpenedAtRef.current = Date.now();
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
      prefetchChallenge,
      releasePrefetchFocus,
      skipChallenge,
      submitAnswer,
      tokenStatus,
    ],
  );
}
