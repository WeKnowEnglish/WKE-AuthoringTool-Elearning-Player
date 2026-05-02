import { randomUUID } from "node:crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  normalizeAiLessonPlan,
  safeParseStoredLessonPlanMeta,
  storyScreenCountFromPlan,
  buildMaterializationSteps,
  quizGroupsForSpecs,
  formatStoryOutlineForMaterialization,
  goalRefsLine,
  type AiLessonPlan,
  type MaterializationStep,
  type StoryBeat,
  type StoryFirstBlueprint,
  type PhaseTrigger,
  type PhaseCompletionEffect,
} from "@/lib/ai/ai-lesson-plan";
import {
  legacyInteractionCatalogPromptSnippet,
  normalizeInteractionSubtypeForAi,
  normalizeStoryFirstReinforcementSubtypeForAi,
  storyFirstReinforcementPromptSnippet,
  type StoryFirstReinforcementSubtype,
} from "@/lib/ai/interaction-catalog";
import { storyPageCatalogPromptSnippet } from "@/lib/ai/story-page-catalog";
import {
  parseIssuesFromError,
  type FailedScreenCandidate,
} from "@/lib/ai/ai-generation-diagnostics";
import {
  interactionPayloadSchema,
  startPayloadSchema,
  storyPayloadSchema,
} from "@/lib/lesson-schemas";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

/** Instructional JSON fragment for lesson-plan prompts (not strict JSON). */
const SCREEN_OUTLINE_SHAPE = `
  "screenOutline": [
     { "kind": "story",
       "title"?: string,
       "summary"?: string,
       "layout_mode"?: "book"|"slide",
       "learning_goal_indices"?: number[],
       "pages"?: [
         { "summary": string,
           "learning_goal_indices"?: number[],
           "interaction_mode"?: "tap_to_advance"|"drag_match"|"mixed"|"present_only",
           "phases"?: [
             { "intent": string, "transition"?: "on_click_item"|"auto_delay"|"all_matched"|"end", "animation_hint"?: string }
           ]
         }
       ]
     },
     { "kind": "interaction", "subtype": string, "quiz_group_title"?: string, "summary"?: string }
  ]`;

const STORY_FIRST_BLUEPRINT_SHAPE = `
  "storyFirstBlueprint": {
    "lesson_metadata": {
      "lesson_title": string,
      "unit_theme"?: string,
      "estimated_duration_minutes"?: number,
      "production_mode": "story_first"
    },
    "cefr_level": "Pre-A1"|"A1"|"A2"|"B1"|"B2"|"C1",
    "target_age": { "min_age": number, "max_age": number },
    "learner_profile": {
      "literacy_assumption"?: string,
      "attention_profile"?: string,
      "learner_context"?: string
    },
    "learning_goals": string[],
    "vocabulary_targets": [
      { "term": string, "meaning"?: string, "introduced_in_beat_id": string, "recycled_in_beat_ids": string[], "required_for_reinforcement"?: boolean }
    ],
    "grammar_targets": [
      { "grammar_point": string, "function"?: string, "modeled_in_beat_ids": string[], "practiced_in_beat_ids": string[], "correction_allowed_after_beat_id"?: string }
    ],
    "story_pattern_type": "zoo_visit"|"school_day"|"adventure"|"mystery"|"travel"|"daily_life"|"shopping"|"family"|"food"|"classroom_problem"|"friendship"|"custom",
    "story_arc": {
      "setup": string,
      "goal_or_problem": string,
      "rising_action"?: string,
      "discovery_moment"?: string,
      "resolution": string,
      "recap": string
    },
    "characters": [
      { "character_id": string, "name": string, "role"?: string, "language_function"?: string, "appears_in_beat_ids": string[] }
    ],
    "ordered_story_beats": [
      {
        "beat_id": string,
        "beat_order": number,
        "beat_title"?: string,
        "narrative_function"?: "opening_context"|"vocabulary_exposure"|"guided_discovery"|"grammar_modeling"|"recognition_check"|"controlled_production"|"correction_reinforcement"|"story_resolution"|"recap",
        "story_event": string,
        "learner_focus"?: string,
        "language_introduced": { "vocabulary": string[], "phrases": string[], "pronunciation_focus"?: string[] },
        "grammar_modeled": { "grammar_points": string[], "model_sentences": string[], "contextual_purpose"?: string },
        "pages"?: [
          {
            "page_id": string,
            "page_goal": string,
            "narrative_function": "setup"|"discovery"|"learner_action"|"consequence"|"recap",
            "scene_progression"?: string,
            "learner_action"?: string,
            "unlock_condition"?: string,
            "character_response"?: string,
            "next_page_trigger"?: string,
            "phases"?: [
              {
                "phase_id": string,
                "purpose": string,
                "scene_progression"?: string,
                "trigger": { "type": "auto_present" }
                         | { "type": "on_click_item", "target_item_id": string }
                         | { "type": "all_matched" }
                         | { "type": "sequence_complete", "sequence_id": string }
                         | { "type": "end_phase" },
                "success_response"?: { "dialogue"?: string, "expression_hint"?: string },
                "failure_response"?: { "dialogue"?: string },
                "completion": { "type": "end_phase" }
                            | { "type": "unlock_next_phase" }
                            | { "type": "unlock_next_page", "show_continue_arrow"?: boolean }
              }
            ]
          }
        ],
        "beat_completion_rule"?: "visit_all_pages"|"on_click_item"|"all_matched"|"present_only"|"end",
        "reinforcement"?: {
          "activity_type": "mc_quiz"|"true_false"|"fill_blanks"|"fix_text"|"letter_mixup",
          "attached_to_beat_id": string,
          "timing": "after_final_page_completion",
          "pedagogical_purpose"?: "recognition"|"comprehension_check"|"vocabulary_recall"|"grammar_form_practice"|"controlled_production"|"error_correction",
          "reason_for_activity_choice": string,
          "required_prior_exposure"?: { "vocabulary_seen": string[], "grammar_examples_seen": string[], "story_context_required"?: string },
          "generator_brief"?: { "what_to_generate": string, "what_not_to_generate"?: string, "must_reference_story_context": true }
        },
        "progression_logic": {
          "depends_on_previous_beat_id"?: string,
          "learner_should_now_know": string[],
          "transition_to_next_beat"?: string,
          "reason_next_beat_follows"?: string
        }
      }
    ],
    "wrap_up_recap": {
      "story_return_required": true,
      "recap_beat_id": string,
      "recap_type"?: "character_reflection"|"story_resolution"|"picture_walk"|"then_now_review"|"mission_complete",
      "vocabulary_recycled": string[],
      "grammar_recycled": string[],
      "final_success_moment": string
    }
  }`;

