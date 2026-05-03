/**
 * Story Blueprint Compiler
 *
 * Converts planning-only Story-First blueprint orchestration
 * into deterministic runtime story payload structures.
 *
 * AI defines intent.
 * Compiler defines runtime truth.
 *
 * This file must remain:
 * - pure
 * - deterministic
 * - side-effect free
 * - heavily tested
 *
 * Do not move runtime decision logic back into prompts.
 */

import type {
  StoryPageBlueprint,
  StoryPhaseBlueprint,
} from "@/lib/ai/ai-lesson-plan";
import type {
  StoryPagePhase,
  StoryPhaseCompletion,
  StoryPhaseDialogue,
} from "@/lib/lesson-schemas";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default delay for auto-advancing phases. Callers may substitute their own value. */
export const DEFAULT_AUTO_DELAY_MS = 800;

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

export type CompilerWarning = {
  /** Machine-readable code for dashboards, analytics, QA tools. */
  code: string;
  /** Human-readable description. */
  message: string;
  /** page_id from the blueprint page, when known. */
  page_id?: string;
  /** phase_id from the blueprint phase, when known. */
  phase_id?: string;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns the canonical terminal completion. Single source of truth. */
function buildEndPhase(): StoryPhaseCompletion {
  return { type: "end_phase" };
}

// ---------------------------------------------------------------------------
// Exported helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when there is no following phase (i.e. this is the last phase on
 * a page, or the only phase). A terminal phase always compiles to `end_phase`
 * regardless of trigger type.
 *
 * Exported so that v2's `compilePagePhases()` and tests can reuse the same rule.
 */
export function isTerminalPhase(nextPhaseId: string | null): boolean {
  return nextPhaseId === null;
}

// ---------------------------------------------------------------------------
// Core compiler — trigger → completion
// ---------------------------------------------------------------------------

/**
 * Maps a blueprint `PhaseTrigger` to the correct runtime `StoryPhaseCompletion`.
 *
 * Rules:
 * - Terminal phases (`nextPhaseId === null`) always produce `end_phase`.
 * - `end_phase` trigger always produces `end_phase` even when `nextPhaseId` is set.
 * - `undefined` trigger (legacy phases with no `trigger` field) falls back to
 *   `end_phase` — fails safe rather than auto-advancing incorrectly.
 *   NOTE: v2 will surface this as a compiler warning rather than a silent fallback.
 *
 * Uses an exhaustive switch so the TypeScript compiler flags any new trigger type
 * added to `PhaseTrigger` that lacks compiler support.
 */
export function compilePhaseTriggerToCompletion(
  trigger: StoryPhaseBlueprint["trigger"],
  nextPhaseId: string | null,
): StoryPhaseCompletion {
  // Terminal rule — no following phase; nothing to advance to.
  if (isTerminalPhase(nextPhaseId)) {
    return buildEndPhase();
  }

  // Safe fallback for legacy blueprint phases that predate the trigger field.
  if (trigger === undefined) {
    return buildEndPhase();
  }

  // Exhaustive switch — the `default` branch with `never` ensures a compile
  // error if a new trigger type is added to PhaseTrigger without compiler support.
  switch (trigger.type) {
    case "auto_present":
      return {
        type: "auto",
        delay_ms: DEFAULT_AUTO_DELAY_MS,
        // nextPhaseId is guaranteed non-null here (checked above).
        next_phase_id: nextPhaseId as string,
      };

    case "on_click_item":
      return {
        type: "on_click",
        target_item_id: trigger.target_item_id,
        next_phase_id: nextPhaseId as string,
      };

    case "all_matched":
      return {
        type: "all_matched",
        next_phase_id: nextPhaseId as string,
      };

    case "sequence_complete":
      return {
        type: "sequence_complete",
        sequence_id: trigger.sequence_id,
        next_phase_id: nextPhaseId as string,
      };

    case "tap_group":
      return {
        type: "tap_group",
        group_id: trigger.group_id,
        next_phase_id: nextPhaseId as string,
        advance_after_satisfaction: true,
      };

    case "end_phase":
      // Explicit terminal trigger — always end_phase regardless of nextPhaseId.
      return buildEndPhase();

    default: {
      // Exhaustive check: if TypeScript reaches here, a new trigger type was
      // added to PhaseTrigger without a matching case above.
      const _exhaustiveCheck: never = trigger;
      void _exhaustiveCheck;
      return buildEndPhase();
    }
  }
}

// ---------------------------------------------------------------------------
// Dialogue compiler
// ---------------------------------------------------------------------------

