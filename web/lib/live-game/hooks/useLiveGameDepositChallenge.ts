"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  canStartChallengePrefetch,
  isChallengePrefetchValid,
  type ChallengePrefetchEntry,
} from "@/lib/live-game/challenge-prefetch";
import type { LiveGameChallengeTokenStatus } from "@/lib/live-game/challenge-token-status";
import type { LiveGamePoolTotal } from "@/lib/live-game/api-types";
import type { LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import type { EnglishCraftStructureDef } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import {
  ENGLISH_CRAFT_DEPOSIT_SPELL_PREVIEW,
  type EnglishCraftDepositSpellClient,
} from "@/lib/live-game/modes/english-craft/questions-deposit-client";

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

export function useLiveGameDepositChallenge({ roomId, onAnswered }: Options) {
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge | null>(null);
  const [tokenStatus, setTokenStatus] = useState<LiveGameChallengeTokenStatus>("pending");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<"correct" | "incorrect" | null>(null);
  const beginRequestRef = useRef(0);
  const prefetchCacheRef = useRef<ChallengePrefetchEntry<EnglishCraftDepositSpellClient> | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const prefetchRequestRef = useRef(0);
  const lastPrefetchAtRef = useRef(0);
  const inFlightPrefetchRef = useRef<{
    storageId: string;
    promise: Promise<ChallengePrefetchEntry<EnglishCraftDepositSpellClient>>;
  } | null>(null);

  const isOpen = activeChallenge != null;

  const clearPrefetchCache = useCallback((storageId?: string) => {
    if (!storageId || prefetchCacheRef.current?.nodeId === storageId) {
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
    async (storageId: string, signal?: AbortSignal): Promise<ChallengeTokenPayload> => {
      const response = await fetch("/api/live-game/deposit/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, storageId }),
        signal,
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

  const fetchAndCacheToken = useCallback(
    async (
      storageId: string,
      signal?: AbortSignal,
    ): Promise<ChallengePrefetchEntry<EnglishCraftDepositSpellClient>> => {
      const payload = await requestChallengeToken(storageId, signal);
      const fetchedAt = Date.now();
      const entry = toPrefetchEntry(storageId, payload, fetchedAt);
      prefetchCacheRef.current = entry;
      return entry;
    },
    [requestChallengeToken],
  );

  const prefetchForStorage = useCallback(
    async (storageId: string) => {
      const now = Date.now();
      if (
        isChallengePrefetchValid(prefetchCacheRef.current, storageId, now) ||
        inFlightPrefetchRef.current?.storageId === storageId
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

      const promise = fetchAndCacheToken(storageId, controller.signal);
      inFlightPrefetchRef.current = { storageId, promise };

      try {
        await promise;
      } catch (prefetchError) {
        if (controller.signal.aborted || prefetchRequestRef.current !== requestId) return;
        clearPrefetchCache(storageId);
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

  const resolveTokenForStorage = useCallback(
    async (
      storageId: string,
      previewSpell: EnglishCraftDepositSpellClient,
      requestId: number,
    ) => {
      const now = Date.now();
      const cached = prefetchCacheRef.current;
      if (isChallengePrefetchValid(cached, storageId, now) && cached) {
        applyTokenToActiveChallenge(
          storageId,
          {
            challengeId: cached.challengeId,
            expiresAt: new Date(cached.expiresAt).toISOString(),
            spell: cached.question,
          },
          previewSpell,
        );
        return;
      }

      const inFlight = inFlightPrefetchRef.current;
      if (inFlight?.storageId === storageId) {
        try {
          const entry = await inFlight.promise;
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
          return;
        } catch {
          if (beginRequestRef.current !== requestId) return;
        }
      }

      try {
        const entry = await fetchAndCacheToken(storageId);
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
    [applyTokenToActiveChallenge, clearPrefetchCache, fetchAndCacheToken],
  );

  const beginChallenge = useCallback(
    async (storage: EnglishCraftStructureDef) => {
      const requestId = beginRequestRef.current + 1;
      beginRequestRef.current = requestId;

      setError(null);
      setLastResult(null);

      const previewSpell = ENGLISH_CRAFT_DEPOSIT_SPELL_PREVIEW;
      const now = Date.now();
      const cached = prefetchCacheRef.current;

      if (isChallengePrefetchValid(cached, storage.id, now) && cached) {
        setActiveChallenge({
          storageId: storage.id,
          resourceType: storage.resourceType ?? previewSpell.resourceType,
          challengeId: cached.challengeId,
          spell: cached.question,
        });
        setTokenStatus("ready");
        return;
      }

      setTokenStatus("pending");
      setActiveChallenge({
        storageId: storage.id,
        resourceType: storage.resourceType ?? previewSpell.resourceType,
        challengeId: null,
        spell: previewSpell,
      });

      await resolveTokenForStorage(storage.id, previewSpell, requestId);
    },
    [resolveTokenForStorage],
  );

  const submitAnswer = useCallback(
    async (spelling: string, options?: { skip?: boolean }) => {
      if (!activeChallenge?.challengeId || tokenStatus !== "ready") return;
      setIsSubmitting(true);
      setError(null);
      try {
        const response = await fetch("/api/live-game/deposit/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            challengeId: activeChallenge.challengeId,
            spelling: options?.skip ? "" : spelling,
            skip: options?.skip === true,
          }),
        });
        const payload = (await response.json()) as {
          error?: string;
          correct?: boolean;
          poolTotal?: LiveGamePoolTotal;
          carryCleared?: boolean;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not submit spelling.");
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
          poolTotal,
          carryCleared: payload.carryCleared === true,
        });

        if (correct) {
          clearPrefetchCache(activeChallenge.storageId);
          setActiveChallenge(null);
          setTokenStatus("pending");
        }
      } catch (answerError) {
        const message =
          answerError instanceof Error ? answerError.message : "Could not submit spelling.";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeChallenge, clearPrefetchCache, onAnswered, roomId, tokenStatus],
  );

  const closeChallenge = useCallback(() => {
    beginRequestRef.current += 1;
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
      skipChallenge,
      submitAnswer,
      tokenStatus,
    ],
  );
}
