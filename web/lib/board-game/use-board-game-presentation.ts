"use client";

import { useCallback, useRef, useState } from "react";
import { playBoardGameSfx } from "@/lib/board-game/board-game-sfx";
import {
  CELEBRATION_MS,
  diceRollDuration,
  hopDuration,
  JUMP_TRAVEL_MS,
  LANDING_MS,
  LUCKY_SPACE_MS,
  PENALTY_MS,
  TURN_HANDOFF_MS,
} from "@/lib/board-game/animation-timing";
import {
  applyForwardMove,
  attachQuestionIfNeeded,
  buildHopPath,
  computeDiceRoll,
  getCurrentPlayer,
  markAnswerPhaseComplete,
  nextTurn,
  skipQuestion,
} from "@/lib/board-game/game-engine";
import {
  applyResolvedEffect,
  effectRequiresMovement,
} from "@/lib/board-game/map/effects/apply-map-effect";
import type { EffectFeedbackState } from "@/lib/board-game/map/effects/landing-sequence";
import {
  planCorrectAnswerSequence,
  planLandingSequence,
  planWrongAnswerSequence,
} from "@/lib/board-game/map/effects/landing-sequence";
import { resolveMapForSetup } from "@/lib/board-game/map/resolve-map";
import { pickRandomPenalty } from "@/lib/board-game/penalties";
import type { GameRuntime, GameSetup, UiPhase } from "@/lib/board-game/types";
import type { TravelHop } from "@/lib/board-game/travel-state";
import { shouldUseTravelLayer } from "@/lib/board-game/animation-timing";
import { useAudioMuted } from "@/lib/audio/use-audio-muted";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function initialUiPhase(runtime: GameRuntime): UiPhase {
  if (runtime.winnerIndex !== null) return "victory";
  if (runtime.turnPhase === "question" && runtime.currentQuestion) return "question";
  return "ready";
}