const STORY_FIRST_BLUEPRINT_POLICY = `Story-First Blueprint policy:
- Story is the core lesson engine. The first learning content must be a story beat.
- The final learning content before completion must be a story recap beat.
- ordered_story_beats must be in playback order with beat_order values 1..N and stable beat_id values.
- Every beat must include pages with minimum length 3 (recommended 4-6). Story text-only beats are not allowed.
- Recap beat must also include at least 3 pages with reflective progression and narrative closure.
- The first page in each beat must use setup or discovery narrative intent.
- The final page in each beat must use consequence narrative intent.
- Every page must serve exactly one narrative function: setup, discovery, learner_action, consequence, or recap.
- Every page must have one clear learner goal and one dominant learner action objective.
- Every beat must state what language is introduced and what grammar is modeled, even if the arrays are empty.
- Reinforcement is optional, but when present it must be attached to the same beat using attached_to_beat_id.
- Each beat may include zero or one reinforcement only.
- Reinforcement timing must be after_final_page_completion. Never place reinforcement between pages of the same beat.
- Reinforcement subtypes are limited to: mc_quiz, true_false, fill_blanks, fix_text, letter_mixup.
- Do not create disconnected quiz chains. Reinforcement checks only language already exposed in its story beat or earlier beats.
- mc_quiz and true_false validate immediately after exposure.
- letter_mixup follows clear vocabulary introduction only.
- fill_blanks follows modeled sentence exposure only.
- fix_text follows correct examples and should not appear before recognition or controlled practice.
- Do not use short_answer, click_targets, hotspot_gate, drag_match, drag_sentence, sound_sort, listen_color_write, listen_hotspot_sequence, word_shape_hunt, table_complete, sorting_game, essay, voice_question, guided_dialogue, or presentation_interactive in Story-First Blueprints.

Phase orchestration rules (apply to pages[].phases[]):
- SEMANTIC IDs ONLY: phase_id, target_item_id, and sequence_id MUST be stable semantic slugs (e.g. "intro", "tap_toothbrush", "collect_clothes_seq"). NEVER invent opaque runtime IDs such as "item_47" or "phase_uuid_abc". These slugs are used by the compiler to map blueprint → runtime items[].id deterministically.
- phase_id must be unique within its page. Use short snake_case descriptors.
- Phases must be ordered: the first phase opens the scene; subsequent phases build on it.
- Every learner_action page must include at least one phase whose trigger.type is NOT "auto_present" (the learner must do something to progress).
- trigger.type choices: "auto_present" (system presents, no learner gate), "on_click_item" (tap a named item), "all_matched" (all drag/hotspot targets hit), "sequence_complete" (ordered action set complete), "end_phase" (no gate; closes on enter). Do NOT use any other trigger types.
- NEVER put visit_all_pages inside a phase. visit_all_pages belongs only at beat_completion_rule or page pass_rule level.
- completion.type choices: "end_phase" (close; no progression), "unlock_next_phase" (advance to next phase on this page), "unlock_next_page" (advance to next page). When the player UI should show a continue/next arrow, use unlock_next_page with show_continue_arrow: true. Do NOT use a separate completion type for "show continue arrow" — this is a UI presentation flag only, not a separate progression state.
- success_response.dialogue is the character line shown after a correct action. failure_response.dialogue is shown for wrong action (maps to runtime dialogue.error).
- For setup/discovery pages with no learner gate, phases are optional; use them only when staging a reveal or dialogue progression adds clear value.
- For consequence pages, the final phase should use completion.type "unlock_next_page" (with show_continue_arrow: true if this is the last page of the beat before reinforcement or next beat).`;

const RICH_STORY_OUTLINE_POLICY = `Rich story rows: use "pages" when a beat needs multiple scenes, staged reveals, or in-page interaction. Each page may set interaction_mode (tap_to_advance = learner taps to advance; drag_match = match items on the same page; mixed; present_only = no required interaction). Optional "phases" per page describe instructional beats; "transition" hints map to story phase completion (e.g. on_click_item → on_click, auto_delay → auto, all_matched → all_matched, end → end_phase).
learning_goal_indices are 0-based indexes into the lesson's ordered learning goals list (first goal = 0). Put indices on the story row and/or on individual pages where the goal is primary.
Keep screenOutline in true playback order; interleave story and interaction. For quizGroups, each group's questionCount must equal the number of interaction rows in that consecutive run (a story row ends a run and starts a new group block if the title repeats later).`;

/** Pedagogical pressure: seek in-scene richness and full goal coverage in screenOutline JSON. */
const GOAL_ALIGNED_RICH_INTERACTION_POLICY = `Goal-aligned rich interactions (prioritize this when filling screenOutline):
- Goal coverage: Learning goals are numbered 1..K in the prompt for teachers, but learning_goal_indices in JSON are 0-based (0..K-1). Each goal index must be addressed in at least one story row (beat or page learning_goal_indices) and/or an interaction row whose summary states that skill. Prefer modeling in story first, then a quiz interaction to check, when the level fits.
- Seek richness: For story rows that introduce or practice language, prefer pages with length >= 2 OR at least one page with phases (staged reveal, tap-to-show, listen-then-act). Use present_only sparingly for short listen/read-only slides.
- Match patterns: Naming/vocabulary/identification → tap_to_advance and on_click_item phases; describing/matching words to images or traits → drag_match or mixed. Grammar patterns → model in story dialogue, then mc_quiz / fill_blanks / short_answer / true_false as appropriate.
- Interleave: Avoid long runs of story-without-action; alternate story beats with interactions so learners act regularly.
- Concrete subtypes: Every interaction row must set subtype to exactly one real subtype string (e.g. mc_quiz, true_false, short_answer, fill_blanks, fix_text, click_targets). Never use placeholders like "e.g." or "TBD".`;

export type DraftScreenRow = {
  screen_type: "start" | "story" | "interaction";
  payload: unknown;
};

export type { AiLessonPlan } from "@/lib/ai/ai-lesson-plan";

export type QuizGroupSpec = {
  id: string;
  title: string;
  questionCount: number;
};

export type MediaAllowlistItem = { url: string; description?: string };

export { safeParseStoredLessonPlanMeta } from "@/lib/ai/ai-lesson-plan";

type EnhancerStructureValidation = {
  ok: boolean;
  reasons: string[];
};

function sortedBeats(blueprint: StoryFirstBlueprint) {
  return blueprint.ordered_story_beats
    .slice()
    .sort((a, b) => a.beat_order - b.beat_order);
}

