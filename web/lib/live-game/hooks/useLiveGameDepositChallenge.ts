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
import { getPreloadedQuestionBundleVersion } from "@/lib/live-game/question-bundle-cache";
import type { LiveGameChallengeTokenStatus } from "@/lib/live-game/challenge-token-status";
import type { LiveGamePoolTotal } from "@/lib/live-game/api-types";
import type { LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import type { EnglishCraftStructureDef } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import {
  ENGLISH_CRAFT_DEPOSIT_SPELL_PREVIEW,
  type EnglishCraftDepositSpellClient,
} from "@/lib/live-game/modes/english-craft/questions-deposit-client";
import { createLiveGameSubmissionId } from "@/lib/live-game/submission-id";
import { openLiveGameQuestionEncounter } from "@/lib/live-game/open-question-encounter";
import { diagnosticFetch, recordLiveGameDiagnostic } from "@/lib/live-game/diagnostics/client";

type ActiveChallenge = {
  storageId: string;
  resourceType: LiveGameResourceType;
  challengeId: string | null;
  spell: EnglishCraftDepositSpellClient;
};

type AnswerResult = {
  correct: boolean;
  poolTotal: LiveGamePoolTotal;
  carryCleared: boolean;
};

type ChallengeTokenPayload = {
  challengeId: string;
  expiresAt: string;
  spell: EnglishCraftDepositSpellClient;
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
  spell?: EnglishCraftDepositSpellClient;
}): ChallengeTokenPayload {
  if (!payload.challengeId || !payload.expiresAt || !payload.spell) {
    throw new Error(payload.error ?? "Could not start deposit challenge.");
  }
  return {
    challengeId: payload.challengeId,
    expiresAt: payload.expiresAt,
    spell: payload.spell,
  };
}

function toPrefetchEntry(
  storageId: string,
  payload: ChallengeTokenPayload,
  fetchedAt: number,
): ChallengePrefetchEntry<EnglishCraftDepositSpellClient> {
  return {
    nodeId: storageId,
    challengeId: payload.challengeId,
    expiresAt: new Date(payload.expiresAt).getTime(),
    question: payload.spell,
    fetchedAt,
  };
}

