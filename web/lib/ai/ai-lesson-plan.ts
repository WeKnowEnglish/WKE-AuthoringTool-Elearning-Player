import { z } from "zod";
import { STORY_FIRST_REINFORCEMENT_SUBTYPES } from "@/lib/ai/interaction-catalog";

/** Per-page phase intent in the lesson plan outline (maps to story `phases[]` in materialization). */
export const outlinePhasePlanSchema = z.object({
  intent: z.string().max(500),
  transition: z
    .enum(["on_click_item", "auto_delay", "all_matched", "end"])
    .optional(),
  animation_hint: z.string().max(200).optional(),
});

/** Rich page row in a story outline beat (backward compatible with `{ summary }` only). */
export const outlinePagePlanSchema = z.object({
  summary: z.string().max(1000),
  learning_goal_indices: z.array(z.number().int().min(0)).max(8).optional(),
  interaction_mode: z
    .enum(["tap_to_advance", "drag_match", "mixed", "present_only"])
    .optional(),
  phases: z.array(outlinePhasePlanSchema).max(5).optional(),
});

export type OutlinePagePlan = z.infer<typeof outlinePagePlanSchema>;
export type OutlinePhasePlan = z.infer<typeof outlinePhasePlanSchema>;

export const screenOutlineStorySchema = z.object({
  kind: z.literal("story"),
  title: z.string().max(120).optional(),
  summary: z.string().max(2000).optional(),
  layout_mode: z.enum(["book", "slide"]).optional(),
  learning_goal_indices: z.array(z.number().int().min(0)).max(8).optional(),
  pages: z.array(outlinePagePlanSchema).max(8).optional(),
});

export const screenOutlineInteractionSchema = z.object({
  kind: z.literal("interaction"),
  title: z.string().max(120).optional(),
  subtype: z.string().max(64),
  quiz_group_title: z.string().max(120).optional(),
  summary: z.string().max(2000).optional(),
});

export const screenOutlineRowSchema = z.discriminatedUnion("kind", [
  screenOutlineStorySchema,
  screenOutlineInteractionSchema,
]);

export type ScreenOutlineRow = z.infer<typeof screenOutlineRowSchema>;

const quizGroupSchema = z.object({
  title: z.string(),
  questionCount: z.number().int().min(1).max(8),
});

export const storyFirstReinforcementSubtypeSchema = z.enum(
  STORY_FIRST_REINFORCEMENT_SUBTYPES,
);

export type StoryFirstReinforcementSubtype = z.infer<
  typeof storyFirstReinforcementSubtypeSchema
>;

export const storyPatternTypeSchema = z.enum([
  "zoo_visit",
  "school_day",
  "adventure",
  "mystery",
  "travel",
  "daily_life",
  "shopping",
  "family",
  "food",
  "classroom_problem",
  "friendship",
  "custom",
]);

export type StoryPatternType = z.infer<typeof storyPatternTypeSchema>;

const cefrLevelSchema = z.enum(["Pre-A1", "A1", "A2", "B1", "B2", "C1"]);

const targetAgeSchema = z.object({
  min_age: z.number().int().min(3).max(18),
  max_age: z.number().int().min(3).max(18),
});

const vocabularyTargetSchema = z.object({
  term: z.string().min(1).max(80),
  meaning: z.string().max(300).optional(),
  introduced_in_beat_id: z.string().min(1),
  recycled_in_beat_ids: z.array(z.string()).default([]),
  required_for_reinforcement: z.boolean().optional(),
});

const grammarTargetSchema = z.object({
  grammar_point: z.string().min(1).max(160),
  function: z.string().max(300).optional(),
  modeled_in_beat_ids: z.array(z.string()).default([]),
  practiced_in_beat_ids: z.array(z.string()).default([]),
  correction_allowed_after_beat_id: z.string().optional(),
});

/** @deprecated Legacy only — do not use for new plans. */
export const inSceneInteractionIntentSchema = z.enum([
  "dialogue_progression",
  "object_trigger",
  "guided_discovery",
  "gated_progression",
  "present_only",
]);

