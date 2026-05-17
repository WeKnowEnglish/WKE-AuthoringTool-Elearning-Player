"use client";

import {
  useAnimationControls,
  type TargetAndTransition,
  type Transition,
} from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getMotionPreset } from "./animations";
import type { PartMotionTune } from "./part-motion-tune";
import { clampMotionTune } from "./part-motion-tune";
import { buildIdleMotionTransition, PUPPET_SPRING } from "./puppet-spring-presets";
import type { PuppetAnimationId, PuppetPartKey } from "./types";

export type UsePuppetBoneMotionParams = {
  part: PuppetPartKey;
  tune: PartMotionTune;
  motionEnabled: boolean;
  animId: PuppetAnimationId;
  oneShotGeneration: number;
  rigToolsOpen: boolean;
  rigToolsPart: PuppetPartKey | null;
};

export type PuppetBoneControls = ReturnType<typeof useAnimationControls>;

export type PuppetBoneMotionMode = "idle" | "static" | "oneshot";

export type PuppetBoneMotionResult = {
  mode: PuppetBoneMotionMode;
  /** Declarative idle (includes transition for infinite mirror loop). */
  idleAnimate: TargetAndTransition | null;
  /** Imperative driver for wave/nod only — never mixed with idle on the same mount. */
  controls: PuppetBoneControls;
  /** Remount key so controls do not cancel declarative idle. */
  motionKey: string;
};

export function buildIdleTargets(
  part: PuppetPartKey,
  tuneInput: PartMotionTune,
): TargetAndTransition | null {
  const tune = clampMotionTune(tuneInput);
  if (!tune.rotateEnabled && !tune.translateEnabled) return null;

  const targets: TargetAndTransition = {};

  if (tune.rotateEnabled) {
    targets.rotate = [tune.rotateMinDeg, tune.rotateMaxDeg];
  }

  if (tune.translateEnabled && tune.translateMaxPx > 0) {
    const breatheScale = part === "body" ? 1.015 : 1;
    targets.y = [0, -tune.translateMaxPx];
    if (breatheScale !== 1) {
      targets.scale = [1, breatheScale];
    }
  }

  if (Object.keys(targets).length === 0) return null;
  return targets;
}

/** Idle animate + transition on one object (Motion repeats reliably this way). */
export function buildIdleMotion(
  part: PuppetPartKey,
  tuneInput: PartMotionTune,
  preview: boolean,
): TargetAndTransition | null {
  const targets = buildIdleTargets(part, tuneInput);
  if (!targets) return null;
  return {
    ...targets,
    transition: buildIdleMotionTransition(part, tuneInput, preview),
  };
}

function getOneShotForPart(
  part: PuppetPartKey,
  animId: PuppetAnimationId,
): { animate: TargetAndTransition; transition: Transition } | null {
  if (animId === "none" || animId === "idle") return null;
  const spec = getMotionPreset(animId)?.partOneShot?.[part];
  if (!spec) return null;
  const animate = Array.isArray(spec.animate) ? spec.animate[0]! : spec.animate;
  return {
    animate,
    transition: spec.transition,
  };
}

export function usePuppetBoneMotion({
  part,
  tune,
  motionEnabled,
  animId,
  oneShotGeneration,
  rigToolsOpen,
  rigToolsPart,
}: UsePuppetBoneMotionParams): PuppetBoneMotionResult {
  const controls = useAnimationControls();
  const lastOneShotGenRef = useRef(0);
  const [oneShotActive, setOneShotActive] = useState(false);
  const isPreview = rigToolsOpen && rigToolsPart === part;

  const idleAnimate = useMemo(
    () => buildIdleMotion(part, tune, isPreview),
    [part, tune, isPreview],
  );

  const canIdle =
    !!idleAnimate &&
    (motionEnabled || isPreview) &&
    (!rigToolsOpen || isPreview) &&
    !oneShotActive;

  const mode: PuppetBoneMotionMode = canIdle ? "idle" : oneShotActive ? "oneshot" : "static";

  const motionKey =
    mode === "idle" ? `idle-${part}`
    : mode === "oneshot" ? `oneshot-${part}-${oneShotGeneration}`
    : `static-${part}`;

  useEffect(() => {
    const oneShot = getOneShotForPart(part, animId);
    if (!motionEnabled || !oneShot || oneShotGeneration === 0) return;
    if (oneShotGeneration === lastOneShotGenRef.current) return;
    if (rigToolsOpen && !isPreview) return;

    lastOneShotGenRef.current = oneShotGeneration;
    let cancelled = false;
    setOneShotActive(true);

    void controls
      .start({
        ...oneShot.animate,
        transition: oneShot.transition,
      })
      .then(() => {
        if (!cancelled) setOneShotActive(false);
      });

    return () => {
      cancelled = true;
      controls.stop();
      setOneShotActive(false);
    };
    // controls is stable; omit to avoid re-firing one-shots
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part, animId, motionEnabled, oneShotGeneration, rigToolsOpen, isPreview]);

  return {
    mode,
    idleAnimate,
    controls,
    motionKey,
  };
}

export const PUPPET_BONE_INITIAL = { rotate: 0, y: 0, scale: 1 } as const;

export { PUPPET_SPRING };
