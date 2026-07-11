"use client";

import { useCallback, useMemo, useState } from "react";
import type { EnglishCraftMcQuestionClient } from "@/lib/live-game/modes/english-craft/questions-v1";
import type { EnglishCraftWoodTreeDef } from "@/lib/live-game/modes/english-craft/map-objects-v1";

type ActiveChallenge = {
  challengeId: string;
  nodeId: string;
  question: EnglishCraftMcQuestionClient;
};

type AnswerResult = {
  correct: boolean;
  poolWood: number;
};

type Options = {
  roomId: string;
  playerId: string;
  onAnswered?: (result: AnswerResult) => void;
};

export function useLiveGameWoodChallenge({ roomId, playerId, onAnswered }: Options) {
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<"correct" | "incorrect" | null>(null);

  const isOpen = activeChallenge != null;

  const beginChallenge = useCallback(
    async (tree: EnglishCraftWoodTreeDef) => {
      setIsLoading(true);
      setError(null);
      setLastResult(null);
      try {
        const response = await fetch("/api/live-game/challenge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            nodeId: tree.id,
            playerId,
          }),
        });
        const payload = (await response.json()) as {
          error?: string;
          challengeId?: string;
          question?: EnglishCraftMcQuestionClient;
        };
        if (!response.ok || !payload.challengeId || !payload.question) {
          throw new Error(payload.error ?? "Could not start challenge.");
        }
        setActiveChallenge({
          challengeId: payload.challengeId,
          nodeId: tree.id,
          question: payload.question,
        });
      } catch (challengeError) {
        const message =
          challengeError instanceof Error ? challengeError.message : "Could not start challenge.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [playerId, roomId],
  );

  const submitAnswer = useCallback(
    async (answer: string) => {
      if (!activeChallenge) return;
      setIsLoading(true);
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
          setActiveChallenge(null);
        }
      } catch (answerError) {
        const message =
          answerError instanceof Error ? answerError.message : "Could not submit answer.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [activeChallenge, onAnswered, playerId, roomId],
  );

  const closeChallenge = useCallback(() => {
    setActiveChallenge(null);
    setError(null);
    setLastResult(null);
  }, []);

  return useMemo(
    () => ({
      activeChallenge,
      isOpen,
      isLoading,
      error,
      lastResult,
      beginChallenge,
      submitAnswer,
      closeChallenge,
    }),
    [
      activeChallenge,
      beginChallenge,
      closeChallenge,
      error,
      isLoading,
      isOpen,
      lastResult,
      submitAnswer,
    ],
  );
}