/** @deprecated Legacy only — do not use for new plans. */
export type InSceneInteractionIntent = z.infer<
  typeof inSceneInteractionIntentSchema
>;

/**
 * Beat-level completion gate only.
 * `visit_all_pages` belongs here (beat / page pass_rule) — **never** inside phase orchestration.
 * @deprecated Do not add this to `storyPhaseBlueprintSchema`; use `phaseTriggerSchema` + `phaseCompletionEffectSchema`.
 */
export const beatCompletionRuleSchema = z.enum([
  "visit_all_pages",
  "on_click_item",
  "all_matched",
  "present_only",
  "end",
]);

export type BeatCompletionRule = z.infer<typeof beatCompletionRuleSchema>;

/** @deprecated Kept only so old lesson_plan_meta rows can round-trip. Use the new phase blueprint fields. */
export const legacyPhaseCompletionRuleSchema = beatCompletionRuleSchema;
export type LegacyPhaseCompletionRule = BeatCompletionRule;

// ---------------------------------------------------------------------------
// Story Orchestration Blueprint — v1 phase contract
// ---------------------------------------------------------------------------

/**
 * What the learner (or the system) must do to complete this phase.
 * Minimal v1 set — do not expand before the compiler is built.
 *
 * `auto_present`     — intro / no learner action required; advances on enter or delay.
 * `on_click_item`    — learner taps a specific semantic item (target_item_id required).
 * `all_matched`      — all drag/hotspot targets reached; compiler maps to runtime all_matched.
 * `sequence_complete`— an ordered click/action sequence completes (sequence_id required).
 * `end_phase`        — terminal step; no further learner gate; phase closes on enter.
 *
 * Deferred (add in a later revision only): hotspot_unlock, dialogue_complete.
 */
export const phaseTriggerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("auto_present") }),
  z.object({
    type: z.literal("on_click_item"),
    /** Stable semantic slug (e.g. "school_shirt"). Never an opaque id like "item_47". */
    target_item_id: z.string().min(1).max(80),
  }),
  z.object({ type: z.literal("all_matched") }),
  z.object({
    type: z.literal("sequence_complete"),
    /** Stable semantic slug for the sequence (e.g. "collect_clothes_seq"). */
    sequence_id: z.string().min(1).max(80),
  }),
  z.object({ type: z.literal("end_phase") }),
]);

export type PhaseTrigger = z.infer<typeof phaseTriggerSchema>;

/**
 * What happens to learning progression when this phase's trigger fires.
 *
 * Progression and UI are **separate**:
 * - Use `unlock_next_page` for page advancement.
 * - Set `show_continue_arrow: true` on `unlock_next_page` when the book/slide UI
 *   should reveal the continue control. This is a presentation flag, not its own
 *   completion type — keeping progression logic and UI affordance separate.
 */
export const phaseCompletionEffectSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("end_phase") }),
  z.object({ type: z.literal("unlock_next_phase") }),
  z.object({
    type: z.literal("unlock_next_page"),
    /** When true, the continue/next-page control becomes visible in the player UI. */
    show_continue_arrow: z.boolean().optional().default(false),
  }),
]);

export type PhaseCompletionEffect = z.infer<typeof phaseCompletionEffectSchema>;

/**
 * Dialogue hint attached to a phase response slot.
 * `dialogue` is the character line text.
 * `expression_hint` is an optional authoring note (not a runtime preset).
 */
const phaseResponseSchema = z.object({
  dialogue: z.string().max(1000).optional(),
  expression_hint: z.string().max(200).optional(),
});

export type PhaseResponse = z.infer<typeof phaseResponseSchema>;

/**
 * Rich per-phase orchestration contract (v1).
 *
 * Replaces the coarse `interaction_intents + completion_rule` shape.
 * Legacy fields are preserved separately for backward-compatible parsing.
 *
 * phase_id    — unique within the page; use stable semantic slugs.
 * purpose     — plain-language description of the phase's role.
 * trigger     — what the learner (or system) does to complete the phase.
 * success_response — dialogue/expression after the correct action.
 * failure_response — dialogue for wrong action; maps to runtime dialogue.error.
 * completion  — learning progression effect when the trigger fires.
 */
