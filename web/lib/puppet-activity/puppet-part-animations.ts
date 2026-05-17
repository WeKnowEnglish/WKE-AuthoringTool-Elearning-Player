import type { PartMotionTune } from "./part-motion-tune";
import { clampMotionTune } from "./part-motion-tune";
import type { PuppetAnimationId, PuppetPartKey } from "./types";
import { getMotionPreset } from "./animations";

export type PuppetWaapiSpec = {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
};

const BASE_IDLE_DURATION_MS: Record<PuppetPartKey, number> = {
  body: 2800,
  head: 3200,
  upperArm: 3600,
  lowerArm: 3100,
  hand: 2700,
};

const IDLE_DELAY_MS: Partial<Record<PuppetPartKey, number>> = {
  head: 120,
  upperArm: 80,
  lowerArm: 220,
  hand: 350,
};

function durationFromTune(part: PuppetPartKey, tune: PartMotionTune): number {
  return Math.round(BASE_IDLE_DURATION_MS[part] / tune.speed);
}

function buildTransformKeyframe(
  rotateDeg: number,
  translateYpx: number,
  scale: number,
): Keyframe {
  const parts: string[] = [];
  if (translateYpx !== 0) parts.push(`translateY(${translateYpx}px)`);
  if (scale !== 1) parts.push(`scale(${scale})`);
  if (rotateDeg !== 0) parts.push(`rotate(${rotateDeg}deg)`);
  if (parts.length === 0) return { transform: "none" };
  return { transform: parts.join(" ") };
}

/** Continuous idle from per-part tune. Returns null if part should stay still. */
export function idleWaapiForPart(
  part: PuppetPartKey,
  tuneInput: PartMotionTune,
): PuppetWaapiSpec | null {
  const tune = clampMotionTune(tuneInput);
  if (!tune.rotateEnabled && !tune.translateEnabled) return null;

  const keyframes: Keyframe[] = [];

  if (tune.rotateEnabled) {
    keyframes.push(
      buildTransformKeyframe(tune.rotateMinDeg, 0, 1),
      buildTransformKeyframe(tune.rotateMaxDeg, 0, 1),
      buildTransformKeyframe(tune.rotateMinDeg, 0, 1),
    );
  }

  if (tune.translateEnabled && tune.translateMaxPx > 0) {
    const bob = tune.translateMaxPx;
    const breatheScale = part === "body" ? 1.015 : 1;
    if (keyframes.length === 0) {
      keyframes.push(
        buildTransformKeyframe(0, 0, 1),
        buildTransformKeyframe(0, -bob, breatheScale),
        buildTransformKeyframe(0, 0, 1),
      );
    } else {
      // Rotate-only keyframes already set; skip combined for simplicity
    }
  }

  if (keyframes.length === 0) return null;

  return {
    keyframes,
    options: {
      duration: durationFromTune(part, tune),
      iterations: Infinity,
      easing: "ease-in-out",
      delay: IDLE_DELAY_MS[part] ?? 0,
    },
  };
}

/** Pivot-tuning preview — rotate between bounds. */
export function previewWaapiForPart(
  part: PuppetPartKey,
  tuneInput: PartMotionTune,
): PuppetWaapiSpec | null {
  const tune = clampMotionTune(tuneInput);
  if (!tune.rotateEnabled) {
    if (tune.translateEnabled && tune.translateMaxPx > 0) {
      const bob = tune.translateMaxPx;
      return {
        keyframes: [
          buildTransformKeyframe(0, 0, 1),
          buildTransformKeyframe(0, -bob, 1),
          buildTransformKeyframe(0, 0, 1),
        ],
        options: {
          duration: durationFromTune(part, tune),
          iterations: Infinity,
          easing: "ease-in-out",
        },
      };
    }
    return null;
  }

  return {
    keyframes: [
      buildTransformKeyframe(tune.rotateMinDeg, 0, 1),
      buildTransformKeyframe(tune.rotateMaxDeg, 0, 1),
      buildTransformKeyframe(tune.rotateMinDeg, 0, 1),
    ],
    options: {
      duration: Math.round(2200 / tune.speed),
      iterations: Infinity,
      easing: "ease-in-out",
    },
  };
}

/** Map motion preset one-shots to WAAPI (degrees / px). */
function oneShotWaapiForPart(
  part: PuppetPartKey,
  animId: PuppetAnimationId,
): PuppetWaapiSpec | null {
  const spec = getMotionPreset(animId === "none" ? "idle" : animId)?.partOneShot?.[part];
  if (!spec?.animate) return null;

  const a = spec.animate as Record<string, number | number[]>;
  if (typeof a.rotate === "object" && Array.isArray(a.rotate)) {
    return {
      keyframes: a.rotate.map((deg) => ({ transform: `rotate(${deg}deg)` })),
      options: {
        duration: ((spec.transition.duration as number | undefined) ?? 0.85) * 1000,
        easing: "ease-in-out",
        fill: "forwards",
      },
    };
  }
  if (typeof a.rotate === "number") {
    return {
      keyframes: [
        { transform: "rotate(0deg)" },
        { transform: `rotate(${a.rotate}deg)` },
        { transform: "rotate(0deg)" },
      ],
      options: {
        duration: ((spec.transition.duration as number | undefined) ?? 0.45) * 1000,
        easing: "ease-in-out",
        fill: "forwards",
      },
    };
  }
  return null;
}

export function oneShotWaapiForBeat(
  part: PuppetPartKey,
  animId: PuppetAnimationId,
): PuppetWaapiSpec | null {
  if (animId === "none" || animId === "idle") return null;
  return oneShotWaapiForPart(part, animId);
}