export function validateEnhancerStructureInvariants(
  before: AiLessonPlan,
  after: AiLessonPlan,
): EnhancerStructureValidation {
  const beforeBp = before.storyFirstBlueprint;
  if (!beforeBp) return { ok: true, reasons: [] };
  const afterBp = after.storyFirstBlueprint;
  if (!afterBp) {
    return { ok: false, reasons: ["output dropped storyFirstBlueprint"] };
  }

  const reasons: string[] = [];
  const beforeBeats = sortedBeats(beforeBp);
  const afterBeats = sortedBeats(afterBp);

  if (afterBeats.length < beforeBeats.length) {
    reasons.push("beat count decreased");
  }

  for (let i = 0; i < beforeBeats.length; i += 1) {
    const prev = beforeBeats[i];
    const next = afterBeats[i];
    if (!next) {
      reasons.push(`missing beat at index ${i}`);
      break;
    }
    if (prev.beat_order !== next.beat_order) {
      reasons.push(`beat order changed at index ${i}`);
    }
    if (prev.beat_id !== next.beat_id) {
      reasons.push(`beat id changed from ${prev.beat_id} to ${next.beat_id}`);
    }
    const prevPages = prev.pages?.length ?? 0;
    const nextPages = next.pages?.length ?? 0;
    if (nextPages < prevPages) {
      reasons.push(`page count reduced for beat ${prev.beat_id}`);
    }
  }

  for (let i = beforeBeats.length; i < afterBeats.length; i += 1) {
    const beat = afterBeats[i]!;
    const expectedId = `append_beat_${beat.beat_order}`;
    if (beat.beat_id !== expectedId) {
      reasons.push(
        `expanded beat id ${beat.beat_id} must use deterministic append id ${expectedId}`,
      );
    }
  }

  if (beforeBp.wrap_up_recap.recap_beat_id !== afterBp.wrap_up_recap.recap_beat_id) {
    reasons.push("recap beat id changed");
  }
  const afterRecapId = afterBp.wrap_up_recap.recap_beat_id;
  const afterLast = afterBeats[afterBeats.length - 1];
  if (afterLast?.beat_id !== afterRecapId) {
    reasons.push("recap beat is no longer final");
  }
  const recapBeat = afterBeats.find((b) => b.beat_id === afterRecapId);
  if (!recapBeat) {
    reasons.push("recap beat removed");
  } else if ((recapBeat.pages?.length ?? 0) < 3) {
    reasons.push("recap beat page depth dropped below 3");
  }

  for (const beat of afterBeats) {
    const pages = beat.pages ?? [];
    if (pages.length > 0) {
      if (pages.length < 3) {
        reasons.push(`beat ${beat.beat_id} page depth dropped below 3`);
      }
      const firstFn = pages[0]?.narrative_function;
      if (firstFn && firstFn !== "setup" && firstFn !== "discovery") {
        reasons.push(`beat ${beat.beat_id} first page is not setup/discovery`);
      }
      const lastFn = pages[pages.length - 1]?.narrative_function;
      if (lastFn && lastFn !== "consequence") {
        reasons.push(`beat ${beat.beat_id} final page is not consequence`);
      }
    }
    const reinforcement = beat.reinforcement as unknown;
    if (Array.isArray(reinforcement) && reinforcement.length > 1) {
      reasons.push(`beat ${beat.beat_id} has more than one reinforcement`);
    }
    if (
      beat.reinforcement &&
      beat.reinforcement.timing !== "after_final_page_completion"
    ) {
      reasons.push(`beat ${beat.beat_id} reinforcement timing moved before final page`);
    }
  }

  if (
    Array.isArray(after.screenOutline) &&
    after.screenOutline.some((row) => row.kind === "interaction")
  ) {
    reasons.push("interaction rows reintroduced via screenOutline for story-first plan");
  }

  return { ok: reasons.length === 0, reasons };
}

function getModel() {
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    throw new Error(
      "Remove NEXT_PUBLIC_GEMINI_API_KEY — Gemini keys must not use the NEXT_PUBLIC_ prefix (they would ship to the browser).",
    );
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });
}

/**
 * Gemini often omits `type` / root `body_text` when using pages[]. Coerce before Zod.
 */
export function coerceGeminiStoryPayload(payload: unknown): unknown {
  if (payload == null || typeof payload !== "object") return payload;
  const p = { ...(payload as Record<string, unknown>) };
  p.type = "story";
  const pages = p.pages;
  if (Array.isArray(pages)) {
    const fixedPages = pages.map((page, idx) => {
      if (page && typeof page === "object") {
        const pg = { ...(page as Record<string, unknown>) };
        if (typeof pg.id !== "string" || !String(pg.id).trim()) {
          pg.id = `page_${idx + 1}`;
        }
        return pg;
      }
      return page;
    });
    p.pages = fixedPages;
    if (p.body_text == null || String(p.body_text).trim() === "") {
      const p0 = fixedPages[0] as Record<string, unknown> | undefined;
      const fromPage =
        (typeof p0?.body_text === "string" && p0.body_text.trim()) ||
        (typeof p0?.title === "string" && p0.title.trim()) ||
        "";
      p.body_text = fromPage || " ";
    }
  } else if (p.body_text == null || String(p.body_text).trim() === "") {
    p.body_text = " ";
  }
  return p;
}

export function coerceGeminiInteractionPayload(payload: unknown): unknown {
  if (payload == null || typeof payload !== "object") return payload;
  const p = { ...(payload as Record<string, unknown>) };
  p.type = "interaction";
  if (typeof p.subtype !== "string" || !String(p.subtype).trim()) {
    p.subtype = "mc_quiz";
  } else {
    p.subtype = normalizeInteractionSubtypeForAi(p.subtype);
  }
  return p;
}

function coerceGeminiStoryFirstInteractionPayload(
  payload: unknown,
  subtype: StoryFirstReinforcementSubtype,
): unknown {
  if (payload == null || typeof payload !== "object") return payload;
  const p = { ...(payload as Record<string, unknown>) };
  p.type = "interaction";
  p.subtype = subtype;
  delete p.quiz_group_id;
  delete p.quiz_group_title;
  delete p.quiz_group_order;
  return p;
}

export type ScreenParseDiagnostics = {
  screens: DraftScreenRow[];
  /** Zod (or shape) failures per model-emitted row; dropped screens are not saved. */
  parseWarnings: string[];
  /** `screens` array length in model JSON (before validation drops). */
  modelScreensArrayLength: number;
  /** Screens that passed validation (before `stripExtraOpeningStarts` in orchestrate). */
  validatedScreenCount: number;
  /** Invalid model rows with payload + structured issues (not persisted). */
  failedScreens: FailedScreenCandidate[];
};

/**
 * Parse model JSON screens; collect per-row failures so callers can warn teachers
 * when story screens fail validation but interactions were kept.
 */
export function parseScreensWithDiagnostics(obj: { screens?: unknown }): ScreenParseDiagnostics {
  if (!Array.isArray(obj.screens)) {
    throw new Error("Missing screens array");
  }
  const out: DraftScreenRow[] = [];
  const parseWarnings: string[] = [];
  const failedScreens: FailedScreenCandidate[] = [];
  let i = 0;
  for (const row of obj.screens) {
    const r = row as { screen_type?: string; payload?: unknown };
    if (!r.screen_type || r.payload === undefined) {
      parseWarnings.push(`Screen ${i}: missing screen_type or payload (skipped)`);
      failedScreens.push({
        modelIndex: i,
        screen_type: r.screen_type ?? "missing",
        payload: row,
        summary: "Missing screen_type or payload",
        issues: [],
      });
      i += 1;
      continue;
    }
    try {
      if (r.screen_type === "start") {
        const parsed = startPayloadSchema.parse(r.payload);
        out.push({ screen_type: "start", payload: parsed });
      } else if (r.screen_type === "story") {
        const parsed = storyPayloadSchema.parse(coerceGeminiStoryPayload(r.payload));
        out.push({ screen_type: "story", payload: parsed });
      } else if (r.screen_type === "interaction") {
        const parsed = interactionPayloadSchema.parse(coerceGeminiInteractionPayload(r.payload));
        out.push({ screen_type: "interaction", payload: parsed });
      } else {
        parseWarnings.push(`Screen ${i}: unknown screen_type "${r.screen_type}" (skipped)`);
        failedScreens.push({
          modelIndex: i,
          screen_type: r.screen_type,
          payload: r.payload,
          summary: `Unknown screen_type "${r.screen_type}"`,
          issues: [],
        });
      }
    } catch (e) {
      const { issues, summary } = parseIssuesFromError(e);
      parseWarnings.push(`Screen ${i} (${r.screen_type}): ${summary}`);
      failedScreens.push({
        modelIndex: i,
        screen_type: r.screen_type,
        payload: r.payload,
        summary,
        issues,
      });
    }
    i += 1;
  }
  if (out.length === 0) {
    throw new Error(
      parseWarnings.length ?
        `No valid screens parsed. ${parseWarnings.slice(0, 5).join(" | ")}`
      : "No valid screens parsed",
    );
  }
  return {
    screens: out,
    parseWarnings,
    modelScreensArrayLength: obj.screens.length,
    validatedScreenCount: out.length,
    failedScreens,
  };
}