const storyPhaseBlueprintSchema = z.object({
  phase_id: z.string().min(1).max(80),
  purpose: z.string().min(1).max(500),
  scene_progression: z.string().max(1000).optional(),
  /** @deprecated Legacy: free-text character dialogue. Prefer success_response.dialogue. */
  character_dialogue: z.string().max(1000).optional(),
  trigger: phaseTriggerSchema.optional(),
  success_response: phaseResponseSchema.optional(),
  /** Shown on wrong action; maps to runtime dialogue.error. */
  failure_response: phaseResponseSchema.optional(),
  completion: phaseCompletionEffectSchema.optional(),
  /** @deprecated Legacy: replaced by trigger + completion. Kept for old meta backward compat. */
  interaction_intents: z.array(inSceneInteractionIntentSchema).max(4).optional(),
  /** @deprecated Legacy: replaced by completion. Kept for old meta backward compat. Never use visit_all_pages at phase level. */
  completion_rule: z.enum(["on_click_item", "all_matched", "present_only", "end"]).optional(),
});

export type StoryPhaseBlueprint = z.infer<typeof storyPhaseBlueprintSchema>;

const storyPageNarrativeFunctionSchema = z.enum([
  "setup",
  "discovery",
  "learner_action",
  "consequence",
  "recap",
]);

const storyPageBlueprintSchema = z.object({
  page_id: z.string().min(1).max(80),
  page_goal: z.string().min(1).max(500),
  narrative_function: storyPageNarrativeFunctionSchema,
  scene_progression: z.string().max(1000).optional(),
  learner_action: z.string().max(500).optional(),
  unlock_condition: z.string().max(500).optional(),
  character_response: z.string().max(1000).optional(),
  next_page_trigger: z.string().max(500).optional(),
  phases: z.array(storyPhaseBlueprintSchema).max(8).optional(),
});

export type StoryPageBlueprint = z.infer<typeof storyPageBlueprintSchema>;

const beatReinforcementSchema = z.object({
  activity_type: storyFirstReinforcementSubtypeSchema,
  attached_to_beat_id: z.string().min(1),
  timing: z.literal("after_final_page_completion").default(
    "after_final_page_completion",
  ),
  pedagogical_purpose: z
    .enum([
      "recognition",
      "comprehension_check",
      "vocabulary_recall",
      "grammar_form_practice",
      "controlled_production",
      "error_correction",
    ])
    .optional(),
  reason_for_activity_choice: z.string().min(1).max(1000),
  required_prior_exposure: z
    .object({
      vocabulary_seen: z.array(z.string()).default([]),
      grammar_examples_seen: z.array(z.string()).default([]),
      story_context_required: z.string().max(1000).optional(),
    })
    .optional(),
  generator_brief: z
    .object({
      what_to_generate: z.string().max(1000),
      what_not_to_generate: z.string().max(1000).optional(),
      must_reference_story_context: z.boolean().default(true),
    })
    .optional(),
});

export type BeatReinforcement = z.infer<typeof beatReinforcementSchema>;

const storyBeatSchema = z.object({
  beat_id: z.string().min(1),
  beat_order: z.number().int().min(1),
  beat_title: z.string().max(160).optional(),
  narrative_function: z
    .enum([
      "opening_context",
      "vocabulary_exposure",
      "guided_discovery",
      "grammar_modeling",
      "recognition_check",
      "controlled_production",
      "correction_reinforcement",
      "story_resolution",
      "recap",
    ])
    .optional(),
  story_event: z.string().min(1).max(2000),
  learner_focus: z.string().max(1000).optional(),
  language_introduced: z.object({
    vocabulary: z.array(z.string()).default([]),
    phrases: z.array(z.string()).default([]),
    pronunciation_focus: z.array(z.string()).optional(),
  }),
  grammar_modeled: z.object({
    grammar_points: z.array(z.string()).default([]),
    model_sentences: z.array(z.string()).default([]),
    contextual_purpose: z.string().max(1000).optional(),
  }),
  pages: z.array(storyPageBlueprintSchema).max(10).optional(),
  beat_completion_rule: beatCompletionRuleSchema.optional(),
  reinforcement: beatReinforcementSchema.optional(),
  progression_logic: z.object({
    depends_on_previous_beat_id: z.string().optional(),
    learner_should_now_know: z.array(z.string()).default([]),
    transition_to_next_beat: z.string().max(1000).optional(),
    reason_next_beat_follows: z.string().max(1000).optional(),
  }),
});

