import type { PuppetLineBeat } from "./types";
import type { PuppetPresenterStep } from "./validate";

export type PuppetCaptionPhase = "line" | "choice" | "quiz" | "done";

export type VisibleCaptionOptions = {
  /** Hide all line captions during choice/quiz/done (default true). */
  hideCaptionsDuringInteraction?: boolean;
  /** Max captions on screen at once. */
  maxVisibleLines?: number;
};

const DEFAULT_OPTIONS: Required<VisibleCaptionOptions> = {
  hideCaptionsDuringInteraction: true,
  maxVisibleLines: 6,
};

type SlotEntry = {
  step: Extract<PuppetPresenterStep, { type: "line" }>;
  /** Higher wins; active ephemeral in a slot beats a persist label in that slot. */
  priority: number;
};

/** One on-screen caption per slot; active line in slot hides persist label in same slot. */
export function resolveCaptionSlot(beat: PuppetLineBeat, beatIndex: number): string {
  const slot = beat.captionSlot?.trim();
  if (slot) return slot;
  const group = beat.group?.trim();
  if (group) return group;
  if (beat.persist) return `persist-${beatIndex}`;
  return "__ephemeral__";
}

/**
 * Which line steps to render in the scene.
 * - Ephemeral lines (no persist): only while that step is active.
 * - Persist lines: stay until replaced in the same `group` (legacy) or outranked in `captionSlot`.
 * - Active ephemeral in a `captionSlot` hides the persist label in that slot (avoids "like" + "I like…").
 */
export function computeVisibleLineSteps(
  steps: PuppetPresenterStep[],
  stepIndex: number,
  phase: PuppetCaptionPhase,
  options?: VisibleCaptionOptions,
): Extract<PuppetPresenterStep, { type: "line" }>[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (
    opts.hideCaptionsDuringInteraction &&
    (phase === "choice" || phase === "quiz" || phase === "done")
  ) {
    return [];
  }

  const bySlot = new Map<string, SlotEntry>();
  const byBeatIndex = new Map<number, Extract<PuppetPresenterStep, { type: "line" }>>();

  for (let i = 0; i <= stepIndex && i < steps.length; i++) {
    const step = steps[i]!;
    if (step.type !== "line") continue;

    const beat = step.beat;
    const persist = beat.persist === true;
    const isActiveLine = i === stepIndex && phase === "line";
    const slot = resolveCaptionSlot(beat, step.beatIndex);

    if (slot === "__ephemeral__") {
      if (persist) {
        const legacyGroup = beat.group?.trim();
        if (legacyGroup) {
          for (const [idx, s] of byBeatIndex) {
            if (s.beat.group?.trim() === legacyGroup) byBeatIndex.delete(idx);
          }
        }
        byBeatIndex.set(step.beatIndex, step);
        continue;
      }
      if (isActiveLine) {
        for (const [idx, s] of byBeatIndex) {
          if (s.beat.persist !== true && resolveCaptionSlot(s.beat, idx) === "__ephemeral__") {
            byBeatIndex.delete(idx);
          }
        }
        byBeatIndex.set(step.beatIndex, step);
      }
      continue;
    }

    if (persist) {
      const legacyGroup = beat.group?.trim();
      if (legacyGroup && legacyGroup !== slot) {
        for (const [sk, entry] of bySlot) {
          if (entry.step.beat.group?.trim() === legacyGroup) bySlot.delete(sk);
        }
      }
      const existing = bySlot.get(slot);
      if (!existing || existing.priority <= 1) {
        bySlot.set(slot, { step, priority: 1 });
      }
      continue;
    }

    if (isActiveLine) {
      bySlot.set(slot, { step, priority: 2 });
    }
  }

  const fromSlots = [...bySlot.values()].map((e) => e.step);
  const fromLegacy = [...byBeatIndex.values()];
  const merged = new Map<number, Extract<PuppetPresenterStep, { type: "line" }>>();
  for (const step of [...fromSlots, ...fromLegacy]) {
    merged.set(step.beatIndex, step);
  }

  const ordered = [...merged.values()].sort((a, b) => a.beatIndex - b.beatIndex);

  const max = opts.maxVisibleLines;
  if (max > 0 && ordered.length > max) {
    return ordered.slice(ordered.length - max);
  }
  return ordered;
}
