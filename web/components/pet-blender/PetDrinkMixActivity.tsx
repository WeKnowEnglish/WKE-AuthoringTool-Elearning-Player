"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { AnimatedPet } from "@/components/pet/AnimatedPet";
import { BlenderScenePlayer } from "@/components/pet-blender/BlenderScenePlayer";
import { IngredientTray } from "@/components/pet-blender/IngredientTray";
import { PetDrinkFlyAnimation } from "@/components/pet-blender/PetDrinkFlyAnimation";
import { PetDrinkRequestBubble } from "@/components/pet-blender/PetDrinkRequestBubble";
import { PetDrinkResultsScreen } from "@/components/pet-blender/PetDrinkResultsScreen";
import { playSfx } from "@/lib/audio/sfx";
import {
  DRINK_MINIGAME_PET_DISPLAY_SCALE,
  DRINK_MINIGAME_PET_LAYOUT,
} from "@/lib/pet/animated-pet";
import { formatRequest } from "@/lib/blender/drink-adjectives";
import type { DrinkFixPrompt } from "@/lib/blender/drink-fix-prompts";
import { DRINK_INGREDIENTS, resolveJuiceColorFromPicks } from "@/lib/blender/drink-ingredients";
import { resolveBlendInteractStateId } from "@/lib/blender/engine";
import {
  buildFixRoundContext,
  createDrinkSession,
  createIngredientTracker,
  markIngredientUsed,
  scoreFixRound,
  scoreMainRound,
  type DrinkSession,
  type DrinkSessionPicks,
  type MainRoundTier,
} from "@/lib/blender/drink-session";
import { loadBlenderScene } from "@/lib/blender/load-scene";
import type { BlenderScene, SplashPosition } from "@/lib/blender/types";
import type { DrinkMiniGameResultTier } from "@/lib/pet/care-actions";
import type { PetMood } from "@/lib/pet/types";

const SPLASH_POSITIONS: SplashPosition[] = ["left", "middle", "right"];
const SPLASH_INTERVAL_MS = 150;
const TASTE_REVEAL_MS = 1600;
const FIX_BLEND_MS = 900;
const FIX_TASTE_MS = 1200;

type BlendKind = "main" | "fix";

type Phase =
  | "requesting"
  | "blending"
  | "tasting"
  | "fixAdding"
  | "fixTasting"
  | "results";

type FlyState = {
  ingredientId: string;
  fromRect: DOMRect;
  toRect: DOMRect;
};

type Props = {
  muted: boolean;
  onComplete: (tier: DrinkMiniGameResultTier) => void;
  onCancel: () => void;
  onPlayAgain: () => void;
};

function emptyPicks(): [string | null, string | null, string | null] {
  return [null, null, null];
}

function picksFilled(picks: [string | null, string | null, string | null]): picks is DrinkSessionPicks {
  return picks.every((p) => p != null);
}