export function useBoardGamePresentation(
  setup: GameSetup,
  runtime: GameRuntime,
  onRuntimeChange: (runtime: GameRuntime) => void,
) {
  const { muted } = useAudioMuted();
  const [uiPhase, setUiPhase] = useState<UiPhase>(() => initialUiPhase(runtime));
  const [displayPositions, setDisplayPositions] = useState<number[]>(() => [...runtime.playerPositions]);
  const [diceOverlayOpen, setDiceOverlayOpen] = useState(false);
  const [diceSpinning, setDiceSpinning] = useState(false);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [highlightedSpace, setHighlightedSpace] = useState<number | null>(null);
  const [effectFeedback, setEffectFeedback] = useState<EffectFeedbackState | null>(null);
  const [turnHandoffPlayer, setTurnHandoffPlayer] = useState<{ name: string; color: string } | null>(null);
  const [showPointGain, setShowPointGain] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);
  const [celebrationTitle, setCelebrationTitle] = useState<string | null>(null);
  const [pointGainLabel, setPointGainLabel] = useState<string | null>(null);
  const [movingPlayerIndex, setMovingPlayerIndex] = useState<number | null>(null);
  const [travelHop, setTravelHop] = useState<TravelHop | null>(null);
  const busyRef = useRef(false);
  const hopKeyRef = useRef(0);

  const visualPositions =
    uiPhase === "moving" || uiPhase === "landing" || uiPhase === "penalty" || uiPhase === "shortcut" ?
      displayPositions
    : runtime.playerPositions;

  const animateHops = useCallback(
    async (playerIndex: number, from: number, to: number, forward: boolean) => {
      const path = buildHopPath(from, to);
      if (path.length === 0) return;

      const hopMs = hopDuration();
      if (!shouldUseTravelLayer() || hopMs === 0) {
        setDisplayPositions((prev) => {
          const next = [...prev];
          next[playerIndex] = to;
          return next;
        });
        return;
      }

      setMovingPlayerIndex(playerIndex);
      let current = from;

      try {
        for (const space of path) {
          hopKeyRef.current += 1;
          setTravelHop({
            playerIndex,
            fromPathIndex: current,
            toPathIndex: space,
            hopKey: hopKeyRef.current,
            mode: "hop",
          });
          playBoardGameSfx(forward ? "hop" : "penalty", muted);
          await sleep(hopMs);
          setDisplayPositions((prev) => {
            const next = [...prev];
            next[playerIndex] = space;
            return next;
          });
          current = space;
        }
      } finally {
        setTravelHop(null);
        setMovingPlayerIndex(null);
      }
    },
    [muted],
  );

  const jumpToSpace = useCallback(
    async (playerIndex: number, from: number, pathIndex: number) => {
      const jumpMs = shouldUseTravelLayer() ? JUMP_TRAVEL_MS : 0;

      if (jumpMs > 0 && from !== pathIndex) {
        setMovingPlayerIndex(playerIndex);
        hopKeyRef.current += 1;
        setTravelHop({
          playerIndex,
          fromPathIndex: from,
          toPathIndex: pathIndex,
          hopKey: hopKeyRef.current,
          mode: "jump",
        });
        playBoardGameSfx("lucky", muted);
        await sleep(jumpMs);
        setTravelHop(null);
        setMovingPlayerIndex(null);
      }

      setDisplayPositions((prev) => {
        const next = [...prev];
        next[playerIndex] = pathIndex;
        return next;
      });
      setHighlightedSpace(pathIndex);
      if (jumpMs === 0) {
        playBoardGameSfx("lucky", muted);
      }
      await sleep(LANDING_MS);
      setHighlightedSpace(null);
    },
    [muted],
  );

  const showEffectFeedback = useCallback(
    async (feedback: EffectFeedbackState) => {
      const phase: UiPhase =
        feedback.tone === "penalty" ? "penalty"
        : feedback.tone === "shortcut" ? "shortcut"
        : "luckySpace";

      setEffectFeedback(feedback);
      setUiPhase(phase);
      playBoardGameSfx(feedback.tone === "penalty" ? "penalty" : "lucky", muted);
      await sleep(feedback.tone === "penalty" ? PENALTY_MS : LUCKY_SPACE_MS);
      setEffectFeedback(null);
    },
    [muted],
  );

  const applyEffectStep = useCallback(
    async (nextRuntime: GameRuntime, playerIndex: number, effect: import("@/lib/board-game/map/effects/resolve-effect").ResolvedEffect) => {
      const before = nextRuntime.playerPositions[playerIndex] ?? 0;
      const applied = applyResolvedEffect(nextRuntime, setup, effect);
      onRuntimeChange(applied);
      const after = applied.playerPositions[playerIndex] ?? before;

      if (effect.goToPathIndex !== undefined) {
        await jumpToSpace(playerIndex, before, after);
      } else if (after !== before) {
        setUiPhase("moving");
        await animateHops(playerIndex, before, after, after > before);
      }

      setDisplayPositions([...applied.playerPositions]);
      return applied;
    },
    [animateHops, jumpToSpace, onRuntimeChange, setup],
  );

  const finishTurnWithHandoff = useCallback(
    async (nextRuntime: GameRuntime) => {
      onRuntimeChange(nextRuntime);
      if (nextRuntime.pendingRollAgain) {
        setUiPhase("ready");
        return;
      }
      const upcoming = setup.players[nextRuntime.currentPlayerIndex];
      if (!upcoming) {
        setUiPhase(nextRuntime.winnerIndex !== null ? "victory" : "ready");
        return;
      }
      setTurnHandoffPlayer({ name: upcoming.name, color: upcoming.color });
      setUiPhase("turnHandoff");
      playBoardGameSfx("turn", muted);
      await sleep(TURN_HANDOFF_MS);
      setTurnHandoffPlayer(null);
      setUiPhase(nextRuntime.winnerIndex !== null ? "victory" : "ready");
    },
    [muted, onRuntimeChange, setup.players],
  );

  const processLandingSequence = useCallback(
    async (nextRuntime: GameRuntime, playerIndex: number, landIndex: number, dice: number) => {
      const map = resolveMapForSetup(setup);
      const steps = planLandingSequence(map, landIndex, dice);
      let current = nextRuntime;

      for (const step of steps) {
        if (step.kind === "shortcut") {
          await showEffectFeedback(step.feedback);
          current = await applyEffectStep(current, playerIndex, step.effect);
        } else if (step.kind === "landEffect") {
          await showEffectFeedback(step.feedback);
          current = await applyEffectStep(current, playerIndex, step.effect);
          if (step.effect.rollAgain) {
            onRuntimeChange(current);
            setUiPhase("ready");
            return { runtime: current, done: true, showQuestion: false };
          }
        } else if (step.kind === "question") {
          current = attachQuestionIfNeeded(current, setup, dice, true);
          onRuntimeChange(current);
          return { runtime: current, done: false, showQuestion: true };
        } else if (step.kind === "rollAgain") {
          onRuntimeChange(current);
          setUiPhase("ready");
          return { runtime: current, done: true, showQuestion: false };
        } else if (step.kind === "endTurn") {
          current = attachQuestionIfNeeded(current, setup, dice, false);
          onRuntimeChange(current);
          current = nextTurn(current, setup.playerCount);
          await finishTurnWithHandoff(current);
          return { runtime: current, done: true, showQuestion: false };
        }
      }

      onRuntimeChange(current);
      return { runtime: current, done: true, showQuestion: false };
    },
    [applyEffectStep, finishTurnWithHandoff, onRuntimeChange, setup, showEffectFeedback],
  );

  const handleRoll = useCallback(async () => {
    if (busyRef.current || uiPhase !== "ready" || runtime.turnPhase !== "roll") return;
    if (runtime.winnerIndex !== null) return;
    busyRef.current = true;

    const playerIndex = runtime.currentPlayerIndex;
    const from = runtime.playerPositions[playerIndex] ?? 0;
    const dice = computeDiceRoll();
    const afterMove = applyForwardMove(runtime, setup, dice);
    const to = afterMove.playerPositions[playerIndex] ?? from;

    setUiPhase("diceRolling");
    setDiceOverlayOpen(true);
    setDiceSpinning(true);
    playBoardGameSfx("dice", muted);
    await sleep(diceRollDuration());
    setDiceSpinning(false);
    setDiceValue(dice);
    await sleep(400);
    setDiceOverlayOpen(false);

    setUiPhase("moving");
    await animateHops(playerIndex, from, to, true);

    setUiPhase("landing");
    setHighlightedSpace(to);
    playBoardGameSfx("land", muted);
    await sleep(LANDING_MS);
    setHighlightedSpace(null);

    let nextRuntime = afterMove;
    const landing = await processLandingSequence(nextRuntime, playerIndex, to, dice);
    nextRuntime = landing.runtime;
    setDisplayPositions([...nextRuntime.playerPositions]);

    if (nextRuntime.winnerIndex !== null) {
      setUiPhase("victory");
      playBoardGameSfx("victory", muted);
      busyRef.current = false;
      return;
    }

    if (landing.showQuestion) {
      setUiPhase("question");
    }

    busyRef.current = false;
  }, [animateHops, muted, processLandingSequence, runtime, setup, uiPhase]);

  const handleCorrect = useCallback(async () => {
    if (uiPhase !== "question" || runtime.turnPhase !== "question") return;
    busyRef.current = true;
    setUiPhase("celebrating");
    playBoardGameSfx("correct", muted);
    const map = resolveMapForSetup(setup);
    const pathIndex = runtime.playerPositions[runtime.currentPlayerIndex] ?? 0;
    const { effect, feedback } = planCorrectAnswerSequence(map, pathIndex);
    setCelebrationMessage(feedback.message);
    setCelebrationTitle(feedback.title);
    setPointGainLabel(
      effect.scoreDelta !== undefined && effect.scoreDelta !== 0 ?
        formatScoreDeltaLabel(effect.scoreDelta)
      : null,
    );
    setShowPointGain(effect.scoreDelta !== undefined && effect.scoreDelta !== 0);
    let nextRuntime = markAnswerPhaseComplete(runtime, setup);
    nextRuntime = applyResolvedEffect(nextRuntime, setup, effect);

    onRuntimeChange(nextRuntime);
    await sleep(CELEBRATION_MS);
    setShowPointGain(false);
    setCelebrationMessage(null);
    setCelebrationTitle(null);
    setPointGainLabel(null);

    if (effectRequiresMovement(runtime, nextRuntime)) {
      const playerIndex = runtime.currentPlayerIndex;
      const from = runtime.playerPositions[playerIndex] ?? 0;
      const to = nextRuntime.playerPositions[playerIndex] ?? from;
      if (to !== from) {
        setUiPhase("moving");
        await animateHops(playerIndex, from, to, to > from);
      }
    }

    if (effect.rollAgain) {
      onRuntimeChange(nextRuntime);
      setUiPhase("ready");
      busyRef.current = false;
      return;
    }

    nextRuntime = nextTurn(nextRuntime, setup.playerCount);
    await finishTurnWithHandoff(nextRuntime);
    busyRef.current = false;
  }, [animateHops, finishTurnWithHandoff, muted, onRuntimeChange, runtime, setup, uiPhase]);

  const handleIncorrect = useCallback(async () => {
    if (uiPhase !== "question" || runtime.turnPhase !== "question") return;
    busyRef.current = true;

    let nextRuntime = markAnswerPhaseComplete(runtime, setup);
    onRuntimeChange(nextRuntime);

    if (setup.enablePenalties !== false) {
      const map = resolveMapForSetup(setup);
      const pathIndex = runtime.playerPositions[runtime.currentPlayerIndex] ?? 0;
      const penalty = pickRandomPenalty();
      const { effect, feedback } = planWrongAnswerSequence(map, pathIndex, penalty);

      const displayFeedback =
        spaceHasExplicitWrong(map, pathIndex) ? feedback : { ...feedback, tone: "penalty" as const };

      await showEffectFeedback(displayFeedback);

      const playerIndex = nextRuntime.currentPlayerIndex;
      const from = nextRuntime.playerPositions[playerIndex] ?? 0;
      nextRuntime = applyResolvedEffect(nextRuntime, setup, effect);
      onRuntimeChange(nextRuntime);

      if (effectRequiresMovement(runtime, nextRuntime)) {
        const to = nextRuntime.playerPositions[playerIndex] ?? from;
        if (to !== from) {
          if (effect.goToPathIndex !== undefined) {
            await jumpToSpace(playerIndex, from, to);
          } else {
            setUiPhase("moving");
            await animateHops(playerIndex, from, to, to > from);
          }
        }
      }

      if (nextRuntime.pendingRollAgain) {
        onRuntimeChange(nextRuntime);
        setUiPhase("ready");
        busyRef.current = false;
        return;
      }
    }

    nextRuntime = nextTurn(nextRuntime, setup.playerCount);
    await finishTurnWithHandoff(nextRuntime);
    busyRef.current = false;
  }, [animateHops, finishTurnWithHandoff, jumpToSpace, onRuntimeChange, runtime, setup, showEffectFeedback, uiPhase]);

  const handleSkip = useCallback(async () => {
    if (uiPhase !== "question" || runtime.turnPhase !== "question") return;
    busyRef.current = true;
    let nextRuntime = skipQuestion(runtime, setup);
    nextRuntime = nextTurn(nextRuntime, setup.playerCount);
    await finishTurnWithHandoff(nextRuntime);
    busyRef.current = false;
  }, [finishTurnWithHandoff, runtime, setup, uiPhase]);

  const canRoll = uiPhase === "ready" && runtime.turnPhase === "roll" && runtime.winnerIndex === null;
  const currentPlayer = getCurrentPlayer(setup, runtime);

  return {
    uiPhase,
    displayPositions: visualPositions,
    diceOverlayOpen,
    diceSpinning,
    diceValue,
    highlightedSpace,
    effectFeedback,
    turnHandoffPlayer,
    showPointGain,
    celebrationMessage,
    pointGainLabel,
    celebrationTitle,
    movingPlayerIndex,
    travelHop,
    canRoll,
    currentPlayer,
    handleRoll,
    handleCorrect,
    handleIncorrect,
    handleSkip,
  };
}

function spaceHasExplicitWrong(map: import("@/lib/board-game/map/types").BoardMap, pathIndex: number): boolean {
  const spaceId = map.pathOrder[pathIndex];
  const space = map.spaces.find((entry) => entry.id === spaceId);
  return Boolean(space?.effects?.onWrong || space?.effects?.wrongPoints !== undefined);
}

function formatScoreDeltaLabel(delta: number): string {
  const sign = delta >= 0 ? "+" : "";
  const noun = Math.abs(delta) === 1 ? "Point" : "Points";
  return `${sign}${delta} ${noun}!`;
}
