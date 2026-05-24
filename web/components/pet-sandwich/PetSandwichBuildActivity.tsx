"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { AnimatedPet } from "@/components/pet/AnimatedPet";
import { PetSandwichFlyAnimation } from "@/components/pet-sandwich/PetSandwichFlyAnimation";
import { PetSandwichRequestBubble } from "@/components/pet-sandwich/PetSandwichRequestBubble";
import { PetSandwichResultsScreen } from "@/components/pet-sandwich/PetSandwichResultsScreen";
import { SandwichIngredientTray } from "@/components/pet-sandwich/SandwichIngredientTray";
import { SandwichStackView } from "@/components/pet-sandwich/SandwichStackView";
import { playSfx } from "@/lib/audio/sfx";
import {
  SANDWICH_MINIGAME_PET_DISPLAY_SCALE,
  SANDWICH_MINIGAME_PET_LAYOUT,
  SANDWICH_MINIGAME_STACK_TRANSLATE_Y_PX,
} from "@/lib/pet/animated-pet";
import type { SandwichMiniGameResultTier } from "@/lib/pet/care-actions";
import type { PetMood } from "@/lib/pet/types";
import { formatRequest } from "@/lib/sandwich/sandwich-requests";
import type { SandwichFixPrompt } from "@/lib/sandwich/sandwich-fix-prompts";
import { SANDWICH_TRAY_INGREDIENTS } from "@/lib/sandwich/sandwich-ingredients";
import {
  buildFixRoundContext,
  createIngredientTracker,
  createSandwichSession,
  markIngredientUsed,
  scoreFixRound,
  scoreMainRound,
  type MainRoundTier,
  type SandwichSession,
  type SandwichSessionPicks,
  type SandwichSlotIndex,
} from "@/lib/sandwich/sandwich-session";

const CLOSE_MS = 700;
const TASTE_REVEAL_MS = 1600;
const FIX_CLOSE_MS = 700;
const FIX_TASTE_MS = 1200;
const EAT_MS = 1400;

type Phase =
  | "requesting"
  | "closing"
  | "tasting"
  | "fixAdding"
  | "fixClosing"
  | "fixTasting"
  | "eating"
  | "results";

type FlyState = {
  ingredientId: string;
  fromRect: DOMRect;
  toRect: DOMRect;
};

type Props = {
  muted: boolean;
  onComplete: (tier: SandwichMiniGameResultTier) => void;
  onCancel: () => void;
  onPlayAgain: () => void;
};

function emptyPicks(): [string | null, string | null, string | null, string | null] {
  return [null, null, null, null];
}

function picksFilled(
  picks: [string | null, string | null, string | null, string | null],
): picks is SandwichSessionPicks {
  return picks.every((p) => p != null);
}

