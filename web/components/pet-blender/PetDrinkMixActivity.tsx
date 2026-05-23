"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { AnimatedPet } from "@/components/pet/AnimatedPet";
import { BlenderScenePlayer } from "@/components/pet-blender/BlenderScenePlayer";
import { FruitTray } from "@/components/pet-blender/FruitTray";
import { playSfx } from "@/lib/audio/sfx";
import { resolveBlendInteractStateId } from "@/lib/blender/engine";
import {
  FRUIT_TRAY,
  pickRecipeForSession,
  recipeMatchesFruits,
  resolveJuiceColor,
  type DrinkRecipe,
} from "@/lib/blender/drink-recipes";
import { loadBlenderScene } from "@/lib/blender/load-scene";
import type { BlenderScene, SplashPosition } from "@/lib/blender/types";
import type { PetMood } from "@/lib/pet/types";

const SPLASH_POSITIONS: SplashPosition[] = ["left", "middle", "right"];
const SPLASH_INTERVAL_MS = 150;

type Phase = "adding" | "ready" | "blending" | "served";

type Props = {
  muted: boolean;
  onSuccess: () => void;
  onCancel: () => void;
};

export function PetDrinkMixActivity({ muted, onSuccess, onCancel }: Props) {
  const [scene, setScene] = useState<BlenderScene | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recipe] = useState<DrinkRecipe>(() => pickRecipeForSession());
  const [phase, setPhase] = useState<Phase>("adding");
  const [blenderFruits, setBlenderFruits] = useState<string[]>([]);
  const [splashIndex, setSplashIndex] = useState(0);
  const [blendStartedAt, setBlendStartedAt] = useState<number | null>(null);

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

  const juiceColor = resolveJuiceColor(recipe, blenderFruits);
  const requiredCount = recipe.requiredFruitIds.length;

  const interactStateId = useMemo(() => {
    if (phase === "adding" || phase === "ready") return "powerOff";
    if (phase === "served") return "powerOff";
    if (!scene) return "powerOn";
    return resolveBlendInteractStateId(scene, juiceColor, splashIndex, SPLASH_POSITIONS);
  }, [phase, splashIndex, juiceColor, scene]);

  const rumbleActive = phase === "blending";

  const tryAddFruit = useCallback(
    (fruitId: string) => {
      if (phase !== "adding") return;
      if (blenderFruits.length >= requiredCount) return;

      const allowed = new Set(recipe.requiredFruitIds);
      if (!allowed.has(fruitId)) {
        playSfx("wrong", muted);
        return;
      }

      playSfx("tap", muted);
      const next = [...blenderFruits, fruitId];
      setBlenderFruits(next);
      if (next.length >= requiredCount) {
        if (recipeMatchesFruits(recipe, next)) {
          playSfx("correct", muted);
          setPhase("ready");
        } else {
          playSfx("wrong", muted);
          setBlenderFruits([]);
        }
      }
    },
    [recipe, phase, blenderFruits, requiredCount, muted],
  );

  const onKnobClick = useCallback(() => {
    if (phase !== "ready" || !scene) return;
    playSfx("tap", muted);
    setPhase("blending");
    setBlendStartedAt(performance.now());
    setSplashIndex(0); // first splash frame after powerOn-equivalent splash state
  }, [phase, scene, muted]);

  useEffect(() => {
    if (phase !== "blending" || !scene || blendStartedAt === null) return;

    const splashTimer = window.setInterval(() => {
      setSplashIndex((i) => (i + 1) % SPLASH_POSITIONS.length);
    }, SPLASH_INTERVAL_MS);

    const doneTimer = window.setTimeout(() => {
      setPhase("served");
      playSfx("complete", muted);
    }, scene.duration);

    return () => {
      clearInterval(splashTimer);
      clearTimeout(doneTimer);
    };
  }, [phase, scene, blendStartedAt, muted]);

  useEffect(() => {
    if (phase !== "served") return;
    const t = window.setTimeout(() => {
      onSuccess();
    }, 900);
    return () => clearTimeout(t);
  }, [phase, onSuccess]);

  const usedFruitIds = useMemo(() => new Set(blenderFruits), [blenderFruits]);

  const companionMood = useMemo((): PetMood => {
    if (phase === "served") return "excited";
    return "playful";
  }, [phase]);

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
    <div className="flex flex-col gap-3">
      <KidPanel className="border-sky-800 bg-sky-50 py-3 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-sky-900/80">
          Your pet wants
        </p>
        <p className="mt-1 text-lg font-extrabold text-kid-ink">{recipe.label}</p>
        <p className="mt-1 text-sm font-semibold text-kid-ink/85">
          Mix {recipe.prompt} — add {requiredCount} fruits, then turn the knob!
        </p>
      </KidPanel>

      <div className="flex items-end justify-center gap-1 sm:gap-2">
        <div
          className={clsx(
            "relative min-w-0 flex-1",
            phase === "blending" && "pet-blender-shake",
          )}
        >
          <BlenderScenePlayer
            scene={scene}
            interactStateId={interactStateId}
            rumbleActive={rumbleActive}
            knobEnabled={phase === "ready"}
            onKnobClick={onKnobClick}
          />
          {phase === "adding" ?
            <div
              aria-hidden
              className="pointer-events-none absolute left-[22%] top-[38%] h-[28%] w-[56%] rounded-2xl border-2 border-dashed border-amber-500/70 bg-amber-100/20"
            />
          : null}
          {phase === "ready" ?
            <p className="absolute bottom-0 left-0 right-0 text-center text-sm font-extrabold text-amber-900 animate-pulse">
              Turn the knob on!
            </p>
          : null}
          {phase === "blending" ?
            <p className="absolute bottom-0 left-0 right-0 text-center text-sm font-extrabold text-kid-ink">
              Blending…
            </p>
          : null}
          {phase === "served" ?
            <p className="absolute bottom-0 left-0 right-0 text-center text-sm font-extrabold text-emerald-800">
              Yum! Your pet loved it!
            </p>
          : null}
        </div>
        <AnimatedPet
          mood={companionMood}
          size="lg"
          className="pointer-events-none shrink-0 self-end"
        />
      </div>

      <div className="text-center text-xs font-bold text-kid-ink/70">
        In blender: {blenderFruits.length} / {requiredCount}
      </div>

      <FruitTray
        fruits={FRUIT_TRAY}
        disabled={phase !== "adding"}
        usedFruitIds={usedFruitIds}
        onPick={tryAddFruit}
      />

      <div className="flex justify-center gap-2">
        <KidButton type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </KidButton>
      </div>
    </div>
  );
}