export type StoryBeat = z.infer<typeof storyBeatSchema>;

export const storyFirstBlueprintSchema = z
  .object({
    lesson_metadata: z.object({
      lesson_title: z.string().min(1).max(200),
      unit_theme: z.string().max(200).optional(),
      estimated_duration_minutes: z.number().int().min(1).max(120).optional(),
      production_mode: z.literal("story_first").default("story_first"),
    }),
    cefr_level: cefrLevelSchema,
    target_age: targetAgeSchema,
    learner_profile: z.object({
      literacy_assumption: z.string().max(1000).optional(),
      attention_profile: z.string().max(1000).optional(),
      learner_context: z.string().max(1000).optional(),
    }),
    learning_goals: z.array(z.string().min(1).max(500)).min(1).max(12),
    vocabulary_targets: z.array(vocabularyTargetSchema).default([]),
    grammar_targets: z.array(grammarTargetSchema).default([]),
    story_pattern_type: storyPatternTypeSchema,
    story_arc: z.object({
      setup: z.string().min(1).max(1000),
      goal_or_problem: z.string().min(1).max(1000),
      rising_action: z.string().max(1000).optional(),
      discovery_moment: z.string().max(1000).optional(),
      resolution: z.string().min(1).max(1000),
      recap: z.string().min(1).max(1000),
    }),
    characters: z
      .array(
        z.object({
          character_id: z.string().min(1).max(80),
          name: z.string().min(1).max(120),
          role: z.string().max(120).optional(),
          language_function: z.string().max(500).optional(),
          appears_in_beat_ids: z.array(z.string()).default([]),
        }),
      )
      .default([]),
    ordered_story_beats: z.array(storyBeatSchema).min(2).max(12),
    wrap_up_recap: z.object({
      story_return_required: z.literal(true),
      recap_beat_id: z.string().min(1),
      recap_type: z
        .enum([
          "character_reflection",
          "story_resolution",
          "picture_walk",
          "then_now_review",
          "mission_complete",
        ])
        .optional(),
      vocabulary_recycled: z.array(z.string()).default([]),
      grammar_recycled: z.array(z.string()).default([]),
      final_success_moment: z.string().min(1).max(1000),
    }),
  })
  .superRefine((blueprint, ctx) => {
    const beatIds = new Set<string>();
    for (const beat of blueprint.ordered_story_beats) {
      if (beatIds.has(beat.beat_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ordered_story_beats"],
          message: `Duplicate story beat id: ${beat.beat_id}`,
        });
        return;
      }
      beatIds.add(beat.beat_id);
    }

    const sortedOrders = blueprint.ordered_story_beats
      .map((beat) => beat.beat_order)
      .sort((a, b) => a - b);
    for (let i = 0; i < sortedOrders.length; i += 1) {
      if (sortedOrders[i] !== i + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ordered_story_beats"],
          message: "Story beat orders must be contiguous starting at 1",
        });
        return;
      }
    }

    for (const beat of blueprint.ordered_story_beats) {
      const attached = beat.reinforcement?.attached_to_beat_id;
      if (attached && attached !== beat.beat_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ordered_story_beats", beat.beat_order - 1, "reinforcement"],
          message: `Reinforcement for beat ${beat.beat_id} must attach to the same beat_id`,
        });
        return;
      }
      const dependsOn = beat.progression_logic.depends_on_previous_beat_id;
      if (dependsOn && !beatIds.has(dependsOn)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ordered_story_beats", beat.beat_order - 1, "progression_logic"],
          message: `progression_logic references unknown beat_id: ${dependsOn}`,
        });
        return;
      }
      if (beat.reinforcement && beat.reinforcement.timing !== "after_final_page_completion") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ordered_story_beats", beat.beat_order - 1, "reinforcement", "timing"],
          message: "Reinforcement timing must be after_final_page_completion",
        });
        return;
      }
    }

    if (!beatIds.has(blueprint.wrap_up_recap.recap_beat_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["wrap_up_recap", "recap_beat_id"],
        message: "wrap_up_recap.recap_beat_id must reference an ordered story beat",
      });
      return;
    }

    const recapBeat = blueprint.ordered_story_beats.find(
      (beat) => beat.beat_id === blueprint.wrap_up_recap.recap_beat_id,
    );
    if (recapBeat && recapBeat.narrative_function !== "recap") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["wrap_up_recap", "recap_beat_id"],
        message: "Final recap must reference a story beat with narrative_function recap",
      });
    }

    const hasPageBlueprints = blueprint.ordered_story_beats.some(
      (beat) => (beat.pages?.length ?? 0) > 0,
    );
    if (!hasPageBlueprints) return;

    for (const beat of blueprint.ordered_story_beats) {
      const pages = beat.pages;
      if (!pages || pages.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ordered_story_beats", beat.beat_order - 1, "pages"],
          message: "Each story beat must define at least 3 pages",
        });
        return;
      }
      const firstFn = pages[0]?.narrative_function;
      if (firstFn !== "setup" && firstFn !== "discovery") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [
            "ordered_story_beats",
            beat.beat_order - 1,
            "pages",
            0,
            "narrative_function",
          ],
          message: "First page must use setup or discovery narrative_function",
        });
        return;
      }
      const lastIdx = pages.length - 1;
      const lastFn = pages[lastIdx]?.narrative_function;
      if (lastFn !== "consequence") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [
            "ordered_story_beats",
            beat.beat_order - 1,
            "pages",
            lastIdx,
            "narrative_function",
          ],
          message: "Final page must use consequence narrative_function",
        });
        return;
      }
    }

    if ((recapBeat?.pages?.length ?? 0) < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["wrap_up_recap", "recap_beat_id"],
        message: "Recap beat must define at least 3 pages",
      });
    }
  });

