"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { AnimatedPet } from "@/components/pet/AnimatedPet";
import {
  exercisePetClimbTranslateY,
  LadderStackView,
} from "@/components/pet-exercise/LadderStackView";
import { PetExerciseFlyAnimation } from "@/components/pet-exercise/PetExerciseFlyAnimation";
import { PetExerciseRequestBubble } from "@/components/pet-exercise/PetExerciseRequestBubble";
import { PetExerciseResultsScreen } from "@/components/pet-exercise/PetExerciseResultsScreen";
import { WordTileTray } from "@/components/pet-exercise/WordTileTray";
import { playSfx } from "@/lib/audio/sfx";
import type { ExerciseFixPrompt } from "@/lib/exercise/exercise-fix-prompts";
import {
  buildFixRoundContext,
  createExerciseSession,
  createTileTracker,
  formatSlotRequest,
  markTileUsed,
  scoreFixRound,
  scoreMainRound,
  type ExerciseSession,
  type ExerciseSessionPicks,
  type ExerciseSlotIndex,
  type MainRoundTier,
} from "@/lib/exercise/exercise-session";
import {
  EXERCISE_MINIGAME_PET_DISPLAY_SCALE,
  EXERCISE_MINIGAME_PET_LAYOUT,
} from "@/lib/pet/animated-pet";
import type { ExerciseMiniGameResultTier } from "@/lib/pet/care-actions";
import type { PetMood } from "@/lib/pet/types";

const CHECKING_MS = 1600;
const FIX_CHECKING_MS = 1200;

type Phase =
  | "requesting"
  | "checking"
  | "fixAdding"
  | "fixChecking"
  | "results";

type FlyState = {
  tileId: string;
  fromRect: DOMRect;
  toRect: DOMRect;
};

type Props = {
  muted: boolean;
  onComplete: (tier: ExerciseMiniGameResultTier) => void;
  onCancel: () => void;
  onPlayAgain: () => void;
};

function emptyPicks(): [
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
] {
  return [null, null, null, null, null, null];
}

function picksFilled(
  picks: [
    string | null,
    string | null,
    string | null,
    string | null,
    string | null,
    string | null,
  ],
): picks is ExerciseSessionPicks {
  return picks.every((p) => p != null);
}