function parseStoryFirstScreensWithDiagnostics(
  obj: { screens?: unknown },
  steps: StoryFirstMaterializationStep[],
): ScreenParseDiagnostics {
  if (!Array.isArray(obj.screens)) {
    throw new Error("Missing screens array");
  }
  const out: DraftScreenRow[] = [];
  const parseWarnings: string[] = [];
  const failedScreens: FailedScreenCandidate[] = [];
  let rowIndex = 0;

  const first = obj.screens[0] as { screen_type?: string; payload?: unknown } | undefined;
  if (first?.screen_type === "start" && first.payload !== undefined) {
    try {
      out.push({ screen_type: "start", payload: startPayloadSchema.parse(first.payload) });
    } catch (e) {
      const { issues, summary } = parseIssuesFromError(e);
      parseWarnings.push(`Screen 0 (start): ${summary}`);
      failedScreens.push({
        modelIndex: 0,
        screen_type: "start",
        payload: first.payload,
        summary,
        issues,
      });
    }
    rowIndex = 1;
  }

  for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
    const step = steps[stepIndex];
    const stepNo = stepIndex + 1;
    const row = obj.screens[rowIndex] as { screen_type?: string; payload?: unknown } | undefined;
    const storyCtxBase = {
      stepIndex: stepNo,
      stepKind: step.kind === "story" ? ("story" as const) : ("reinforcement" as const),
      beatId: step.beat.beat_id,
      expectedSubtype: step.kind === "reinforcement" ? step.subtype : undefined,
    };
    if (!row || row.payload === undefined) {
      parseWarnings.push(`Story-First step ${stepNo}: missing generated screen`);
      failedScreens.push({
        modelIndex: rowIndex,
        screen_type: row?.screen_type ?? "missing",
        payload: row ?? null,
        summary: `Story-First step ${stepNo}: missing generated screen (no row or no payload)`,
        issues: [],
        storyFirstContext: storyCtxBase,
      });
      rowIndex += 1;
      continue;
    }
    try {
      if (step.kind === "story") {
        if (row.screen_type !== "story") {
          parseWarnings.push(
            `Screen ${rowIndex}: expected story for beat ${step.beat.beat_id}, got ${row.screen_type ?? "missing"}`,
          );
          failedScreens.push({
            modelIndex: rowIndex,
            screen_type: row.screen_type ?? "missing",
            payload: row.payload,
            summary: `Expected story for beat ${step.beat.beat_id}, got ${row.screen_type ?? "missing"}`,
            issues: [],
            storyFirstContext: storyCtxBase,
          });
          rowIndex += 1;
          continue;
        }
        const parsed = storyPayloadSchema.parse(coerceGeminiStoryPayload(row.payload));
        out.push({ screen_type: "story", payload: parsed });
      } else {
        if (row.screen_type !== "interaction") {
          parseWarnings.push(
            `Screen ${rowIndex}: expected ${step.subtype} reinforcement for beat ${step.beat.beat_id}, got ${row.screen_type ?? "missing"}`,
          );
          failedScreens.push({
            modelIndex: rowIndex,
            screen_type: row.screen_type ?? "missing",
            payload: row.payload,
            summary: `Expected ${step.subtype} reinforcement for beat ${step.beat.beat_id}, got ${row.screen_type ?? "missing"}`,
            issues: [],
            storyFirstContext: storyCtxBase,
          });
          rowIndex += 1;
          continue;
        }
        const parsed = interactionPayloadSchema.parse(
          coerceGeminiStoryFirstInteractionPayload(row.payload, step.subtype),
        );
        out.push({ screen_type: "interaction", payload: parsed });
      }
    } catch (e) {
      const { issues, summary } = parseIssuesFromError(e);
      parseWarnings.push(`Screen ${rowIndex} (${row.screen_type ?? "unknown"}): ${summary}`);
      failedScreens.push({
        modelIndex: rowIndex,
        screen_type: row.screen_type ?? "unknown",
        payload: row.payload,
        summary,
        issues,
        storyFirstContext: storyCtxBase,
      });
    }
    rowIndex += 1;
  }

  if (obj.screens.length > rowIndex) {
    parseWarnings.push(
      `Story-First generation returned ${obj.screens.length - rowIndex} extra screen(s); ignored`,
    );
  }
  if (out.filter((screen) => screen.screen_type !== "start").length === 0) {
    throw new Error(
      parseWarnings.length ?
        `No valid Story-First screens parsed. ${parseWarnings.slice(0, 5).join(" | ")}`
      : "No valid Story-First screens parsed",
    );
  }
  return {
    screens: out,
    parseWarnings,
    modelScreensArrayLength: obj.screens.length,
    validatedScreenCount: out.length,
    failedScreens,
  };
}

export function normalizePlan(parsed: unknown): AiLessonPlan {
  return normalizeAiLessonPlan(parsed);
}

function screenOutlineSection(structured: AiLessonPlan, learningGoals: string[]): string {
  if (!structured.screenOutline?.length) return "";
  const lines = structured.screenOutline.map((row, i) => {
    if (row.kind === "story") {
      const head: string[] = [`${i + 1}. **story**`];
      if (row.title) head.push(`— ${row.title}`);
      if (row.summary) head.push(`— ${row.summary}`);
      if (row.layout_mode) head.push(`(${row.layout_mode})`);
      const beatGoals = goalRefsLine(learningGoals, row.learning_goal_indices);
      if (beatGoals) head.push(beatGoals);
      if (row.pages?.length) {
        const pageBits = row.pages.map((p, pi) => {
          const parts = [`P${pi + 1}: ${p.summary}`];
          if (p.interaction_mode) parts.push(`mode \`${p.interaction_mode}\``);
          const pg = goalRefsLine(learningGoals, p.learning_goal_indices);
          if (pg) parts.push(pg);
          if (p.phases?.length) {
            parts.push(
              `phases: ${p.phases
                .map(
                  (ph) =>
                    `${ph.intent}${ph.transition ? ` →${ph.transition}` : ""}${ph.animation_hint ? ` (${ph.animation_hint})` : ""}`,
                )
                .join("; ")}`,
            );
          }
          return `    - ${parts.join(" · ")}`;
        });
        return `${head.join(" ")}\n${pageBits.join("\n")}`;
      }
      return head.join(" ");
    }
    const st = normalizeInteractionSubtypeForAi(row.subtype);
    return `${i + 1}. **interaction** — subtype \`${st}\`${row.quiz_group_title ? ` — group *${row.quiz_group_title}*` : ""}${row.summary ? ` — ${row.summary}` : ""}`;
  });
  return `## Screen-by-screen flow

${lines.join("\n")}
`;
}