/**
 * Maps blueprint success/failure/character_dialogue into a runtime
 * `StoryPhaseDialogue` object.
 *
 * Mapping:
 *   success_response.dialogue  →  dialogue.success
 *   failure_response.dialogue  →  dialogue.error
 *   character_dialogue (legacy) →  dialogue.start  (only when success_response absent)
 *
 * Empty strings are treated as absent — they are trimmed and ignored rather
 * than written into the runtime payload as `{ success: "" }`.
 *
 * Returns `undefined` when no dialogue fields are set, keeping payloads clean.
 */
export function compilePhaseDialogue(
  phase: StoryPhaseBlueprint,
): StoryPhaseDialogue | undefined {
  const normalize = (value: string | undefined): string | undefined => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  };

  const success = normalize(phase.success_response?.dialogue);
  const error = normalize(phase.failure_response?.dialogue);

  // Legacy character_dialogue maps to dialogue.start only when success_response
  // is absent — success_response takes precedence and character_dialogue is ignored.
  const start =
    phase.success_response === undefined ?
      normalize(phase.character_dialogue)
    : undefined;

  const result: StoryPhaseDialogue = {};
  if (start !== undefined) result.start = start;
  if (success !== undefined) result.success = success;
  if (error !== undefined) result.error = error;

  // Return undefined rather than an empty object to keep runtime payloads clean.
  if (!result.start && !result.success && !result.error) return undefined;

  return result;
}

// ---------------------------------------------------------------------------
// Page compiler — blueprint phases → runtime phases
// ---------------------------------------------------------------------------

function hasLearnerActionTrigger(phase: StoryPhaseBlueprint): boolean {
  return (
    phase.trigger?.type === "on_click_item" ||
    phase.trigger?.type === "all_matched" ||
    phase.trigger?.type === "sequence_complete"
  );
}

function warning(
  code: string,
  message: string,
  page_id?: string,
  phase_id?: string,
): CompilerWarning {
  return {
    code,
    message,
    ...(page_id ? { page_id } : {}),
    ...(phase_id ? { phase_id } : {}),
  };
}

/**
 * Compiles a blueprint page's ordered phase plan into runtime-ready
 * `StoryPagePhase[]`, with structured diagnostics for safe fallbacks.
 *
 * This is v2's bridge: Gemini defines phase intent in the blueprint; the
 * compiler owns runtime phase wiring (`next_phase_id`, `completion`, dialogue,
 * click kind, and highlight target).
 */
export function compilePagePhases(
  pageBlueprint: StoryPageBlueprint,
): { phases: StoryPagePhase[]; warnings: CompilerWarning[] } {
  const warnings: CompilerWarning[] = [];
  const blueprintPhases = pageBlueprint.phases ?? [];

  if (blueprintPhases.length === 0) {
    if (pageBlueprint.narrative_function === "learner_action") {
      warnings.push(
        warning(
          "EMPTY_PHASES",
          "Learner-action page has no blueprint phases.",
          pageBlueprint.page_id,
        ),
      );
    }
    return { phases: [], warnings };
  }

  const phases = blueprintPhases.map((phase, index): StoryPagePhase => {
    const nextPhaseId = blueprintPhases[index + 1]?.phase_id ?? null;
    const completion = compilePhaseTriggerToCompletion(phase.trigger, nextPhaseId);
    const dialogue = compilePhaseDialogue(phase);

    if (phase.trigger === undefined) {
      warnings.push(
        warning(
          "MISSING_TRIGGER",
          "Blueprint phase is missing trigger; compiler fell back to end_phase.",
          pageBlueprint.page_id,
          phase.phase_id,
        ),
      );
    }

    const out: StoryPagePhase = {
      id: phase.phase_id,
      name: phase.purpose,
      is_start: index === 0,
      completion,
    };

    if (nextPhaseId !== null) {
      out.next_phase_id = nextPhaseId;
    }
    if (dialogue) {
      out.dialogue = dialogue;
    }
    if (phase.trigger?.type === "on_click_item") {
      out.kind = "click_to_advance";
      out.highlight_item_ids = [phase.trigger.target_item_id];
    }

    return out;
  });

  if (
    pageBlueprint.narrative_function === "learner_action" &&
    !blueprintPhases.some(hasLearnerActionTrigger)
  ) {
    warnings.push(
      warning(
        "NO_LEARNER_ACTION_ON_LEARNER_PAGE",
        "Learner-action page has phases, but none require learner action.",
        pageBlueprint.page_id,
      ),
    );
  }

  return { phases, warnings };
}
