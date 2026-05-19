import { resolvePuppetFoodOptions } from "./food-options";
import { DEFAULT_CHOICE_VAR } from "./script-vars";
import { validateCaptionLayout } from "./caption-layout";
import { PUPPET_ANIMATION_IDS } from "./types";
import type { PuppetBeat, PuppetScript } from "./types";

const ANIM_SET = new Set<string>(PUPPET_ANIMATION_IDS);

export function validatePuppetScript(script: PuppetScript): string[] {
  const errors: string[] = [];
  if (!script.id?.trim()) errors.push("Script id is required.");
  if (!script.title?.trim()) errors.push("Script title is required.");
  if (!script.puppetId?.trim()) errors.push("puppetId is required.");
  if (script.beats.length === 0) errors.push("At least one beat is required.");

  if (script.defaultCaptionLayout) {
    errors.push(
      ...validateCaptionLayout(script.defaultCaptionLayout, "defaultCaptionLayout"),
    );
  }

  const last = script.beats[script.beats.length - 1];
  if (last && last.kind !== "quiz_true_false") {
    errors.push("Last beat should be quiz_true_false for MVP flow.");
  }

  for (let i = 0; i < script.beats.length; i++) {
    const beat = script.beats[i]!;
    if (beat.kind === "line") {
      if (!beat.text.trim()) errors.push(`Beat ${i}: line text is required.`);
      const anim = beat.puppetAnimation;
      if (anim && !ANIM_SET.has(anim)) {
        errors.push(`Beat ${i}: unknown puppetAnimation "${anim}".`);
      }
      if (beat.wordStaggerMs != null && beat.wordStaggerMs < 0) {
        errors.push(`Beat ${i}: wordStaggerMs must be >= 0.`);
      }
      if (beat.captionLayout) {
        errors.push(...validateCaptionLayout(beat.captionLayout, `Beat ${i} captionLayout`));
      }
      if (beat.group != null && !beat.group.trim()) {
        errors.push(`Beat ${i}: group must be non-empty when set.`);
      }
      if (beat.persist && !beat.group && beat.text.length > 48) {
        errors.push(
          `Beat ${i}: long persist lines without group crowd the scene — use group or persist: false.`,
        );
      }
    } else if (beat.kind === "choice") {
      if (!beat.prompt.trim()) errors.push(`Beat ${i}: choice prompt is required.`);
      if (!beat.foodIds?.length) {
        errors.push(`Beat ${i}: choice needs at least one foodIds entry.`);
      } else if (resolvePuppetFoodOptions(beat.foodIds).length !== beat.foodIds.length) {
        errors.push(`Beat ${i}: unknown food id in foodIds.`);
      }
      const anim = beat.puppetAnimation;
      if (anim && !ANIM_SET.has(anim)) {
        errors.push(`Beat ${i}: unknown puppetAnimation "${anim}".`);
      }
      if (beat.captionLayout) {
        errors.push(...validateCaptionLayout(beat.captionLayout, `Beat ${i} captionLayout`));
      }
    } else if (beat.kind === "quiz_true_false") {
      if (!beat.statement.trim()) errors.push(`Beat ${i}: statement is required.`);
    }
  }

  return errors;
}

export function assertValidPuppetScript(script: PuppetScript): void {
  const errors = validatePuppetScript(script);
  if (errors.length > 0) {
    throw new Error(`Invalid puppet script "${script.id}": ${errors.join(" ")}`);
  }
}

export type PuppetPresenterStep =
  | { type: "line"; beatIndex: number; beat: Extract<PuppetBeat, { kind: "line" }> }
  | { type: "choice"; beatIndex: number; beat: Extract<PuppetBeat, { kind: "choice" }> }
  | { type: "quiz"; beatIndex: number; beat: Extract<PuppetBeat, { kind: "quiz_true_false" }> };

export function buildPresenterSteps(script: PuppetScript): PuppetPresenterStep[] {
  const steps: PuppetPresenterStep[] = [];
  for (let i = 0; i < script.beats.length; i++) {
    const beat = script.beats[i]!;
    if (beat.kind === "line") {
      steps.push({ type: "line", beatIndex: i, beat });
    } else if (beat.kind === "choice") {
      steps.push({ type: "choice", beatIndex: i, beat });
    } else if (beat.kind === "quiz_true_false") {
      steps.push({ type: "quiz", beatIndex: i, beat });
    }
  }
  return steps;
}