export type StoryFirstBlueprint = z.infer<typeof storyFirstBlueprintSchema>;

/** Stored JSON in `lessons.lesson_plan_meta` — tolerate legacy shapes. */
export const lessonPlanMetaStoredSchema = z
  .object({
    storyFirstBlueprint: z.unknown().optional(),
    storyBeatCount: z.number().int().min(1).max(12).optional(),
    quizGroups: z.array(quizGroupSchema).optional(),
    mediaSearchTerms: z.array(z.string()).optional(),
    screenOutline: z.array(screenOutlineRowSchema).max(40).optional(),
  })
  .passthrough()
  .refine(
    (d) =>
      d.storyFirstBlueprint != null ||
      d.storyBeatCount != null ||
      (Array.isArray(d.quizGroups) && d.quizGroups.length > 0) ||
      (Array.isArray(d.screenOutline) && d.screenOutline.length > 0) ||
      (Array.isArray(d.mediaSearchTerms) && d.mediaSearchTerms.length > 0),
    { message: "lesson_plan_meta is empty" },
  );

export type AiLessonPlan = {
  storyFirstBlueprint?: StoryFirstBlueprint;
  storyBeatCount: number;
  quizGroups: { title: string; questionCount: number }[];
  mediaSearchTerms: string[];
  screenOutline?: ScreenOutlineRow[];
};