function storyFirstBlueprintSection(structured: AiLessonPlan): string {
  const blueprint = structured.storyFirstBlueprint;
  if (!blueprint) return "";
  const lines = blueprint.ordered_story_beats
    .slice()
    .sort((a, b) => a.beat_order - b.beat_order)
    .map((beat) => {
      const head = `${beat.beat_order}. **story** — ${beat.beat_title ?? beat.beat_id} — ${beat.story_event}`;
      const language = [
        beat.language_introduced.vocabulary.length ?
          `vocab: ${beat.language_introduced.vocabulary.join(", ")}`
        : "",
        beat.grammar_modeled.model_sentences.length ?
          `models: ${beat.grammar_modeled.model_sentences.join(" / ")}`
        : "",
      ].filter(Boolean);
      const reinforcement = beat.reinforcement ?
        `\n    - reinforcement: \`${beat.reinforcement.activity_type}\` attached to \`${beat.reinforcement.attached_to_beat_id}\` — ${beat.reinforcement.reason_for_activity_choice}`
      : "";
      return `${head}${language.length ? `\n    - ${language.join(" · ")}` : ""}${reinforcement}`;
    });
  return `## Story-first blueprint flow

Pattern: **${blueprint.story_pattern_type}**

${lines.join("\n")}

Final recap beat: \`${blueprint.wrap_up_recap.recap_beat_id}\` — ${blueprint.wrap_up_recap.final_success_moment}
`;
}

const LESSON_PLAN_DOC_FOOTER = `---
*You can edit this document freely. Use **Generate activities** when ready — the app uses this text plus saved objectives.*`;

/** Quiz groups, media, screen outline, and footer — canonical tail aligned with lesson_plan_meta. */
export function structuredLessonPlanSuffix(structured: AiLessonPlan, learningGoals: string[]): string {
  const quizLines = structured.quizGroups
    .map((g) => `- **${g.title}**: ${g.questionCount} question(s)`)
    .join("\n");
  const media =
    structured.mediaSearchTerms.length > 0 ?
      structured.mediaSearchTerms.join(", ")
    : "(add keywords as needed)";
  const storyFirst = storyFirstBlueprintSection(structured).trim();
  const outline = screenOutlineSection(structured, learningGoals).trim();
  const blocks = storyFirst ?
    [storyFirst, `## Media / search terms\n${media}`]
  : [`## Quiz groups\n${quizLines}`, `## Media / search terms\n${media}`];
  if (outline) blocks.push(outline);
  blocks.push(LESSON_PLAN_DOC_FOOTER);
  return blocks.join("\n\n");
}

/**
 * Remove structured sections the app overwrites after enhance (and trailing doc footer).
 */
export function stripEnhancedPlanNarrativeMarkdown(raw: string): string {
  let t = raw.replace(/\r\n/g, "\n").trimEnd();
  t = t.replace(/\n---\n\*You can edit this document freely\.[\s\S]*$/m, "").trimEnd();
  const markers = [
    /^## Story-first blueprint flow\b/im,
    /^## Quiz groups\b/im,
    /^## Media \/ search terms\b/im,
    /^## Screen-by-screen flow\b/im,
  ];
  let cut = -1;
  for (const re of markers) {
    const m = re.exec(t);
    if (m && (cut < 0 || m.index < cut)) cut = m.index;
  }
  if (cut >= 0) t = t.slice(0, cut).trimEnd();
  return t;
}

/** Append canonical quiz/media/outline/footer from structured plan (single source of truth with lesson_plan_meta). */
export function mergeEnhancedLessonPlanMarkdown(
  narrativeMarkdown: string,
  plan: AiLessonPlan,
  learningGoals: string[],
): string {
  const head = stripEnhancedPlanNarrativeMarkdown(narrativeMarkdown);
  const suffix = structuredLessonPlanSuffix(plan, learningGoals);
  if (!head) return suffix;
  return `${head}\n\n${suffix}`;
}

/** Build human-readable lesson plan markdown from structured AI output + context. */
export function formatLessonPlanMarkdown(
  structured: AiLessonPlan,
  ctx: {
    title: string;
    cefrBand: string;
    learningGoals: string[];
    seedPrompt: string;
  },
): string {
  const goals =
    ctx.learningGoals.length > 0 ?
      ctx.learningGoals.map((g, i) => `${i + 1}. ${g}`).join("\n")
    : "(none listed)";
  return `# Lesson plan: ${ctx.title}

## Context
- **CEFR band:** ${ctx.cefrBand}
- **Author seed / premise:** ${ctx.seedPrompt.trim() || "(none)"}

## Learning goals
${goals}

## Narrative
Use **${structured.storyBeatCount}** story screen(s) that build a coherent sequence and address the goals above.

${structuredLessonPlanSuffix(structured, ctx.learningGoals)}
`;
}

/**
 * Recover structured plan from edited free text (for screen generation).
 */
