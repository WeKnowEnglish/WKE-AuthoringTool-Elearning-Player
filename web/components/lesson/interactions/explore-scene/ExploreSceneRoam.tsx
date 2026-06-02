"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExploreSceneDpad } from "./ExploreSceneDpad";
import { ExploreSceneHud } from "./ExploreSceneHud";
import { ExploreSceneMapLayer } from "./ExploreSceneMapLayer";
import { ExploreScenePickupPanel } from "./ExploreScenePickupPanel";
import { playSfx } from "@/lib/audio/sfx";
import { unlockSpeechSynthesis } from "@/lib/audio/tts";
import {
  collectMaterialPickup,
  collectWordPickup,
  createExploreSceneState,
  findInteractTarget,
  resolveCurrentZone,
  tickExploreSceneMovement,
  type ExploreSceneInteractTarget,
  type ExploreSceneRunState,
} from "@/lib/explore/explore-scene-engine";
import type { ExploreSceneDefinition } from "@/lib/explore/scenes/types";
import { grantWordLoot } from "@/lib/word-collection";

type Props = {
  scene: ExploreSceneDefinition;
  muted: boolean;
  isPreview?: boolean;
  runKey?: string;
  onReadyForCloze: (collectedWordIds: string[]) => void;
  onEconomyChange?: () => void;
};

function readKeyboardAxes(keys: Set<string>): { axisX: number; axisY: number } {
  let axisX = 0;
  let axisY = 0;
  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) axisX -= 1;
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) axisX += 1;
  if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) axisY -= 1;
  if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) axisY += 1;
  return { axisX, axisY };
}

export function ExploreSceneRoam({
  scene,
  muted,
  isPreview = false,
  runKey = "0",
  onReadyForCloze,
  onEconomyChange,
}: Props) {
  const [runState, setRunState] = useState<ExploreSceneRunState>(() =>
    createExploreSceneState(scene),
  );
  const [panelTarget, setPanelTarget] = useState<ExploreSceneInteractTarget | null>(
    null,
  );
  const [showHint, setShowHint] = useState(true);
  const [touchAxis, setTouchAxis] = useState({ axisX: 0, axisY: 0 });

  const runStateRef = useRef(runState);
  const keysRef = useRef<Set<string>>(new Set());
  const touchAxisRef = useRef(touchAxis);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    runStateRef.current = runState;
  }, [runState]);

  useEffect(() => {
    touchAxisRef.current = touchAxis;
  }, [touchAxis]);

  useEffect(() => {
    setRunState(createExploreSceneState(scene));
    setPanelTarget(null);
    setShowHint(true);
    setTouchAxis({ axisX: 0, axisY: 0 });
    keysRef.current = new Set();
  }, [scene.id, runKey]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "a" ||
        e.key === "d" ||
        e.key === "w" ||
        e.key === "s" ||
        e.key === "A" ||
        e.key === "D" ||
        e.key === "W" ||
        e.key === "S"
      ) {
        e.preventDefault();
        keysRef.current.add(e.key);
      }
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        handleInteractRef.current();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const tick = useCallback(
    (ts: number) => {
      const last = lastTsRef.current;
      lastTsRef.current = ts;
      const dtSec = last == null ? 0 : Math.min(0.05, (ts - last) / 1000);
      if (dtSec <= 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const kb = readKeyboardAxes(keysRef.current);
      const touch = touchAxisRef.current;
      let axisX = kb.axisX + touch.axisX;
      let axisY = kb.axisY + touch.axisY;
      if (axisX !== 0 && axisY !== 0) {
        const len = Math.hypot(axisX, axisY);
        axisX /= len;
        axisY /= len;
      } else {
        axisX = Math.max(-1, Math.min(1, axisX));
        axisY = Math.max(-1, Math.min(1, axisY));
      }

      if (axisX !== 0 || axisY !== 0) {
        const next = tickExploreSceneMovement(scene, runStateRef.current, {
          axisX,
          axisY,
          dtSec,
        });
        runStateRef.current = next;
        setRunState(next);
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [scene],
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [tick, runKey]);

  const interactTarget = findInteractTarget(scene, runState);
  const zoneId = resolveCurrentZone(scene, runState.playerX, runState.playerY);
  const zoneLabel =
    scene.zones.find((z) => z.id === zoneId)?.label ?? null;

  const handleInteractRef = useRef(() => {});
  const handleInteract = useCallback(() => {
    const target = findInteractTarget(scene, runStateRef.current);
    if (!target) return;
    unlockSpeechSynthesis();
    playSfx("tap", muted);
    setShowHint(false);
    if (target.kind === "brother") {
      onReadyForCloze([...runStateRef.current.collectedWordIds]);
      return;
    }
    setPanelTarget(target);
  }, [scene, muted, onReadyForCloze]);

  useEffect(() => {
    handleInteractRef.current = handleInteract;
  }, [handleInteract]);

  const handleCollect = useCallback(() => {
    if (!panelTarget || panelTarget.kind === "brother") return;
    playSfx("correct", muted);

    if (panelTarget.kind === "word") {
      if (!isPreview) {
        grantWordLoot(panelTarget.wordId, 1);
        onEconomyChange?.();
      }
      const next = collectWordPickup(
        runStateRef.current,
        panelTarget.pickupId,
        panelTarget.wordId,
      );
      runStateRef.current = next;
      setRunState(next);
    } else {
      const next = collectMaterialPickup(
        runStateRef.current,
        panelTarget.pickupId,
        panelTarget.materialId,
      );
      runStateRef.current = next;
      setRunState(next);
    }
    setPanelTarget(null);
  }, [panelTarget, isPreview, muted, onEconomyChange]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden p-2">
        <ExploreSceneMapLayer scene={scene} state={runState} className="h-full w-full" />

        <div className="pointer-events-none absolute bottom-3 left-3 z-10 sm:bottom-4 sm:left-4">
          <div className="pointer-events-auto">
            <ExploreSceneDpad
              axisX={touchAxis.axisX}
              axisY={touchAxis.axisY}
              onAxisChange={(axisX, axisY) => setTouchAxis({ axisX, axisY })}
            />
          </div>
        </div>

        {panelTarget && panelTarget.kind !== "brother" ?
          <ExploreScenePickupPanel
            target={panelTarget}
            muted={muted}
            onCollect={handleCollect}
            onClose={() => setPanelTarget(null)}
          />
        : null}
      </div>

      <ExploreSceneHud
        scene={scene}
        state={runState}
        zoneLabel={zoneLabel}
        interactTarget={interactTarget}
        showHint={showHint}
        onDismissHint={() => setShowHint(false)}
        onInteract={handleInteract}
      />
    </div>
  );
}