export function normalizeAiLessonPlan(parsed: unknown): AiLessonPlan {
  const o = parsed as Record<string, unknown>;
  const storyFirstBlueprint =
    o.storyFirstBlueprint ?
      storyFirstBlueprintSchema.safeParse(o.storyFirstBlueprint)
    : null;
  const rawBeats = Number(o.storyBeatCount);
  let storyBeatCount = Number.isFinite(rawBeats) ?
      Math.min(12, Math.max(2, Math.round(rawBeats)))
    : 3;

  const groupsIn: unknown[] = Array.isArray(o.quizGroups) ? o.quizGroups : [];
  const quizGroups: { title: string; questionCount: number }[] = [];
  for (const g of groupsIn) {
    if (!g || typeof g !== "object") continue;
    const gg = g as Record<string, unknown>;
    const title = String(gg.title ?? "Quiz").trim().slice(0, 120) || "Quiz";
    const qc = Math.min(8, Math.max(1, Math.round(Number(gg.questionCount) || 3)));
    quizGroups.push({ title, questionCount: qc });
  }

  const termsIn: unknown[] = Array.isArray(o.mediaSearchTerms) ? o.mediaSearchTerms : [];
  const mediaSearchTerms = termsIn
    .map((t) => (typeof t === "string" ? t.trim().slice(0, 64) : ""))
    .filter(Boolean)
    .slice(0, 12);

  let screenOutline: ScreenOutlineRow[] | undefined;
  const rawOutline = o.screenOutline;
  if (Array.isArray(rawOutline) && rawOutline.length > 0) {
    const rows: ScreenOutlineRow[] = [];
    for (const row of rawOutline) {
      const r = screenOutlineRowSchema.safeParse(row);
      if (r.success) rows.push(r.data);
    }
    if (rows.length > 0) screenOutline = rows;
  }

  if (screenOutline && screenOutline.length > 0) {
    const storyN = screenOutline.filter((r) => r.kind === "story").length;
    if (storyN > 0) {
      storyBeatCount = Math.min(12, Math.max(1, storyN));
    }
    const derived = quizGroupsFromScreenOutline(screenOutline);
    if (derived.length > 0) {
      return {
        storyFirstBlueprint: storyFirstBlueprint?.success ? storyFirstBlueprint.data : undefined,
        storyBeatCount,
        quizGroups: derived,
        mediaSearchTerms,
        screenOutline,
      };
    }
  }

  if (quizGroups.length === 0) {
    quizGroups.push({ title: "Quick check", questionCount: 3 });
  }

  return {
    storyFirstBlueprint: storyFirstBlueprint?.success ? storyFirstBlueprint.data : undefined,
    storyBeatCount,
    quizGroups,
    mediaSearchTerms,
    screenOutline,
  };
}

function quizGroupsFromScreenOutline(
  outline: ScreenOutlineRow[],
): { title: string; questionCount: number }[] {
  const specs: { title: string; questionCount: number }[] = [];
  let currentTitle: string | null = null;
  let count = 0;
  const flush = () => {
    if (currentTitle !== null && count > 0) {
      specs.push({ title: currentTitle, questionCount: count });
      currentTitle = null;
      count = 0;
    }
  };
  for (const row of outline) {
    if (row.kind === "interaction") {
      const t = row.quiz_group_title?.trim() || "Quick check";
      if (currentTitle === t) {
        count += 1;
      } else {
        flush();
        currentTitle = t;
        count = 1;
      }
    } else {
      flush();
    }
  }
  flush();
  return specs;
}

/** Prefer validated DB meta; returns null if missing or invalid. */
export function safeParseStoredLessonPlanMeta(raw: unknown): AiLessonPlan | null {
  if (raw == null || typeof raw !== "object") return null;
  const parsed = lessonPlanMetaStoredSchema.safeParse(raw);
  if (!parsed.success) return null;
  return normalizeAiLessonPlan(parsed.data);
}

export function storyScreenCountFromPlan(plan: AiLessonPlan): number {
  if (plan.screenOutline?.length) {
    const n = plan.screenOutline.filter((r) => r.kind === "story").length;
    if (n > 0) return Math.min(12, Math.max(1, n));
  }
  return plan.storyBeatCount;
}

export function quizGroupsForSpecs(plan: AiLessonPlan): { title: string; questionCount: number }[] {
  if (plan.screenOutline?.length) {
    const derived = quizGroupsFromScreenOutline(plan.screenOutline);
    if (derived.length > 0) return derived;
  }
  return plan.quizGroups;
}

/** Inline goal labels for prompts/markdown; indices are 0-based into `learningGoals`. */
export function goalRefsLine(learningGoals: string[], indices: number[] | undefined): string {
  if (!indices?.length) return "";
  const parts = indices.map((i) => {
    const t = learningGoals[i]?.trim();
    const label = t ? (t.length > 56 ? `${t.slice(0, 56)}…` : t) : `(index ${i})`;
    return `[goal ${i}] ${label}`;
  });
  return `Goals: ${parts.join("; ")}`;
}