export function PetSandwichBuildActivity({
  muted,
  onComplete,
  onCancel,
  onPlayAgain,
}: Props) {
  const [session] = useState<SandwichSession>(() => createSandwichSession());
  const [phase, setPhase] = useState<Phase>("requesting");
  const [slotIndex, setSlotIndex] = useState(0);
  const [picks, setPicks] = useState(emptyPicks);
  const [tracker, setTracker] = useState(createIngredientTracker);
  const [tasteTier, setTasteTier] = useState<MainRoundTier | null>(null);
  const [fixPrompt, setFixPrompt] = useState<SandwichFixPrompt | null>(null);
  const [failedSlotIndex, setFailedSlotIndex] = useState<SandwichSlotIndex | null>(
    null,
  );
  const [resultTier, setResultTier] = useState<SandwichMiniGameResultTier | null>(
    null,
  );
  const [fly, setFly] = useState<FlyState | null>(null);
  const [pendingPickId, setPendingPickId] = useState<string | null>(null);
  const [topBreadAnimating, setTopBreadAnimating] = useState(false);
  const mainScoredRef = useRef(false);
  const pendingFixTierRef = useRef<SandwichMiniGameResultTier | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const resultsAppliedRef = useRef(false);

  const showResults = useCallback(
    (tier: SandwichMiniGameResultTier) => {
      setResultTier(tier);
      setPhase("results");
      if (!resultsAppliedRef.current) {
        resultsAppliedRef.current = true;
        onComplete(tier);
      }
    },
    [onComplete],
  );

  const startClosing = useCallback((kind: "main" | "fix" = "main") => {
    setTopBreadAnimating(true);
    setPhase(kind === "fix" ? "fixClosing" : "closing");
  }, []);

  const commitPick = useCallback(
    (ingredientId: string) => {
      if (phase === "requesting") {
        if (tracker.usedIngredientIds.has(ingredientId)) return;
        if (slotIndex > 3) return;

        playSfx("tap", muted);
        const nextPicks = [...picks] as [
          string | null,
          string | null,
          string | null,
          string | null,
        ];
        nextPicks[slotIndex] = ingredientId;
        setPicks(nextPicks);
        setTracker(markIngredientUsed(tracker, ingredientId));
        setPendingPickId(null);

        if (slotIndex < 3) {
          setSlotIndex(slotIndex + 1);
        } else if (picksFilled(nextPicks)) {
          startClosing("main");
        }
        return;
      }

      if (phase === "fixAdding") {
        if (tracker.usedIngredientIds.has(ingredientId) || !fixPrompt) return;
        if (failedSlotIndex == null) return;

        playSfx("tap", muted);
        const nextPicks = [...picks] as SandwichSessionPicks;
        nextPicks[failedSlotIndex] = ingredientId;
        setPicks(nextPicks);
        setTracker(markIngredientUsed(tracker, ingredientId));
        setPendingPickId(null);
        pendingFixTierRef.current = scoreFixRound(
          ingredientId,
          fixPrompt.targetIngredientId,
        );
        startClosing("fix");
      }
    },
    [
      phase,
      tracker,
      slotIndex,
      picks,
      muted,
      startClosing,
      fixPrompt,
      failedSlotIndex,
    ],
  );

  const handlePick = useCallback(
    (ingredientId: string, sourceEl: HTMLElement | null) => {
      if (phase !== "requesting" && phase !== "fixAdding") return;
      if (tracker.usedIngredientIds.has(ingredientId)) return;
      if (pendingPickId) return;

      const dropEl = dropZoneRef.current;
      if (sourceEl && dropEl) {
        setPendingPickId(ingredientId);
        setFly({
          ingredientId,
          fromRect: sourceEl.getBoundingClientRect(),
          toRect: dropEl.getBoundingClientRect(),
        });
        return;
      }

      commitPick(ingredientId);
    },
    [phase, tracker, pendingPickId, commitPick],
  );

  useEffect(() => {
    if (phase !== "closing") return;
    const t = window.setTimeout(() => {
      setTopBreadAnimating(false);
      setPhase("tasting");
    }, CLOSE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "fixClosing") return;
    const t = window.setTimeout(() => {
      setTopBreadAnimating(false);
      setPhase("fixTasting");
      const tier = pendingFixTierRef.current ?? "bad";
      pendingFixTierRef.current = null;
      window.setTimeout(() => showResults(tier), FIX_TASTE_MS);
    }, FIX_CLOSE_MS);
    return () => clearTimeout(t);
  }, [phase, showResults]);

  useEffect(() => {
    if (phase !== "tasting") return;
    if (!picksFilled(picks)) return;
    if (mainScoredRef.current) return;
    mainScoredRef.current = true;

    const score = scoreMainRound(picks, session.requests);
    setTasteTier(score.tier);

    if (score.tier === "good") {
      playSfx("complete", muted);
      const t = window.setTimeout(() => setPhase("eating"), TASTE_REVEAL_MS);
      return () => clearTimeout(t);
    }

    if (score.tier === "bad") {
      playSfx("wrong", muted);
      const t = window.setTimeout(() => showResults("bad"), TASTE_REVEAL_MS);
      return () => clearTimeout(t);
    }

    const failedSlot = score.failedSlotIndex!;
    const t = window.setTimeout(() => {
      setFailedSlotIndex(failedSlot);
      setFixPrompt(buildFixRoundContext(session.requests, picks, failedSlot));
      setPhase("fixAdding");
    }, TASTE_REVEAL_MS);
    return () => clearTimeout(t);
  }, [phase, picks, session.requests, muted, showResults]);

  useEffect(() => {
    if (phase !== "eating") return;
    const t = window.setTimeout(() => showResults("good"), EAT_MS);
    return () => clearTimeout(t);
  }, [phase, showResults]);

  const layerIds = picks;
  const topBreadVisible =
    phase === "closing" ||
    phase === "tasting" ||
    phase === "eating" ||
    phase === "fixAdding" ||
    phase === "fixClosing" ||
    phase === "fixTasting";

  const currentRequest = session.requests[slotIndex];
  const requestDisplay =
    phase === "requesting" ? formatRequest(currentRequest!) : null;

  const companionMood = useMemo((): PetMood => {
    if (phase === "results" && resultTier === "good") return "excited";
    if (phase === "results") return "normal";
    if (phase === "eating") return "excited";
    if (phase === "tasting" || phase === "fixTasting") {
      if (tasteTier === "good") return "excited";
      if (tasteTier === "bad") return "normal";
      return "playful";
    }
    return "playful";
  }, [phase, tasteTier, resultTier]);

  const tasteMessage = useMemo(() => {
    if (phase === "tasting") {
      if (tasteTier === "good") return "Perfect sandwich!";
      if (tasteTier === "bad") return "Yuck! Not quite right…";
      return "Almost!";
    }
    if (phase === "fixTasting") return "Let's see…";
    if (phase === "eating") return "Yum!";
    if (phase === "closing") return "Closing it up…";
    return null;
  }, [phase, tasteTier]);

  const trayEnabled = phase === "requesting" || phase === "fixAdding";
  const requestBubbleClass =
    "py-2 px-3 shadow-[2px_2px_0_#0a2f86] [&_p]:text-sm sm:[&_p]:text-base";

  const layerCount = picks.filter((p) => p != null).length;

  if (phase === "results" && resultTier) {
    return (
      <PetSandwichResultsScreen
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
        <PetSandwichFlyAnimation
          ingredientId={fly.ingredientId}
          fromRect={fly.fromRect}
          toRect={fly.toRect}
          onDone={() => {
            const id = fly.ingredientId;
            setFly(null);
            commitPick(id);
          }}
        />
      : null}

      {requestDisplay ?
        <PetSandwichRequestBubble
          className={clsx("shrink-0", requestBubbleClass)}
          line={requestDisplay.line}
          speakText={requestDisplay.speakText}
          cueEmoji={requestDisplay.cueEmoji}
          highlightWord={requestDisplay.highlightWord}
          slotIndicator={`Layer ${slotIndex + 1} of 4`}
          muted={muted}
        />
      : null}

      {phase === "fixAdding" && fixPrompt ?
        <PetSandwichRequestBubble
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
            className="relative mx-auto h-full w-full max-w-[240px] flex-1"
          >
            <SandwichStackView
              layerIds={layerIds}
              topBreadVisible={topBreadVisible}
              topBreadAnimating={topBreadAnimating}
              className="h-full"
            />
            {trayEnabled ?
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-[18%] top-[18%] bottom-[28%] rounded-2xl border-2 border-dashed border-emerald-500/50 bg-emerald-100/20"
                style={{
                  transform: `translateY(${SANDWICH_MINIGAME_STACK_TRANSLATE_Y_PX}px)`,
                }}
              />
            : null}
          </div>
          {tasteMessage ?
            <p
              className={clsx(
                "shrink-0 py-1 text-center text-xs font-extrabold sm:text-sm",
                tasteTier === "good" || phase === "eating" ? "text-emerald-800"
                : tasteTier === "bad" ? "text-rose-800"
                : "text-amber-900",
              )}
            >
              {tasteMessage}
            </p>
          : null}
        </div>
        <div
          className="pointer-events-none absolute z-20"
          style={{
            right: SANDWICH_MINIGAME_PET_LAYOUT.rightPx,
            bottom: SANDWICH_MINIGAME_PET_LAYOUT.bottomPx,
            transform: `translate(${SANDWICH_MINIGAME_PET_LAYOUT.translateXPx}px, ${SANDWICH_MINIGAME_PET_LAYOUT.translateYPx}px)`,
          }}
        >
          <AnimatedPet
            mood={companionMood}
            size="lg"
            displayScale={SANDWICH_MINIGAME_PET_DISPLAY_SCALE}
            displayAnchor="bottom"
          />
        </div>
      </div>

      {phase === "requesting" ?
        <p className="shrink-0 text-center text-[10px] font-bold text-kid-ink/75 sm:text-xs">
          Layers: {layerCount} / 4
        </p>
      : null}

      {trayEnabled ?
        <div className="shrink-0 px-1">
          <SandwichIngredientTray
            ingredients={SANDWICH_TRAY_INGREDIENTS}
            disabled={!trayEnabled || pendingPickId != null}
            usedIngredientIds={tracker.usedIngredientIds}
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