export function useLiveGameDepositChallenge({ roomId, playerId, onAnswered }: Options) {
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge | null>(null);
  const [tokenStatus, setTokenStatus] = useState<LiveGameChallengeTokenStatus>("pending");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<"correct" | "incorrect" | null>(null);
  const beginRequestRef = useRef(0);
  const controllerRef = useRef(
    new LiveGameChallengePrefetchController<EnglishCraftDepositSpellClient>(),
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
    const replacement = new LiveGameChallengePrefetchController<EnglishCraftDepositSpellClient>();
    controllerRef.current = replacement;
    return replacement;
  }, []);

  const buildKey = useCallback(
    (storageId: string) =>
      buildChallengePrefetchKey({
        roomId,
        activity: "deposit",
        targetId: storageId,
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
    (storageId?: string) => {
      const controller = ensureController();
      if (storageId) {
        controller.invalidateTarget(storageId);
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
      storageId: string,
      signal?: AbortSignal,
      prefetchMeta?: { keyHash: string; prefetchOutcome: string },
    ): Promise<ChallengeTokenPayload> => {
      const response = await diagnosticFetch("/api/live-game/deposit/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, storageId, prefetch: Boolean(signal) }),
        signal,
      }, {
        phase: "gameplay",
        name: "deposit_question_request",
        detail: {
          storageId,
          prefetched: Boolean(signal),
          prefetchKeyHash: prefetchMeta?.keyHash,
          prefetchOutcome: prefetchMeta?.prefetchOutcome,
        },
      });
      const payload = (await response.json()) as {
        error?: string;
        challengeId?: string;
        expiresAt?: string;
        spell?: EnglishCraftDepositSpellClient;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not start deposit challenge.");
      }
      return parseChallengePayload(payload);
    },
    [roomId],
  );

  const applyTokenToActiveChallenge = useCallback(
    (
      storageId: string,
      payload: ChallengeTokenPayload,
      previewSpell: EnglishCraftDepositSpellClient,
    ) => {
      setActiveChallenge((current) => {
        if (!current || current.storageId !== storageId) return current;
        return {
          ...current,
          challengeId: payload.challengeId,
          spell: payload.spell.spellHint !== previewSpell.spellHint ? payload.spell : current.spell,
        };
      });
      setTokenStatus("ready");
    },
    [],
  );

  const fetchTokenEntry = useCallback(
    async (
      storageId: string,
      signal: AbortSignal,
      prefetchMeta: { keyHash: string; prefetchOutcome: string },
    ): Promise<ChallengePrefetchEntry<EnglishCraftDepositSpellClient>> => {
      const payload = await requestChallengeToken(storageId, signal, prefetchMeta);
      return toPrefetchEntry(storageId, payload, Date.now());
    },
    [requestChallengeToken],
  );

  const prefetchForStorage = useCallback(
    async (storageId: string) => {
      const key = buildKey(storageId);
      const keyHash = hashChallengePrefetchKey(key);
      let requestReachedFetch = false;
      let prefetchEntryCreated = false;
      let prefetchStored = false;
      const result = await ensureController().ensure({
        key,
        targetId: storageId,
        fetcher: async (signal) => {
          requestReachedFetch = true;
          const entry = await fetchTokenEntry(storageId, signal, {
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
            recordLiveGameDiagnostic("gameplay", "deposit_prefetch", {
              storageId,
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
          recordLiveGameDiagnostic("gameplay", "deposit_prefetch", {
            storageId,
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

      recordLiveGameDiagnostic("gameplay", "deposit_prefetch", {
        storageId,
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

  const resolveTokenForStorage = useCallback(
    async (
      storageId: string,
      previewSpell: EnglishCraftDepositSpellClient,
      requestId: number,
    ) => {
      const now = Date.now();
      const key = buildKey(storageId);
      const lookup = ensureController().lookupInteraction(key, storageId, now);

      if (lookup.entry) {
        applyTokenToActiveChallenge(
          storageId,
          {
            challengeId: lookup.entry.challengeId,
            expiresAt: new Date(lookup.entry.expiresAt).toISOString(),
            spell: lookup.entry.question,
          },
          previewSpell,
        );
        const encounterOpen = openLiveGameQuestionEncounter({
          roomId,
          challengeId: lookup.entry.challengeId,
        });
        encounterOpenRef.current = encounterOpen;
        void encounterOpen.catch((openError) => {
          if (beginRequestRef.current === requestId) {
            setTokenStatus("error");
            setError(openError instanceof Error ? openError.message : "Could not open deposit question.");
          }
        });
        return;
      }

      if (lookup.promise) {
        try {
          const entry = await lookup.promise;
          if (beginRequestRef.current !== requestId) return;
          applyTokenToActiveChallenge(
            storageId,
            {
              challengeId: entry.challengeId,
              expiresAt: new Date(entry.expiresAt).toISOString(),
              spell: entry.question,
            },
            previewSpell,
          );
          const encounterOpen = openLiveGameQuestionEncounter({ roomId, challengeId: entry.challengeId });
          encounterOpenRef.current = encounterOpen;
          void encounterOpen.catch((openError) => {
            if (beginRequestRef.current === requestId) {
              setTokenStatus("error");
              setError(openError instanceof Error ? openError.message : "Could not open deposit question.");
            }
          });
          return;
        } catch {
          if (beginRequestRef.current !== requestId) return;
        }
      }

      try {
        const keyHash = hashChallengePrefetchKey(key);
        const payload = await requestChallengeToken(storageId, undefined, {
          keyHash,
          prefetchOutcome: "started",
        });
        if (beginRequestRef.current !== requestId) return;
        applyTokenToActiveChallenge(storageId, payload, previewSpell);
      } catch (challengeError) {
        if (beginRequestRef.current !== requestId) return;
        const message =
          challengeError instanceof Error ?
            challengeError.message
          : "Could not start deposit challenge.";
        setTokenStatus("error");
        setError(message);
        clearPrefetchCache(storageId);
      }
    },
    [applyTokenToActiveChallenge, buildKey, clearPrefetchCache, ensureController, requestChallengeToken, roomId],
  );

  const beginChallenge = useCallback(
    async (storage: EnglishCraftStructureDef, positionSync?: Promise<boolean | PositionSyncResult>) => {
      const requestId = beginRequestRef.current + 1;
      beginRequestRef.current = requestId;
      interactionPositionSyncRef.current = positionSync ?? null;
      challengeOpenedAtRef.current = Date.now();

      setError(null);
      setLastResult(null);

      const previewSpell = ENGLISH_CRAFT_DEPOSIT_SPELL_PREVIEW;
      const now = Date.now();
      const key = buildKey(storage.id);
      const controller = ensureController();
      controller.setFocus(key);
      const lookup = controller.lookupInteraction(key, storage.id, now);

      recordLiveGameDiagnostic("gameplay", "deposit_interaction", {
        storageId: storage.id,
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
          storageId: storage.id,
          resourceType: storage.resourceType ?? previewSpell.resourceType,
          challengeId: lookup.entry.challengeId,
          spell: lookup.entry.question,
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
            setError(openError instanceof Error ? openError.message : "Could not open deposit question.");
          }
        });
        return;
      }

      if (lookup.promise) {
        setTokenStatus("pending");
        setActiveChallenge({
          storageId: storage.id,
          resourceType: storage.resourceType ?? previewSpell.resourceType,
          challengeId: null,
          spell: previewSpell,
        });
        try {
          const entry = await lookup.promise;
          if (beginRequestRef.current !== requestId) return;
          applyTokenToActiveChallenge(
            storage.id,
            {
              challengeId: entry.challengeId,
              expiresAt: new Date(entry.expiresAt).toISOString(),
              spell: entry.question,
            },
            previewSpell,
          );
          const encounterOpen = openLiveGameQuestionEncounter({ roomId, challengeId: entry.challengeId });
          encounterOpenRef.current = encounterOpen;
          void encounterOpen.catch((openError) => {
            if (beginRequestRef.current === requestId) {
              setTokenStatus("error");
              setError(openError instanceof Error ? openError.message : "Could not open deposit question.");
            }
          });
        } catch {
          if (beginRequestRef.current !== requestId) return;
          try {
            const positionDetail = await requireLiveGamePositionSync(positionSync);
            recordLiveGameDiagnostic("gameplay", "deposit_interaction", {
              storageId: storage.id,
              cacheState: lookup.cacheState,
              ...positionSyncInteractionFields(positionDetail),
            });
            if (beginRequestRef.current !== requestId) return;
            await resolveTokenForStorage(storage.id, previewSpell, requestId);
          } catch (positionError) {
            if (beginRequestRef.current !== requestId) return;
            setTokenStatus("error");
            setError(
              positionError instanceof Error ? positionError.message : "Could not verify your position.",
            );
          }
        }
        return;
      }

      setTokenStatus("pending");
      setActiveChallenge({
        storageId: storage.id,
        resourceType: storage.resourceType ?? previewSpell.resourceType,
        challengeId: null,
        spell: previewSpell,
      });

      try {
        const positionDetail = await requireLiveGamePositionSync(positionSync);
        recordLiveGameDiagnostic("gameplay", "deposit_interaction", {
          storageId: storage.id,
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
      await resolveTokenForStorage(storage.id, previewSpell, requestId);
    },
    [applyTokenToActiveChallenge, buildKey, ensureController, resolveTokenForStorage, roomId],
  );

  const submitAnswer = useCallback(
    async (spelling: string, options?: { skip?: boolean }) => {
      if (!activeChallenge?.challengeId || tokenStatus !== "ready" || submitInFlightRef.current) return;
      const clickAt = performance.now();
      submitInFlightRef.current = true;
      setIsSubmitting(true);
      setLastResult(null);
      setError(null);
      recordLiveGameDiagnostic("gameplay", "answer_submit_clicked", {
        questionType: "deposit",
        gameObjectId: activeChallenge.storageId,
      });
      try {
        await requireLiveGamePositionSync(interactionPositionSyncRef.current);
        await encounterOpenRef.current;
        const answerKey = options?.skip ? "skip" : spelling;
        const pending = pendingSubmissionRef.current;
        const submission = pending?.challengeId === activeChallenge.challengeId && pending.answerKey === answerKey ? pending : {
          challengeId: activeChallenge.challengeId,
          answerKey,
          id: createLiveGameSubmissionId(),
          responseTimeMs: Date.now() - challengeOpenedAtRef.current,
        };
        pendingSubmissionRef.current = submission;
        recordLiveGameDiagnostic("gameplay", "question_attempt", {
          questionType: "deposit",
          questionPrompt: activeChallenge.spell.spellHint,
          gameObjectId: activeChallenge.storageId,
          challengeId: activeChallenge.challengeId,
          action: options?.skip ? "skip" : "answer",
          selectedAnswer: options?.skip ? null : spelling,
        });
        recordLiveGameDiagnostic("gameplay", "answer_request_started", {
          questionType: "deposit",
          clickToRequestMs: Math.round(performance.now() - clickAt),
        });
        const response = await diagnosticFetch("/api/live-game/deposit/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            challengeId: activeChallenge.challengeId,
            spelling: options?.skip ? "" : spelling,
            skip: options?.skip === true,
            submissionId: submission.id,
            responseTimeMs: submission.responseTimeMs,
          }),
        }, { phase: "gameplay", name: "deposit_answer_request", detail: { skipped: options?.skip === true, responseTimeMs: submission.responseTimeMs } });
        recordLiveGameDiagnostic("gameplay", "answer_headers_received", {
          questionType: "deposit",
          status: response.status,
          clickToHeadersMs: Math.round(performance.now() - clickAt),
        });
        const payload = (await response.json()) as {
          error?: string;
          correct?: boolean;
          poolTotal?: LiveGamePoolTotal;
          carryCleared?: boolean;
          skipped?: boolean;
          alreadyAwarded?: boolean;
        };
        recordLiveGameDiagnostic("gameplay", "answer_body_parsed", {
          questionType: "deposit",
          clickToBodyMs: Math.round(performance.now() - clickAt),
        });
        if (response.status === 404) {
          pendingSubmissionRef.current = null;
          ensureController().consume(buildKey(activeChallenge.storageId));
          setActiveChallenge(null);
          setTokenStatus("pending");
          setLastResult(null);
          return;
        }
        if (!response.ok) {
          recordLiveGameDiagnostic("gameplay", "question_attempt_rejected", {
            questionType: "deposit",
            questionPrompt: activeChallenge.spell.spellHint,
            gameObjectId: activeChallenge.storageId,
            challengeId: activeChallenge.challengeId,
            action: options?.skip ? "skip" : "answer",
            status: response.status,
            message: payload.error ?? "Could not submit spelling.",
          }, { kind: "error" });
          throw new Error(payload.error ?? "Could not submit spelling.");
        }
        pendingSubmissionRef.current = null;

        if (payload.skipped === true) {
          ensureController().consume(buildKey(activeChallenge.storageId));
          setActiveChallenge(null);
          setTokenStatus("pending");
          setLastResult(null);
          return;
        }
        const correct = payload.correct === true;
        const authoritativeAt = performance.now();
        recordLiveGameDiagnostic("gameplay", "authoritative_result_received", {
          questionType: "deposit",
          correct,
          alreadyAwarded: payload.alreadyAwarded === true,
          clickToAuthoritativeMs: Math.round(authoritativeAt - clickAt),
        });
        recordLiveGameDiagnostic("gameplay", "question_attempt_result", {
          questionType: "deposit",
          questionPrompt: activeChallenge.spell.spellHint,
          gameObjectId: activeChallenge.storageId,
          challengeId: activeChallenge.challengeId,
          action: options?.skip ? "skip" : "answer",
          correct,
        });
        setLastResult(correct ? "correct" : "incorrect");
        recordLiveGameDiagnostic("gameplay", "result_state_committed", {
          questionType: "deposit",
          correct,
          authoritativeToCommittedMs: Math.round(performance.now() - authoritativeAt),
        });
        recordLiveGameDiagnostic("gameplay", "deposit_result_visible", {
          correct,
          clickToVisibleMs: Math.round(performance.now() - clickAt),
          authoritativeToVisibleMs: Math.round(performance.now() - authoritativeAt),
        });
        recordLiveGameDiagnostic("gameplay", "result_visible", {
          questionType: "deposit",
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
          poolTotal,
          carryCleared: payload.carryCleared === true,
        });
        recordLiveGameDiagnostic("gameplay", "liveblocks_reconciled", {
          questionType: "deposit",
          note: "storage_updates_via_subscription",
          visibleToReconcileMs: 0,
        });

        if (correct) {
          ensureController().consume(buildKey(activeChallenge.storageId));
          setActiveChallenge(null);
          setTokenStatus("pending");
        } else {
          challengeOpenedAtRef.current = Date.now();
        }
      } catch (answerError) {
        const message =
          answerError instanceof Error ? answerError.message : "Could not submit spelling.";
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
      prefetchForStorage,
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
      prefetchForStorage,
      releasePrefetchFocus,
      skipChallenge,
      submitAnswer,
      tokenStatus,
    ],
  );
}