/** Multi-line block for materialization prompt (story step). */
export function formatStoryOutlineForMaterialization(
  row: ScreenOutlineRow & { kind: "story" },
  learningGoals: string[],
): string {
  const lines: string[] = [];
  if (row.summary) lines.push(`Beat: ${row.summary}`);
  const beatGoals = goalRefsLine(learningGoals, row.learning_goal_indices);
  if (beatGoals) lines.push(beatGoals);
  if (row.layout_mode) lines.push(`layout_mode: ${row.layout_mode}`);
  if (row.pages?.length) {
    row.pages.forEach((p, pi) => {
      const bits: string[] = [`Page ${pi + 1}: ${p.summary}`];
      if (p.interaction_mode) bits.push(`interaction_mode: ${p.interaction_mode}`);
      const pg = goalRefsLine(learningGoals, p.learning_goal_indices);
      if (pg) bits.push(pg);
      if (p.phases?.length) {
        bits.push(
          `phases: ${p.phases
            .map(
              (ph) =>
                `${ph.intent}${ph.transition ? ` (→${ph.transition})` : ""}${ph.animation_hint ? ` [anim: ${ph.animation_hint}]` : ""}`,
            )
            .join(" | ")}`,
        );
      }
      lines.push(bits.join(" | "));
    });
  }
  return lines.length > 0 ? lines.join("\n") : "(story — follow lesson plan narrative)";
}

export type InteractionSequenceRow = {
  quiz_group_id: string;
  quiz_group_title: string;
  quiz_group_order: number;
  subtype: string;
  summary: string;
};

/**
 * Map outline interaction rows to quiz_group UUIDs in playback order.
 * Consumes `specs` sequentially (matches `quizGroupsForSpecs` block order), so duplicate
 * group titles in separate blocks (e.g. two "Quick check" runs split by a story) resolve correctly.
 */
export function buildInteractionSequence(
  plan: AiLessonPlan,
  specs: { id: string; title: string; questionCount: number }[],
): InteractionSequenceRow[] | undefined {
  if (!plan.screenOutline?.length || specs.length === 0) return undefined;
  let specIdx = 0;
  const orderInSpec = new Map<string, number>();
  const out: InteractionSequenceRow[] = [];

  for (const row of plan.screenOutline) {
    if (row.kind !== "interaction") continue;
    if (specIdx >= specs.length) return undefined;
    const spec = specs[specIdx];
    const ord = orderInSpec.get(spec.id) ?? 0;
    if (ord >= spec.questionCount) return undefined;
    orderInSpec.set(spec.id, ord + 1);
    out.push({
      quiz_group_id: spec.id,
      quiz_group_title: spec.title,
      quiz_group_order: ord,
      subtype: row.subtype,
      summary: row.summary?.trim() ?? "",
    });
    if (ord + 1 >= spec.questionCount) {
      specIdx += 1;
    }
  }
  return out.length > 0 ? out : undefined;
}

export type MaterializationStep =
  | { kind: "story"; row: ScreenOutlineRow & { kind: "story" } }
  | {
      kind: "interaction";
      row: ScreenOutlineRow & { kind: "interaction" };
      slot: InteractionSequenceRow;
    };

/** Ordered steps matching lesson flow; null if outline missing or slot mismatch. */
export function buildMaterializationSteps(
  plan: AiLessonPlan,
  specs: { id: string; title: string; questionCount: number }[],
): MaterializationStep[] | null {
  if (!plan.screenOutline?.length) return null;
  const slots = buildInteractionSequence(plan, specs);
  if (!slots || slots.length === 0) return null;
  let si = 0;
  const out: MaterializationStep[] = [];
  for (const row of plan.screenOutline) {
    if (row.kind === "story") {
      out.push({ kind: "story", row });
    } else {
      const slot = slots[si];
      if (!slot) return null;
      si += 1;
      out.push({ kind: "interaction", row, slot });
    }
  }
  if (si !== slots.length) return null;
  return out;
}