export async function parseLessonPlanMetaFromText(lessonPlanText: string): Promise<AiLessonPlan> {
  const trimmed = lessonPlanText.trim().slice(0, 12_000);
  if (!trimmed) {
    throw new Error("Lesson plan is empty; add content or run Draft plan with AI.");
  }
  const model = getModel();
  const prompt = `You extract lesson structure for an ESL lesson authoring tool. Return JSON ONLY with this exact shape:
{
${STORY_FIRST_BLUEPRINT_SHAPE},
  "storyBeatCount": number (2-12),
  "quizGroups": [],
  "mediaSearchTerms": string[] (2-12 English keywords for images, no URLs),
  "screenOutline"?: []
}

${STORY_FIRST_BLUEPRINT_POLICY}

Infer a Story-First Blueprint from the teacher's lesson plan document below. If the document has old quiz blocks, convert them into beat-attached reinforcement only when they clearly connect to a story beat. Otherwise prefer story-only beats.

---
${trimmed}
---
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Could not parse lesson plan into structure; try Draft plan with AI again.");
  }
  return normalizeAiLessonPlan(parsed);
}

/**
 * Collaborative enhance: merge AI suggestions into an existing teacher-written markdown plan.
 */
export async function enhanceLessonPlanCollaborative(input: {
  title: string;
  cefrBand: string;
  learningGoals: string[];
  vocabulary: string;
  existingMarkdown: string;
  optionalPremise?: string;
  existingPlanMeta?: unknown;
}): Promise<{ markdown: string; plan: AiLessonPlan }> {
  const goalsBlock =
    input.learningGoals.length > 0 ?
      input.learningGoals.map((g, i) => `${i + 1}. ${g}`).join("\n")
    : "(none)";

  const premiseHint = input.optionalPremise?.trim() || "(none — infer only from document and goals)";
  const docSlice = input.existingMarkdown.trim().slice(0, 36_000);
  const baselinePlan = safeParseStoredLessonPlanMeta(input.existingPlanMeta);
  const baselineBlueprint = baselinePlan?.storyFirstBlueprint;
  const baselineInvariantContext =
    baselineBlueprint ?
      `Existing Story-First structure invariants (must preserve exactly):
- ordered beat ids: ${sortedBeats(baselineBlueprint)
  .map((beat) => beat.beat_id)
  .join(", ")}
- recap beat id: ${baselineBlueprint.wrap_up_recap.recap_beat_id}
- beat page counts: ${sortedBeats(baselineBlueprint)
  .map((beat) => `${beat.beat_id}:${beat.pages?.length ?? 0}`)
  .join(", ")}
- reinforcement timing must stay after_final_page_completion when reinforcement exists.
`
    : "";

  const model = getModel();
  const prompt = `You are collaborating with an ESL teacher on a lesson plan written in Markdown.

CRITICAL INSTRUCTION (HIGHEST PRIORITY):
- Preserve Story-First Blueprint structure exactly.
- Do NOT convert to generic summary, Activities sections, or quiz-group lesson format.
- Do NOT collapse beats/pages into short prose notes.
- Do NOT move reinforcement before final page completion of its beat.
- If you simplify or downgrade structure, output is invalid.

Rules:
- PRESERVE the teacher's existing ideas, tone, and paragraphs. Do not delete substantive content.
- You MAY improve clarity inside existing narrative paragraphs, but must keep the same Story-First architecture.
- EXPAND with concrete Story-First planning: story is the lesson backbone; reinforcement activities must attach to specific story beats.
- lessonPlanMarkdown must contain ONLY teacher-facing narrative (lesson framing, goals, vocabulary, story overview, activity themes). Do NOT include "## Quiz groups", "## Media / search terms", "## Screen-by-screen flow", or the "---" document footer — the application appends those from the structured JSON fields.
- Return JSON ONLY with this exact shape:
{
  "lessonPlanMarkdown": string (narrative markdown only — no quiz/media/screen-flow headings),
${STORY_FIRST_BLUEPRINT_SHAPE},
  "storyBeatCount": number (2-12),
  "quizGroups": [],
  "mediaSearchTerms": string[] (2-12 English keywords, no URLs),
  "screenOutline"?: []
}

${STORY_FIRST_BLUEPRINT_POLICY}

Before you output JSON, verify hard invariants:
- beat count does not decrease
- beat order does not change
- existing beat ids do not change
- recap beat id remains exact and final
- page counts may expand but never reduce
- no beat page depth below 3
- first page remains setup/discovery and final page remains consequence
- reinforcement stays after_final_page_completion
- max one reinforcement per beat
- do not output story-first plans as quiz-group chains

${baselineInvariantContext}

Lesson title: ${input.title}
CEFR band: ${input.cefrBand}
Optional premise hint from teacher: ${premiseHint}
Learning goals:
${goalsBlock}
Vocabulary: ${input.vocabulary || "(none specified)"}

Current lesson plan document:
---
${docSlice}
---
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Enhance model did not return valid JSON");
  }
  const o = parsed as Record<string, unknown>;
  const narrative = String(o.lessonPlanMarkdown ?? "").trim();
  if (!narrative) {
    throw new Error("Enhance model returned empty lessonPlanMarkdown");
  }
  const enhancedPlan = normalizeAiLessonPlan(parsed);
  let plan = enhancedPlan;
  if (baselinePlan?.storyFirstBlueprint) {
    const check = validateEnhancerStructureInvariants(baselinePlan, enhancedPlan);
    if (!check.ok) {
      plan = baselinePlan;
    }
  }
  const markdown = mergeEnhancedLessonPlanMarkdown(narrative, plan, input.learningGoals);
  if (!markdown.trim()) {
    throw new Error("Enhance model returned empty lesson plan markdown");
  }
  return { markdown, plan };
}

/**
 * Step 1: structured lesson plan (Story-First Blueprint, media hints, legacy-safe metadata).
 */