export function PetDrinkMixActivity({
  muted,
  onComplete,
  onCancel,
  onPlayAgain,
}: Props) {
  const [scene, setScene] = useState<BlenderScene | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [session] = useState<DrinkSession>(() => createDrinkSession());
  const [phase, setPhase] = useState<Phase>("requesting");
  const [slotIndex, setSlotIndex] = useState(0);
  const [picks, setPicks] = useState(emptyPicks);
  const [tracker, setTracker] = useState(createIngredientTracker);
  const [splashIndex, setSplashIndex] = useState(0);
  const [blendKind, setBlendKind] = useState<BlendKind>("main");
  const [blendStartedAt, setBlendStartedAt] = useState<number | null>(null);
  const [tasteTier, setTasteTier] = useState<MainRoundTier | null>(null);
  const [fixPrompt, setFixPrompt] = useState<DrinkFixPrompt | null>(null);
  const [resultTier, setResultTier] = useState<DrinkMiniGameResultTier | null>(null);
  const [fly, setFly] = useState<FlyState | null>(null);
  const [pendingPickId, setPendingPickId] = useState<string | null>(null);
  const mainScoredRef = useRef(false);
  const pendingFixTierRef = useRef<DrinkMiniGameResultTier | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const resultsAppliedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadBlenderScene()
      .then((s) => {
        if (!cancelled) setScene(s);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Could not load blender");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const blenderIngredientIds = useMemo(
    () => picks.filter((p): p is string => p != null),
    [picks],
  );

  const juiceColor = resolveJuiceColorFromPicks(blenderIngredientIds);

  const interactStateId = useMemo(() => {
    if (phase === "requesting" || phase === "tasting" || phase === "results") {
      return "powerOff";
    }
    if (!scene) return "powerOn";
    return resolveBlendInteractStateId(scene, juiceColor, splashIndex, SPLASH_POSITIONS);
  }, [phase, splashIndex, juiceColor, scene]);

  const rumbleActive = phase === "blending";

  const showResults = useCallback(
    (tier: DrinkMiniGameResultTier) => {
      setResultTier(tier);
      setPhase("results");
      if (!resultsAppliedRef.current) {
        resultsAppliedRef.current = true;
        onComplete(tier);
      }
    },
    [onComplete],
  );

  const startBlending = useCallback((kind: BlendKind = "main") => {
    setBlendKind(kind);
    setPhase("blending");
    setBlendStartedAt(performance.now());
    setSplashIndex(0);
  }, []);

  const commitPick = useCallback(
    (ingredientId: string) => {
      if (phase === "requesting") {
        if (tracker.usedIngredientIds.has(ingredientId)) return;
        if (slotIndex > 2) return;

        playSfx("tap", muted);
        const nextPicks = [...picks] as [string | null, string | null, string | null];
        nextPicks[slotIndex] = ingredientId;
        setPicks(nextPicks);
        setTracker(markIngredientUsed(tracker, ingredientId));
        setPendingPickId(null);

        if (slotIndex < 2) {
          setSlotIndex(slotIndex + 1);
        } else if (picksFilled(nextPicks)) {
          startBlending();
        }
        return;
      }

      if (phase === "fixAdding") {
        if (tracker.usedIngredientIds.has(ingredientId) || !fixPrompt) return;
        playSfx("tap", muted);
        setTracker(markIngredientUsed(tracker, ingredientId));
        setPendingPickId(null);
        pendingFixTierRef.current = scoreFixRound(
          ingredientId,
          fixPrompt.targetAdjective,
        );
        startBlending("fix");
      }
    },
    [
      phase,
      tracker,
      slotIndex,
      picks,
      muted,
      startBlending,
      fixPrompt,
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
    if (phase !== "blending" || !scene || blendStartedAt === null) return;

    const duration = blendKind === "fix" ? FIX_BLEND_MS : scene.duration;

    const splashTimer = window.setInterval(() => {
      setSplashIndex((i) => (i + 1) % SPLASH_POSITIONS.length);
    }, SPLASH_INTERVAL_MS);

    const doneTimer = window.setTimeout(() => {
      if (blendKind === "fix") {
        const tier = pendingFixTierRef.current ?? "bad";
        pendingFixTierRef.current = null;
        setPhase("fixTasting");
        window.setTimeout(() => showResults(tier), FIX_TASTE_MS);
        return;
      }
      setPhase("tasting");
    }, duration);

    return () => {
      clearInterval(splashTimer);
      clearTimeout(doneTimer);
    };
  }, [phase, scene, blendStartedAt, blendKind, showResults]);

  useEffect(() => {
    if (phase !== "tasting") return;
    if (!picksFilled(picks)) return;
    if (mainScoredRef.current) return;
    mainScoredRef.current = true;

    const score = scoreMainRound(picks, session.requests);
    setTasteTier(score.tier);

    if (score.tier === "good") {
      playSfx("complete", muted);
      const t = window.setTimeout(() => showResults("good"), TASTE_REVEAL_MS);
      return () => clearTimeout(t);
    }

    if (score.tier === "bad") {
      playSfx("wrong", muted);
      const t = window.setTimeout(() => showResults("bad"), TASTE_REVEAL_MS);
      return () => clearTimeout(t);
    }

    const failedSlot = score.failedSlotIndex!;
    const t = window.setTimeout(() => {
      setFixPrompt(buildFixRoundContext(session.requests, picks, failedSlot));
      setPhase("fixAdding");
    }, TASTE_REVEAL_MS);
    return () => clearTimeout(t);
  }, [phase, picks, session.requests, muted, showResults]);

  const currentRequest = session.requests[slotIndex];
  const requestDisplay =
    phase === "requesting" ? formatRequest(currentRequest!) : null;

  const companionMood = useMemo((): PetMood => {
    if (phase === "results" && resultTier === "good") return "excited";
    if (phase === "results") return "normal";
    if (phase === "tasting" || phase === "fixTasting") {
      if (tasteTier === "good") return "excited";
      if (tasteTier === "bad") return "normal";
      return "playful";
    }
    return "playful";
  }, [phase, tasteTier, resultTier]);

  const tasteMessage = useMemo(() => {
    if (phase === "tasting") {
      if (tasteTier === "good") return "Perfect drink!";
      if (tasteTier === "bad") return "Yuck! Not quite right…";
      return "Almost!";
    }
    if (phase === "fixTasting") return "Let's see…";
    return null;
  }, [phase, tasteTier]);

  const trayEnabled = phase === "requesting" || phase === "fixAdding";
  const requestBubbleClass =
    "py-2 px-3 shadow-[2px_2px_0_#0a2f86] [&_p]:text-sm sm:[&_p]:text-base";

  if (phase === "results" && resultTier) {
    return (
      <PetDrinkResultsScreen
        tier={resultTier}
        muted={muted}
        onReturn={onCancel}
        onPlayAgain={onPlayAgain}
      />
    );
  }

  if (loadError) {
    return (
      <KidPanel className="text-center">
        <p className="font-semibold text-red-800">{loadError}</p>
        <KidButton type="button" variant="secondary" className="mt-3" onClick={onCancel}>
          Close
        </KidButton>
      </KidPanel>
    );
  }

  if (!scene) {
    return (
      <KidPanel className="py-8 text-center">
        <p className="font-semibold text-kid-ink/80">Loading blender…</p>
      </KidPanel>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-1.5">
      {fly ?
        <PetDrinkFlyAnimation
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
        <PetDrinkRequestBubble
          className={clsx("shrink-0", requestBubbleClass)}
          line={requestDisplay.line}
          speakText={requestDisplay.speakText}
          cueEmoji={requestDisplay.cueEmoji}
          highlightAdjective={requestDisplay.adjective}
          slotIndicator={`Ingredient ${slotIndex + 1} of 3`}
          muted={muted}
        />
      : null}

      {phase === "fixAdding" && fixPrompt ?
        <PetDrinkRequestBubble
          className={clsx("shrink-0", requestBubbleClass)}
          line={fixPrompt.line}
          speakText={fixPrompt.speakText}
          cueEmoji={fixPrompt.cueEmoji}
          highlightAdjective={fixPrompt.targetAdjective}
          muted={muted}
        />
      : null}

      <div className="relative h-0 min-h-[min(36dvh,260px)] flex-1">
        <div
          className={clsx(
            "absolute inset-0",
            phase === "blending" && "pet-blender-shake",
          )}
        >
          <BlenderScenePlayer
            scene={scene}
            interactStateId={interactStateId}
            rumbleActive={rumbleActive}
            knobEnabled={false}
            size="fill"
            className="h-full w-full"
          />
          <div
            ref={dropZoneRef}
            aria-hidden
            className={clsx(
              "absolute left-[22%] top-[38%] h-[28%] w-[56%] rounded-2xl border-2 border-dashed transition-colors",
              trayEnabled ?
                "border-amber-400/90 bg-amber-100/25"
              : "pointer-events-none border-amber-500/40 bg-amber-100/10",
            )}
          />
          {phase === "blending" ?
            <p className="absolute bottom-0 left-0 right-0 text-center text-xs font-extrabold text-kid-ink sm:text-sm">
              Blending…
            </p>
          : null}
          {tasteMessage ?
            <p
              className={clsx(
                "absolute bottom-0 left-0 right-0 z-20 text-center text-xs font-extrabold drop-shadow sm:text-sm",
                tasteTier === "good" ? "text-emerald-800"
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
            right: DRINK_MINIGAME_PET_LAYOUT.rightPx,
            bottom: DRINK_MINIGAME_PET_LAYOUT.bottomPx,
            transform: `translate(${DRINK_MINIGAME_PET_LAYOUT.translateXPx}px, ${DRINK_MINIGAME_PET_LAYOUT.translateYPx}px)`,
          }}
        >
          <AnimatedPet
            mood={companionMood}
            size="lg"
            displayScale={DRINK_MINIGAME_PET_DISPLAY_SCALE}
            displayAnchor="bottom"
          />
        </div>
      </div>

      {phase === "requesting" ?
        <p className="shrink-0 text-center text-[10px] font-bold text-kid-ink/75 sm:text-xs">
          In blender: {blenderIngredientIds.length} / 3
        </p>
      : null}

      {trayEnabled ?
        <div className="shrink-0">
          <IngredientTray
            ingredients={DRINK_INGREDIENTS}
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
