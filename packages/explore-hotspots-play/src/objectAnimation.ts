import type { CSSProperties } from "react";

export const OBJECT_ENTRANCE_PRESETS = [
  "none",
  "fade_in",
  "pop",
  "slide_up",
  "slide_down",
] as const;

export const OBJECT_IDLE_PRESETS = ["none", "pulse", "bob", "wiggle"] as const;

export type ObjectEntrancePreset = (typeof OBJECT_ENTRANCE_PRESETS)[number];
export type ObjectIdlePreset = (typeof OBJECT_IDLE_PRESETS)[number];

export type ObjectAnimation = {
  entrance?: ObjectEntrancePreset;
  entranceDurationMs?: number;
  entranceDelayMs?: number;
  idle?: ObjectIdlePreset;
};

export const OBJECT_ENTRANCE_LABELS: Record<ObjectEntrancePreset, string> = {
  none: "None",
  fade_in: "Fade in",
  pop: "Pop in",
  slide_up: "Slide up",
  slide_down: "Slide down",
};

export const OBJECT_IDLE_LABELS: Record<ObjectIdlePreset, string> = {
  none: "None",
  pulse: "Pulse",
  bob: "Bob",
  wiggle: "Wiggle",
};

function idleDuration(idle: ObjectIdlePreset): string {
  if (idle === "pulse") return "2.4s";
  if (idle === "bob") return "2.8s";
  return "1.6s";
}

/** Build CSS animation style for entrance + idle (and optional stage pulse). */
export function objectAnimationStyle(
  animation: ObjectAnimation | undefined,
  options?: { forcePulse?: boolean; rotationDeg?: number },
): CSSProperties {
  const entrance =
    animation?.entrance && animation.entrance !== "none" ? animation.entrance : null;
  let idle =
    animation?.idle && animation.idle !== "none" ? animation.idle : null;
  if (options?.forcePulse && !idle) idle = "pulse";

  const durationMs = Math.max(0, animation?.entranceDurationMs ?? 500);
  const delayMs = Math.max(0, animation?.entranceDelayMs ?? 0);
  const names: string[] = [];
  const durations: string[] = [];
  const timings: string[] = [];
  const delays: string[] = [];
  const iterations: string[] = [];
  const fillModes: string[] = [];

  if (entrance) {
    names.push(`explore-entrance-${entrance}`);
    durations.push(`${durationMs}ms`);
    timings.push("ease-out");
    delays.push(`${delayMs}ms`);
    iterations.push("1");
    fillModes.push("both");
  }
  if (idle) {
    names.push(`explore-idle-${idle}`);
    durations.push(idleDuration(idle));
    timings.push("ease-in-out");
    delays.push(entrance ? `${delayMs + durationMs}ms` : "0ms");
    iterations.push("infinite");
    fillModes.push("none");
  }

  if (!names.length) {
    const rotation = options?.rotationDeg ?? 0;
    return rotation
      ? {
          ["--sprite-rot" as string]: `${rotation}deg`,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "center center",
        }
      : {};
  }

  const rotation = options?.rotationDeg ?? 0;
  return {
    ["--sprite-rot" as string]: `${rotation}deg`,
    transformOrigin: "center center",
    animationName: names.join(", "),
    animationDuration: durations.join(", "),
    animationTimingFunction: timings.join(", "),
    animationDelay: delays.join(", "),
    animationIterationCount: iterations.join(", "),
    animationFillMode: fillModes.join(", "),
  };
}

/** Shared keyframes injected by the play stage. */
export const OBJECT_ANIMATION_KEYFRAMES_CSS = `
@keyframes explore-entrance-fade_in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes explore-entrance-pop {
  from { opacity: 0; transform: rotate(var(--sprite-rot, 0deg)) scale(0.62); }
  to { opacity: 1; transform: rotate(var(--sprite-rot, 0deg)) scale(1); }
}
@keyframes explore-entrance-slide_up {
  from { opacity: 0; transform: rotate(var(--sprite-rot, 0deg)) translateY(14%); }
  to { opacity: 1; transform: rotate(var(--sprite-rot, 0deg)) translateY(0); }
}
@keyframes explore-entrance-slide_down {
  from { opacity: 0; transform: rotate(var(--sprite-rot, 0deg)) translateY(-14%); }
  to { opacity: 1; transform: rotate(var(--sprite-rot, 0deg)) translateY(0); }
}
@keyframes explore-idle-pulse {
  0%, 100% { transform: rotate(var(--sprite-rot, 0deg)) scale(1); }
  50% { transform: rotate(var(--sprite-rot, 0deg)) scale(1.045); }
}
@keyframes explore-idle-bob {
  0%, 100% { transform: rotate(var(--sprite-rot, 0deg)) translateY(0); }
  50% { transform: rotate(var(--sprite-rot, 0deg)) translateY(-3%); }
}
@keyframes explore-idle-wiggle {
  0%, 100% { transform: rotate(calc(var(--sprite-rot, 0deg) - 2deg)); }
  50% { transform: rotate(calc(var(--sprite-rot, 0deg) + 2deg)); }
}
@media (prefers-reduced-motion: reduce) {
  .explore-object-motion {
    animation: none !important;
  }
}
.explore-object-motion {
  transform-box: fill-box;
  transform-origin: center;
}
`;