export async function generateLessonPlan(input: {
  title: string;
  cefrBand: string;
  learningGoals: string[];
  vocabulary: string;
  premise: string;
}): Promise<AiLessonPlan> {
  const goalsBlock =
    input.learningGoals.length > 0 ?
      input.learningGoals.map((g, i) => `${i + 1}. ${g}`).join("\n")
    : "(none)";

  const model = getModel();
  const prompt = `You are an English language curriculum designer for Vietnamese young learners.
Return JSON ONLY with this exact shape:
{
${STORY_FIRST_BLUEPRINT_SHAPE},
  "storyBeatCount": number (2-12, must equal ordered_story_beats length),
  "quizGroups": [],
  "mediaSearchTerms": string[] (2-12 short English keywords for pictures — no URLs),
  "screenOutline"?: []
}

${STORY_FIRST_BLUEPRINT_POLICY}

Rules:
- Build ordered_story_beats as the source of truth for lesson playback.
- First beat must introduce story context before any reinforcement.
- Final beat must be narrative_function "recap" and must match wrap_up_recap.recap_beat_id.
- Reinforcement is optional per beat; never create standalone quiz blocks.
- Use only mc_quiz, true_false, fill_blanks, fix_text, letter_mixup for reinforcement.
- Set each reinforcement.attached_to_beat_id to the same beat_id where it appears.
- mediaSearchTerms: nouns from premise and vocabulary.
- Before returning JSON, verify language is introduced in story before it is checked or corrected.

Lesson title: ${input.title}
CEFR / level band: ${input.cefrBand}
Learning goals (must be addressed in the lesson):
${goalsBlock}
Vocabulary to weave in: ${input.vocabulary || "(none specified)"}
Story premise: ${input.premise}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Plan model did not return valid JSON");
  }
  return normalizeAiLessonPlan(parsed);
}

function formatMaterializationOrder(
  steps: MaterializationStep[],
  learningGoals: string[],
): string {
  return steps
    .map((s, i) => {
      if (s.kind === "story") {
        const body = formatStoryOutlineForMaterialization(s.row, learningGoals);
        const indented = body
          .split("\n")
          .map((line) => (line.trim() ? `   ${line}` : line))
          .join("\n");
        return `${i + 1}. story\n${indented}`;
      }
      const sub = normalizeInteractionSubtypeForAi(s.slot.subtype);
      return `${i + 1}. interaction | subtype MUST be "${sub}" | quiz_group_id "${s.slot.quiz_group_id}" | quiz_group_title "${s.slot.quiz_group_title}" | quiz_group_order ${s.slot.quiz_group_order} | intent: ${s.slot.summary}`;
    })
    .join("\n");
}

type StoryFirstMaterializationStep =
  | { kind: "story"; beat: StoryBeat; isRecap: boolean }
  | {
      kind: "reinforcement";
      beat: StoryBeat;
      subtype: StoryFirstReinforcementSubtype;
      reason: string;
    };

function buildStoryFirstMaterializationSteps(
  plan: AiLessonPlan,
): StoryFirstMaterializationStep[] | null {
  const blueprint = plan.storyFirstBlueprint;
  if (!blueprint) return null;
  const beats = blueprint.ordered_story_beats
    .slice()
    .sort((a, b) => a.beat_order - b.beat_order);
  const lastBeat = beats[beats.length - 1];
  if (!lastBeat || lastBeat.beat_id !== blueprint.wrap_up_recap.recap_beat_id) {
    return null;
  }

  const steps: StoryFirstMaterializationStep[] = [];
  for (const beat of beats) {
    const isRecap = beat.beat_id === blueprint.wrap_up_recap.recap_beat_id;
    steps.push({ kind: "story", beat, isRecap });
    if (!isRecap && beat.reinforcement) {
      steps.push({
        kind: "reinforcement",
        beat,
        subtype: normalizeStoryFirstReinforcementSubtypeForAi(
          beat.reinforcement.activity_type,
        ),
        reason: beat.reinforcement.reason_for_activity_choice,
      });
    }
  }
  return steps;
}

/** Serialize one phase trigger to a compact, human-readable string for the materialization prompt. */
function formatPhaseTrigger(trigger: PhaseTrigger | undefined): string {
  if (!trigger) return "auto_present";
  switch (trigger.type) {
    case "auto_present": return "auto_present";
    case "on_click_item": return `on_click_item(target="${trigger.target_item_id}")`;
    case "all_matched": return "all_matched";
    case "sequence_complete": return `sequence_complete(seq="${trigger.sequence_id}")`;
    case "end_phase": return "end_phase";
  }
}

/** Serialize one phase completion effect. */
function formatPhaseCompletion(effect: PhaseCompletionEffect | undefined): string {
  if (!effect) return "end_phase";
  switch (effect.type) {
    case "end_phase": return "end_phase";
    case "unlock_next_phase": return "unlock_next_phase";
    case "unlock_next_page":
      return effect.show_continue_arrow ? "unlock_next_page(show_continue_arrow)" : "unlock_next_page";
  }
}

function formatStoryFirstMaterializationOrder(
  steps: StoryFirstMaterializationStep[],
): string {
  return steps
    .map((step, i) => {
      if (step.kind === "story") {
        const beat = step.beat;
        const vocab = beat.language_introduced.vocabulary.join(", ") || "(none)";
        const phrases = beat.language_introduced.phrases.join(" / ") || "(none)";
        const grammar =
          beat.grammar_modeled.model_sentences.join(" / ") ||
          beat.grammar_modeled.grammar_points.join(", ") ||
          "(none)";
        const pages =
          beat.pages?.map((page, pageIndex) => {
            const mode = page.narrative_function;
            const goal = page.page_goal;
            let phaseText = "";
            if (page.phases?.length) {
              const phaseLines = page.phases.map((phase) => {
                const triggerStr = phase.trigger ? formatPhaseTrigger(phase.trigger) : (phase.completion_rule ?? "auto_present");
                const completionStr = phase.completion ? formatPhaseCompletion(phase.completion) : (phase.completion_rule ?? "end_phase");
                const successLine = phase.success_response?.dialogue ?? phase.character_dialogue ?? "";
                const failureLine = phase.failure_response?.dialogue ?? "";
                const parts = [`id="${phase.phase_id}" purpose="${phase.purpose}" trigger=${triggerStr} completion=${completionStr}`];
                if (successLine) parts.push(`success_dialogue="${successLine}"`);
                if (failureLine) parts.push(`failure_dialogue="${failureLine}"`);
                return parts.join(" | ");
              });
              phaseText = `\n      phases:\n${phaseLines.map((l) => `        - ${l}`).join("\n")}`;
            }
            return `P${pageIndex + 1} (${mode}) goal: ${goal}${phaseText}`;
          }) ?? [];
        return `${i + 1}. story | beat_id "${beat.beat_id}"${step.isRecap ? " | FINAL RECAP" : ""}
   narrative_function: ${beat.narrative_function ?? "story_progression"}
   event: ${beat.story_event}
   introduce vocabulary: ${vocab}
   useful phrases: ${phrases}
   model grammar: ${grammar}
   beat_pages: ${pages.length > 0 ? pages.join(" || ") : "Must generate at least 3 pages: setup/discovery -> learner action -> consequence"}
   next transition: ${beat.progression_logic.transition_to_next_beat ?? "(end or natural story continuation)"}`;
      }
      const brief = step.beat.reinforcement?.generator_brief;
      return `${i + 1}. interaction | subtype MUST be "${step.subtype}" | attached_to_beat_id "${step.beat.beat_id}"
   timing: after_final_page_completion (this interaction can happen only after the beat's final page is completed)
   story context: ${step.beat.story_event}
   reason: ${step.reason}
   generate: ${brief?.what_to_generate ?? "Create one short reinforcement task that checks only this beat's introduced language."}
   avoid: ${brief?.what_not_to_generate ?? "Do not introduce new language or disconnected quiz content."}`;
    })
    .join("\n");
}

function planStoryOutlineNeedsRichPayload(plan: AiLessonPlan): boolean {
  for (const row of plan.screenOutline ?? []) {
    if (row.kind !== "story") continue;
    if (
      row.pages?.some(
        (p) => (p.phases?.length ?? 0) > 0 || Boolean(p.interaction_mode && p.interaction_mode !== "present_only"),
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Step 2: full screens from plan + media allowlist + quiz group UUIDs.
 */
export async function generateLessonScreensFromPlan(input: {
  title: string;
  cefrBand: string;
  learningGoals: string[];
  vocabulary: string;
  premise: string;
  lessonPlanText: string;
  plan: AiLessonPlan;
  mediaAllowlist: MediaAllowlistItem[];
  quizGroupSpecs: QuizGroupSpec[];
  omitOpeningStart: boolean;
}): Promise<ScreenParseDiagnostics> {
  const goalsBlock =
    input.learningGoals.length > 0 ?
      input.learningGoals.map((g, i) => `${i + 1}. ${g}`).join("\n")
    : "";

  const allowBlock =
    input.mediaAllowlist.length > 0 ?
      input.mediaAllowlist
        .map((m, i) => `${i + 1}. ${m.url}${m.description ? ` (${m.description})` : ""}`)
        .join("\n")
    : "(use https://placehold.co/800x400/... only)";

  const storyFirstSteps = buildStoryFirstMaterializationSteps(input.plan);
  const materializationSteps = storyFirstSteps ? null : (
    buildMaterializationSteps(input.plan, input.quizGroupSpecs)
  );

  const quizBlock = input.quizGroupSpecs
    .map(
      (g) =>
        `- Group "${g.title}" (quiz_group_id MUST be exactly "${g.id}"): ${g.questionCount} question(s). Orders 0 .. ${g.questionCount - 1}.`,
    )
    .join("\n");

  const storyN = storyScreenCountFromPlan(input.plan);
  const storyRules = storyPageCatalogPromptSnippet();
  const interactionRules = storyFirstSteps ?
    storyFirstReinforcementPromptSnippet()
  : legacyInteractionCatalogPromptSnippet();

  const startRule =
    storyFirstSteps ?
      input.omitOpeningStart ?
        `CRITICAL: Do NOT include any "start" screen_type — first generated learning screen MUST be "story". The lesson already has an opening start in the editor.`
      : `Include exactly one "start" screen first with type start, then follow the SCREEN ORDER below. The first learning screen after start MUST be "story".`
    : input.omitOpeningStart ?
      `CRITICAL: Do NOT include any "start" screen_type — follow the SCREEN ORDER below exactly. The lesson already has an opening start in the editor.`
    : `Include exactly one "start" screen first with type start, then follow the SCREEN ORDER below exactly.`;

  const richStory = planStoryOutlineNeedsRichPayload(input.plan);
  const richStoryRules = richStory ?
    `RICH STORY OUTLINE: The plan specifies per-page interaction_mode and/or phases. For each story step in SCREEN ORDER below:
- Use pages[] with at least as many pages as the outline lists for that beat; align body_text / read_aloud_text with each page summary.
- When the outline lists phases for a page, implement phases[] on that page with completion rules matching the transition hints (on_click_item → on_click; auto_delay → auto; all_matched → all_matched; end → end_phase or end of flow as appropriate).
- For interaction_mode drag_match or mixed, place draggable items and match targets on the same page (items[]), using phase or pass_rule completion so the learner can finish the match in-scene.
- Respect learning_goal_indices from the outline by covering that vocabulary/skill on the indicated page or beat.
`
  : "";

  let orderRule: string;
  if (storyFirstSteps && storyFirstSteps.length > 0) {
    orderRule = `STORY-FIRST SCREEN ORDER — emit exactly ${storyFirstSteps.length} main content screens after any start (same count, same order, same types):
${formatStoryFirstMaterializationOrder(storyFirstSteps)}

- For each "story" line: emit one screen_type "story" payload following STORY RULES. It must deliver that story beat, introduce the listed language in context, and include simple read_aloud_text.
- For each "interaction" line: emit one screen_type "interaction" payload with the exact subtype shown. Do NOT set quiz_group_id, quiz_group_title, or quiz_group_order for Story-First reinforcement.
- Every interaction must directly reference the immediately preceding story beat. Do not create standalone quiz blocks.
- The final content screen must be the FINAL RECAP story line. Do not add any interaction after it.

PHASE ORCHESTRATION INSTRUCTIONS (Story-First only):
When beat_pages lists phases for a page, you MUST implement those phases in pages[].phases[]:
- Match the blueprint phase count and order exactly. Do not add or drop phases.
- Map blueprint trigger types to runtime completion: on_click_item → completion {type:"on_click", target_item_id:"<same slug>"}, all_matched → {type:"all_matched"}, sequence_complete → {type:"sequence_complete", sequence_id:"<same slug>"}, auto_present / end_phase → {type:"end_phase"} or {type:"auto", delay_ms:500}.
- completion.type "unlock_next_phase" → set next_phase_id linking to the following phase.
- completion.type "unlock_next_page" → final phase on the page; use {type:"end_phase"} (or {type:"auto", delay_ms:0}) and the book UI will handle page advance. When show_continue_arrow is true, ensure the page is not auto-advancing so the continue button is visible.
- SEMANTIC IDs: use the exact phase_id, target_item_id, and sequence_id slugs from the blueprint in the generated items[].id and phase.id fields. Do NOT invent new IDs.
- dialogue.start — opening character line when the phase begins (use blueprint scene_progression or infer from context).
- dialogue.success — character line after a correct learner action (from blueprint success_response.dialogue).
- dialogue.error — character line after a wrong action (from blueprint failure_response.dialogue, e.g. "Try again!"). Always include dialogue.error when the phase has a learner-action trigger.
- highlight_item_ids — list the target item's id when trigger is on_click_item to give learners a visual cue.`;
  } else if (materializationSteps && materializationSteps.length > 0) {
    orderRule = `SCREEN ORDER — emit exactly ${materializationSteps.length} main content screens after any start (same count, same order, same types):
${formatMaterializationOrder(materializationSteps, input.learningGoals)}

${richStoryRules}- For each "story" block: one screen_type "story" payload following STORY RULES and any RICH STORY OUTLINE rules above.
- For each "interaction" line: one screen_type "interaction" with subtype exactly as given; set quiz_group_id, quiz_group_title, quiz_group_order from that line; fill payload fields per INTERACTION RULES for that subtype.`;
  } else {
    orderRule = `After any opening start (if included), include exactly ${storyN} "story" screens, then ALL quiz questions as "interaction" screens in order: for each quiz group, emit exactly that many mc_quiz screens in a row.

STORY RULES (legacy mode): prefer pages[] per STORY RULES block; or single image_url + body_text + read_aloud_text + tts_lang "en-US".

Interaction (legacy mode): mc_quiz only with question, options, correct_option_id, shuffle_options true, quiz_group_* fields.`;
  }

  const model = getModel();
  const prompt = `You are an English language teacher writing digital lesson screens for Vietnamese primary learners.
Return JSON ONLY:
{ "screens": [ { "screen_type": "start"|"story"|"interaction", "payload": { ... } }, ... ] }

${startRule}

${orderRule}

STORY RULES:
${storyRules}

INTERACTION RULES:
${interactionRules}

- image_url / background_image_url for stories should be copied exactly from MEDIA LIBRARY when possible, else placehold.co.
- REQUIRED on every story payload: "type": "story" and string "body_text" (summary line; if you use pages[], repeat the first page's main text or use a single space " ").
- For Story-First beats, emit pages[] with minimum 3 pages per beat and keep page-level intent: setup/discovery entry -> learner action progression -> consequence closure.
- Never insert interaction screens inside a beat's page flow. Reinforcement is allowed only after the beat's final page is complete.
- REQUIRED on every interaction payload: "type": "interaction" and "subtype" matching the SCREEN ORDER line.
${storyFirstSteps ? "- Story-First reinforcement may only use mc_quiz, true_false, fill_blanks, fix_text, or letter_mixup." : "- Legacy materialization may use any subtype explicitly listed in SCREEN ORDER and described in INTERACTION RULES."}
- Use simple English aligned with CEFR band ${input.cefrBand}.

Lesson title: ${input.title}
Learning goals:
${goalsBlock || "(see lesson plan)"}
Vocabulary: ${input.vocabulary || ""}
Short premise line: ${input.premise}

Full lesson plan:
---
${input.lessonPlanText.trim().slice(0, 8_000)}
---

${storyFirstSteps ? "QUIZ GROUP UUIDS: not used for Story-First reinforcement; do not set quiz_group_* fields." : `QUIZ GROUP UUIDS (must match interaction payloads):\n${quizBlock}`}

MEDIA LIBRARY:
${allowBlock}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Generation model did not return valid JSON");
  }
  if (storyFirstSteps) {
    return parseStoryFirstScreensWithDiagnostics(
      parsed as { screens?: unknown },
      storyFirstSteps,
    );
  }
  return parseScreensWithDiagnostics(parsed as { screens?: unknown });
}

/** @deprecated Use generateLessonPlan + generateLessonScreensFromPlan via orchestrate */
export async function generateLessonDrafts(input: {
  title: string;
  gradeBand: string;
  goal: string;
  vocabulary: string;
  premise: string;
}): Promise<DraftScreenRow[]> {
  const plan = await generateLessonPlan({
    title: input.title,
    cefrBand: input.gradeBand,
    learningGoals: input.goal ? [input.goal] : [],
    vocabulary: input.vocabulary,
    premise: input.premise,
  });
  const quizGroupSpecs: QuizGroupSpec[] = quizGroupsForSpecs(plan).map((g) => ({
    id: randomUUID(),
    title: g.title,
    questionCount: g.questionCount,
  }));
  const doc = formatLessonPlanMarkdown(plan, {
    title: input.title,
    cefrBand: input.gradeBand,
    learningGoals: input.goal ? [input.goal] : [],
    seedPrompt: input.premise,
  });
  const { screens } = await generateLessonScreensFromPlan({
    title: input.title,
    cefrBand: input.gradeBand,
    learningGoals: input.goal ? [input.goal] : [],
    vocabulary: input.vocabulary,
    premise: input.premise,
    lessonPlanText: doc,
    plan,
    mediaAllowlist: [],
    quizGroupSpecs,
    omitOpeningStart: false,
  });
  return screens;
}