export function PetExerciseClimbActivity({
  muted,
  onComplete,
  onCancel,
  onPlayAgain,
}: Props) {
  const [session] = useState<ExerciseSession>(() => createExerciseSession());
  const [phase, setPhase] = useState<Phase>("requesting");
  const [slotIndex, setSlotIndex] = useState(0);
  const [picks, setPicks] = useState(emptyPicks);
  const [tracker, setTracker] = useState(createTileTracker);
  const [checkTier, setCheckTier] = useState<MainRoundTier | null>(null);
  const [fixPrompt, setFixPrompt] = useState<ExerciseFixPrompt | null>(null);
  const [failedSlotIndex, setFailedSlotIndex] = useState<ExerciseSlotIndex | null>(
    null,
  );
  const [resultTier, setResultTier] = useState<ExerciseMiniGameResultTier | null>(
    null,
  );
  const [fly, setFly] = useState<FlyState | null>(null);
  const [pendingPickId, setPendingPickId] = useState<string | null>(null);
  const mainScoredRef = useRef(false);
  const pendingFixTierRef = useRef<ExerciseMiniGameResultTier | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const resultsAppliedRef = useRef(false);

  const trayTiles = useMemo(() => {
    const byId = new Map(session.tiles.map((t) => [t.id, t]));
    return session.trayOrder
      .map((id) => byId.get(id))
      .filter((t): t is NonNullable<typeof t> => t != null);
  }, [session.tiles, session.trayOrder]);

  const filledCount = picks.filter((p) => p != null).length;

  const showResults = useCallback(
    (tier: ExerciseMiniGameResultTier) => {
      setResultTier(tier);
      setPhase("results");
      if (!resultsAppliedRef.current) {
        resultsAppliedRef.current = true;
        onComplete(tier);
      }
    },
    [onComplete],
  );

  const commitPick = useCallback(
    (tileId: string) => {
      if (phase === "requesting") {
        if (tracker.usedTileIds.has(tileId)) return;
        if (slotIndex > 5) return;

        playSfx("tap", muted);
        const nextPicks = [...picks] as [
          string | null,
          string | null,
          string | null,
          string | null,
          string | null,
          string | null,
        ];
        nextPicks[slotIndex] = tileId;
        setPicks(nextPicks);
        setTracker(markTileUsed(tracker, tileId));
        setPendingPickId(null);

        if (slotIndex < 5) {
          setSlotIndex(slotIndex + 1);
        } else if (picksFilled(nextPicks)) {
          setPhase("checking");
        }
        return;
      }

      if (phase === "fixAdding") {
        if (tracker.usedTileIds.has(tileId) || !fixPrompt) return;
        if (failedSlotIndex == null) return;

        playSfx("tap", muted);
        const nextPicks = [...picks] as ExerciseSessionPicks;
        nextPicks[failedSlotIndex] = tileId;
        setPicks(nextPicks);
        setTracker(markTileUsed(tracker, tileId));
        setPendingPickId(null);
        pendingFixTierRef.current = scoreFixRound(tileId, fixPrompt.targetWord);
        setPhase("fixChecking");
      }
    },
    [phase, tracker, slotIndex, picks, muted, fixPrompt, failedSlotIndex],
  );

  const handlePick = useCallback(
    (tileId: string, sourceEl: HTMLElement | null) => {
      if (phase !== "requesting" && phase !== "fixAdding") return;
      if (tracker.usedTileIds.has(tileId)) return;
      if (pendingPickId) return;

      const dropEl = dropZoneRef.current;
      if (sourceEl && dropEl) {
        setPendingPickId(tileId);
        setFly({
          tileId,
          fromRect: sourceEl.getBoundingClientRect(),
          toRect: dropEl.getBoundingClientRect(),
        });
        return;
      }

      commitPick(tileId);
    },
    [phase, tracker, pendingPickId, commitPick],
  );

  useEffect(() => {
    if (phase !== "fixChecking") return;
    const tier = pendingFixTierRef.current ?? "bad";
    pendingFixTierRef.current = null;
    const t = window.setTimeout(() => showResults(tier), FIX_CHECKING_MS);
    return () => clearTimeout(t);
  }, [phase, showResults]);

  useEffect(() => {
    if (phase !== "checking") return;
    if (!picksFilled(picks)) return;
    if (mainScoredRef.current) return;
    mainScoredRef.current = true;

    const score = scoreMainRound(picks, session.expectedSequence);
    setCheckTier(score.tier);

    if (score.tier === "good") {
      playSfx("complete", muted);
      const t = window.setTimeout(() => showResults("good"), CHECKING_MS);
      return () => clearTimeout(t);
    }

    if (score.tier === "bad") {
      playSfx("wrong", muted);
      const t = window.setTimeout(() => showResults("bad"), CHECKING_MS);
      return () => clearTimeout(t);
    }

    const failedSlot = score.failedSlotIndex!;
    const t = window.setTimeout(() => {
      setFailedSlotIndex(failedSlot);
      setFixPrompt(
        buildFixRoundContext(
          session.expectedSequence,
          picks,
          failedSlot,
        ),
      );
      setPhase("fixAdding");
    }, CHECKING_MS);
    return () => clearTimeout(t);
  }, [phase, picks, session.expectedSequence, muted, showResults]);

  const currentExpected = session.expectedSequence[slotIndex];
  const requestDisplay =
    phase === "requesting" && currentExpected ?
      formatSlotRequest(currentExpected)
    : null;

  const companionMood = useMemo((): PetMood => {
    if (phase === "results" && resultTier === "good") return "excited";
    if (phase === "results") return "normal";
    if (phase === "checking" || phase === "fixChecking") {
      if (checkTier === "good") return "excited";
      if (checkTier === "bad") return "normal";
      return "playful";
    }
    return "playful";
  }, [phase, checkTier, resultTier]);

  const checkMessage = useMemo(() => {
    if (phase === "checking") {
      if (checkTier === "good") return "Perfect climb!";
      if (checkTier === "bad") return "Not quite right…";
      return "Almost!";
    }
    if (phase === "fixChecking") return "Let's see…";
    return null;
  }, [phase, checkTier]);

  const trayEnabled = phase === "requesting" || phase === "fixAdding";
  const requestBubbleClass =
    "py-2 px-3 shadow-[2px_2px_0_#0a2f86] [&_p]:text-sm sm:[&_p]:text-base";

  const petClimbY = exercisePetClimbTranslateY(filledCount);

  if (phase === "results" && resultTier) {
    return (
      <PetExerciseResultsScreen
        tier={resultTier}
        muted={muted}
        onReturn={onCancel}
        onPlayAgain={onPlayAgain}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-1.5">
      {fly ?
        <PetExerciseFlyAnimation
          tileId={fly.tileId}
          tiles={session.tiles}
          fromRect={fly.fromRect}
          toRect={fly.toRect}
          onDone={() => {
            const id = fly.tileId;
            setFly(null);
            commitPick(id);
          }}
        />
      : null}

      {requestDisplay ?
        <PetExerciseRequestBubble
          className={clsx("shrink-0", requestBubbleClass)}
          line={requestDisplay.line}
          speakText={requestDisplay.speakText}
          cueEmoji="🪜"
          highlightWord={requestDisplay.highlightWord}
          slotIndicator={`Step ${slotIndex + 1} of 6`}
          muted={muted}
        />
      : null}

      {phase === "fixAdding" && fixPrompt ?
        <PetExerciseRequestBubble
          className={clsx("shrink-0", requestBubbleClass)}
          line={fixPrompt.line}
          speakText={fixPrompt.speakText}
          cueEmoji={fixPrompt.cueEmoji}
          highlightWord={fixPrompt.highlightWord}
          muted={muted}
        />
      : null}

      <div className="relative h-0 min-h-[min(36dvh,260px)] flex-1">
        <div className="absolute inset-0 flex flex-col">
          <div
            ref={dropZoneRef}
            className="relative mx-auto h-full w-full max-w-[280px] flex-1"
          >
            <LadderStackView
              tileIds={picks}
              tiles={session.tiles}
              className="h-full"
            />
            {trayEnabled ?
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-[12%] top-[12%] bottom-[20%] rounded-2xl border-2 border-dashed border-lime-500/50 bg-lime-100/20"
              />
            : null}
          </div>
          {checkMessage ?
            <p
              className={clsx(
                "shrink-0 py-1 text-center text-xs font-extrabold sm:text-sm",
                checkTier === "good" ? "text-emerald-800"
                : checkTier === "bad" ? "text-rose-800"
                : "text-amber-900",
              )}
            >
              {checkMessage}
            </p>
          : null}
        </div>
        <div
          className="pointer-events-none absolute z-20 transition-transform duration-500 ease-out"
          style={{
            right: EXERCISE_MINIGAME_PET_LAYOUT.rightPx,
            bottom: EXERCISE_MINIGAME_PET_LAYOUT.bottomPx,
            transform: `translate(${EXERCISE_MINIGAME_PET_LAYOUT.translateXPx}px, ${EXERCISE_MINIGAME_PET_LAYOUT.translateYPx + petClimbY}px)`,
          }}
        >
          <AnimatedPet
            mood={companionMood}
            size="lg"
            displayScale={EXERCISE_MINIGAME_PET_DISPLAY_SCALE}
            displayAnchor="bottom"
          />
        </div>
      </div>

      {phase === "requesting" ?
        <p className="shrink-0 text-center text-[10px] font-bold text-kid-ink/75 sm:text-xs">
          Words on ladder: {filledCount} / 6
        </p>
      : null}

      {trayEnabled ?
        <div className="shrink-0 px-1">
          <WordTileTray
            tiles={trayTiles}
            disabled={!trayEnabled || pendingPickId != null}
            usedTileIds={tracker.usedTileIds}
            dropZoneRef={dropZoneRef}
            onPick={handlePick}
          />
        </div>
      : null}

      <div className="flex shrink-0 justify-center pt-0.5">
        <KidButton type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </KidButton>
      </div>
    </div>
  );
}
