import { z } from "zod";

export const guideSchema = z
  .object({
    image_url: z.string().optional(),
    tip_text: z.string().optional(),
  })
  .optional();

export const startPayloadSchema = z.object({
  type: z.literal("start"),
  image_url: z.string().optional(),
  image_fit: z.enum(["cover", "contain"]).optional().default("cover"),
  cta_label: z.string().optional().default("Start learning"),
  /** Optional TTS line; player also offers lesson title read-aloud */
  read_aloud_title: z.string().optional(),
});

/** Story book: CSS-friendly animation presets (no arbitrary keyframes from JSON). */
export const storyAnimationPresetSchema = z.enum([
  "none",
  "fade_in",
  "fade_out",
  "slide_left",
  "slide_right",
  "slide_up",
  "slide_down",
  "grow",
  "shrink",
  "spin",
  "wobble",
]);

export type StoryAnimationPreset = z.infer<typeof storyAnimationPresetSchema>;

export const storyAnimationSpecSchema = z.object({
  preset: storyAnimationPresetSchema,
  duration_ms: z.number().min(0).max(120_000).default(500),
  delay_ms: z.number().min(0).max(120_000).optional(),
  easing: z.string().max(120).optional(),
  scale_percent: z.number().min(1).max(300).optional(),
  grow_scale_percent: z.number().min(1).max(300).optional(),
  shrink_scale_percent: z.number().min(1).max(300).optional(),
});

export type StoryAnimationSpec = z.infer<typeof storyAnimationSpecSchema>;

export const storyPathSchema = z.object({
  waypoints: z
    .array(
      z.object({
        x_percent: z.number(),
        y_percent: z.number(),
      }),
    )
    .min(2),
  duration_ms: z.number().min(0).max(120_000),
});

/** Actions that can run when a student taps an item (same semantics as timeline, without delay). */
export const storyClickActionSchema = z.object({
  trigger_id: z.string().optional(),
  action: z.enum(["emphasis", "move", "play_sound", "show_item", "hide_item"]),
  /**
   * - simultaneous: run on the current tap at the same time as other simultaneous actions
   * - after_previous: queue after earlier actions in this item's tap sequence
   * - next_click: run one-at-a-time on repeated taps of this same item
   */
  trigger_timing: z.enum(["simultaneous", "after_previous", "next_click"]).optional(),
  /** Item to animate or emphasize; omit to use the item that was tapped. */
  item_id: z.string().optional(),
  /** Optional override for emphasis action to run a specific preset. */
  emphasis_preset: z
    .enum(["grow", "shrink", "spin", "wobble", "fade_in", "fade_out"])
    .optional(),
  /** Optional per-trigger duration override (milliseconds). */
  duration_ms: z.number().min(0).max(120_000).optional(),
  /** For after_previous mode, run after this specific trigger id. */
  after_trigger_id: z.string().optional(),
  /** When true, this trigger runs only once per page view. */
  play_once: z.boolean().optional(),
  sound_url: z.string().optional(),
});

export type StoryClickAction = z.infer<typeof storyClickActionSchema>;

export const storySmartLineSchema = z.object({
  id: z.string(),
  text: z.string().optional(),
  sound_url: z.string().optional(),
  /** Lower value = higher priority. */
  priority: z.number().int(),
  /** Positive integer; omitted means unlimited. */
  max_plays: z.number().int().positive().optional(),
  /** Empty/omitted = available in any phase. */
  active_phase_ids: z.array(z.string()).optional(),
});

export type StorySmartLine = z.infer<typeof storySmartLineSchema>;

export const storyActionStepKindSchema = z.enum([
  "emphasis",
  "move",
  "show_item",
  "hide_item",
  "play_sound",
  "tts",
  "smart_line",
]);

export type StoryActionStepKind = z.infer<typeof storyActionStepKindSchema>;

export const storyActionStepSchema = z.object({
  id: z.string(),
  kind: storyActionStepKindSchema,
  /** Item to animate/affect; omitted defaults to sequence owner item for item-scoped click sequences. */
  target_item_id: z.string().optional(),
  /** Optional override for emphasis action. */
  emphasis_preset: z
    .enum(["grow", "shrink", "spin", "wobble", "fade_in", "fade_out"])
    .optional(),
  duration_ms: z.number().min(0).max(120_000).optional(),
  delay_ms: z.number().min(0).max(120_000).optional(),
  easing: z.string().max(120).optional(),
  scale_percent: z.number().min(1).max(300).optional(),
  grow_scale_percent: z.number().min(1).max(300).optional(),
  shrink_scale_percent: z.number().min(1).max(300).optional(),
  sound_url: z.string().optional(),
  tts_text: z.string().optional(),
  tts_lang: z.string().optional(),
  smart_line_lines: z.array(storySmartLineSchema).optional(),
  timing: z.enum(["simultaneous", "after_previous", "next_click"]).optional(),
  after_step_id: z.string().optional(),
  play_once: z.boolean().optional(),
});

export type StoryActionStep = z.infer<typeof storyActionStepSchema>;

export const storyActionSequenceEventSchema = z.enum([
  "click",
  "page_enter",
  "phase_enter",
]);

export type StoryActionSequenceEvent = z.infer<typeof storyActionSequenceEventSchema>;

export const storyActionSequenceSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  event: storyActionSequenceEventSchema,
  /** Empty/omitted = active across all phases for this scope. */
  active_phase_ids: z.array(z.string()).optional(),
  steps: z.array(storyActionStepSchema).default([]),
});

export type StoryActionSequence = z.infer<typeof storyActionSequenceSchema>;

export const storyIdleAnimationSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  preset: z.enum([
    "gentle_float",
    "pulse",
    "wobble_loop",
    "spin_loop",
    "breathe",
  ]),
  amplitude: z.number().min(0).max(1).optional(),
  period_ms: z.number().min(100).max(60_000).optional(),
  /** Empty/omitted = active across all phases for this scope. */
  active_phase_ids: z.array(z.string()).optional(),
});

export type StoryIdleAnimation = z.infer<typeof storyIdleAnimationSchema>;

export const storyPhaseDialogueSchema = z.object({
  start: z.string().optional(),
  success: z.string().optional(),
  error: z.string().optional(),
});

export type StoryPhaseDialogue = z.infer<typeof storyPhaseDialogueSchema>;

export const storyPhaseOnEnterStepSchema = z
  .object({
    action: z.enum(["show_item", "hide_item", "play_sound", "emphasis"]),
    item_id: z.string().optional(),
    item_ids: z.array(z.string()).optional(),
    sound_url: z.string().optional(),
    emphasis_preset: z
      .enum(["grow", "shrink", "spin", "wobble", "fade_in", "fade_out"])
      .optional(),
    duration_ms: z.number().min(0).max(120_000).optional(),
  })
  .superRefine((step, ctx) => {
    // play_sound may omit sound_url while authoring; runtime is a no-op; checklist warns.
    if (
      (step.action === "show_item" || step.action === "hide_item") &&
      !step.item_id &&
      (!step.item_ids || step.item_ids.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "on_enter show/hide needs item_id or item_ids",
      });
    }
    if (step.action === "emphasis" && !step.item_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "on_enter emphasis needs item_id",
      });
    }
  });

export type StoryPhaseOnEnterStep = z.infer<typeof storyPhaseOnEnterStepSchema>;

export const storyPhaseCompletionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("on_click"),
    target_item_id: z.string(),
    next_phase_id: z.string(),
  }),
  z.object({
    type: z.literal("auto"),
    delay_ms: z.number().min(0).max(120_000),
    next_phase_id: z.string(),
  }),
  z.object({
    type: z.literal("all_matched"),
    next_phase_id: z.string(),
  }),
  z.object({
    type: z.literal("sequence_complete"),
    /** Matches `StoryActionSequence.id` for an item `click` sequence (or legacy `legacy:item:{itemId}:triggers`). */
    sequence_id: z.string(),
    next_phase_id: z.string(),
  }),
  z.object({ type: z.literal("end_phase") }),
]);

export type StoryPhaseCompletion = z.infer<typeof storyPhaseCompletionSchema>;

export const storyPhaseInteractionKindSchema = z.enum([
  "none",
  "click_to_advance",
  "legacy",
  "drag_match",
]);

export type StoryPhaseInteractionKind = z.infer<
  typeof storyPhaseInteractionKindSchema
>;

/** In-scene drag: draggable and target are story items; `correct_map` is draggable_id → target_id. */
export const storyAfterCorrectMatchSchema = z.enum([
  "hide",
  "return_home",
  "stick_on_target",
]);

export const storyPhaseDragMatchSchema = z.object({
  draggable_item_ids: z.array(z.string()).min(1),
  target_item_ids: z.array(z.string()).min(1),
  correct_map: z.record(z.string(), z.string()),
  /** How each draggable looks after a correct drop (default matches older saves). */
  after_correct_match: storyAfterCorrectMatchSchema.optional().default("return_home"),
});

export type StoryPhaseDragMatch = z.infer<typeof storyPhaseDragMatchSchema>;

/**
 * Author-defined step within a story page: visibility + optional tap-to-advance to next phase.
 * When `phases` is absent/empty, runtime uses classic single-flow behavior.
 * Prefer `completion` for transitions; `advance_on_item_tap_id` + `next_phase_id` remain for older saves.
 */
export const storyPagePhaseSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  /**
   * Exactly one phase per page with phases enabled should be `true` (validated in superRefine).
   */
  is_start: z.boolean().optional().default(false),
  /**
   * Next phase in the linear list (convenience / legacy). Prefer `completion` for when to transition.
   */
  next_phase_id: z.string().optional().nullable(),
  /**
   * If set, only these item ids are visible in this phase (whitelist). If unset, classic rules apply (show_on_start per item).
   */
  visible_item_ids: z.array(z.string()).optional(),
  /**
   * Legacy: when the student taps this item, advance to `next_phase_id` if set. Superseded by `completion` when present.
   */
  advance_on_item_tap_id: z.string().optional().nullable(),
  /**
   * How the phase engine interprets this step. Default at runtime: `click_to_advance` when unset (existing lessons).
   */
  kind: storyPhaseInteractionKindSchema.optional(),
  /** Run after base phase visibility is applied. */
  on_enter: z.array(storyPhaseOnEnterStepSchema).optional(),
  /** Unified action sequences (v2). */
  action_sequences: z.array(storyActionSequenceSchema).optional(),
  /** Idle/looping animations (v2). */
  idle_animations: z.array(storyIdleAnimationSchema).optional(),
  dialogue: storyPhaseDialogueSchema.optional(),
  /** Extra ring on these items in this phase (student view / preview). */
  highlight_item_ids: z.array(z.string()).optional(),
  /** When and how to move to the next phase (Phase 2). */
  completion: storyPhaseCompletionSchema.optional(),
  /** Pointer drag-and-drop targets when `kind` is `drag_match`. */
  drag_match: storyPhaseDragMatchSchema.optional(),
});

export type StoryPagePhase = z.infer<typeof storyPagePhaseSchema>;

export function getPhaseInteractionKind(
  phase: StoryPagePhase,
): StoryPhaseInteractionKind {
  if (phase.kind) return phase.kind;
  return "click_to_advance";
}

/**
 * Unified transition target for the phase (from `completion` or legacy `advance` + `next_phase_id`).
 */
export function getResolvedPhaseTransition(
  phase: StoryPagePhase,
):
  | { type: "on_click"; target_item_id: string; next_phase_id: string }
  | { type: "auto"; delay_ms: number; next_phase_id: string }
  | { type: "all_matched"; next_phase_id: string }
  | { type: "sequence_complete"; sequence_id: string; next_phase_id: string }
  | { type: "end_phase" }
  | null {
  if (phase.completion) {
    if (phase.completion.type === "on_click") {
      // Top-level `next_phase_id` (linear “next in sequence” in the editor) is
      // canonical; `completion.next_phase_id` can lag if only one field was patched.
      const next = phase.next_phase_id ?? phase.completion.next_phase_id;
      if (!next) return { type: "end_phase" };
      return {
        type: "on_click",
        target_item_id: phase.completion.target_item_id,
        next_phase_id: next,
      };
    }
    if (phase.completion.type === "auto") {
      const next = phase.next_phase_id ?? phase.completion.next_phase_id;
      if (!next) return { type: "end_phase" };
      return {
        type: "auto",
        delay_ms: phase.completion.delay_ms,
        next_phase_id: next,
      };
    }
    if (phase.completion.type === "all_matched") {
      const next = phase.next_phase_id ?? phase.completion.next_phase_id;
      if (!next) return { type: "end_phase" };
      return { type: "all_matched", next_phase_id: next };
    }
    if (phase.completion.type === "sequence_complete") {
      const next = phase.next_phase_id ?? phase.completion.next_phase_id;
      if (!next) return { type: "end_phase" };
      return {
        type: "sequence_complete",
        sequence_id: phase.completion.sequence_id,
        next_phase_id: next,
      };
    }
    if (
      phase.completion.type === "end_phase" &&
      phase.advance_on_item_tap_id &&
      phase.next_phase_id
    ) {
      return {
        type: "on_click",
        target_item_id: phase.advance_on_item_tap_id,
        next_phase_id: phase.next_phase_id,
      };
    }
    return { type: "end_phase" };
  }
  if (phase.advance_on_item_tap_id && phase.next_phase_id) {
    return {
      type: "on_click",
      target_item_id: phase.advance_on_item_tap_id,
      next_phase_id: phase.next_phase_id,
    };
  }
  return null;
}

/**
 * Map one on_enter step to one or more runtime tap/timeline actions (item ids for show/hide may fan out).
 */
export function getOnEnterRuntimeActions(
  step: StoryPhaseOnEnterStep,
): Array<{
  action: "show_item" | "hide_item" | "play_sound" | "emphasis";
  item_id?: string;
  sound_url?: string;
  emphasis_preset?: NonNullable<StoryClickAction["emphasis_preset"]>;
  duration_ms?: number;
}> {
  if (step.action === "show_item" || step.action === "hide_item") {
    const ids =
      step.item_ids && step.item_ids.length > 0 ? step.item_ids
      : step.item_id ? [step.item_id]
      : [];
    return ids.map((item_id) => ({ action: step.action, item_id }));
  }
  if (step.action === "play_sound") {
    return [
      {
        action: "play_sound",
        item_id: step.item_id,
        sound_url: step.sound_url,
      },
    ];
  }
  return [
    {
      action: "emphasis",
      item_id: step.item_id!,
      emphasis_preset: step.emphasis_preset,
      duration_ms: step.duration_ms,
    },
  ];
}

export const storyTapSpeechEntrySchema = z
  .object({
    id: z.string(),
    /** Empty/omitted = default entry available in any phase. */
    phase_ids: z.array(z.string()).optional(),
    /** Lower value = higher priority. */
    priority: z.number().int(),
    text: z.string().optional(),
    sound_url: z.string().optional(),
    /** Positive integer; omitted means unlimited. */
    max_plays: z.number().int().positive().optional(),
  });

export type StoryTapSpeechEntry = z.infer<typeof storyTapSpeechEntrySchema>;


export const storyItemSchema = z
  .object({
    id: z.string(),
    /** Teacher-facing name (e.g. “ball”) for labels and editor lists. */
    name: z.string().optional(),
    kind: z.enum(["image", "text"]).optional().default("image"),
    image_url: z.string().optional(),
    text: z.string().optional(),
    text_color: z.string().optional(),
    text_size_px: z.number().min(10).max(128).optional(),
    x_percent: z.number(),
    y_percent: z.number(),
    w_percent: z.number(),
    h_percent: z.number(),
    /** Optional visual card around item image in student view (default: on). */
    show_card: z.boolean().optional().default(true),
    /** Show this item when page starts; if false, can be revealed by triggers. */
    show_on_start: z.boolean().optional().default(true),
    /** Simple, stable image scale multiplier inside the item box. */
    image_scale: z.number().min(0.25).max(8).default(1),
    z_index: z.number().int().default(0),
    enter: storyAnimationSpecSchema.optional(),
    exit: storyAnimationSpecSchema.optional(),
    emphasis: storyAnimationSpecSchema.optional(),
    path: storyPathSchema.optional(),
    /** @deprecated Legacy single tap text; prefer `tap_speeches`. */
    request_line: z.string().optional(),
    /** Phase-aware tap speech entries. */
    tap_speeches: z.array(storyTapSpeechEntrySchema).optional(),
    /** Unified action sequences (v2). */
    action_sequences: z.array(storyActionSequenceSchema).optional(),
    /** Idle/looping animations (v2). */
    idle_animations: z.array(storyIdleAnimationSchema).optional(),
    on_click: z
      .object({
        /** @deprecated Legacy single tap sound; prefer `tap_speeches[].sound_url`. */
        sound_url: z.string().optional(),
        /** When true, play item emphasis preset on tap */
        run_emphasis: z.boolean().optional(),
        /** Extra actions when tapped (after optional tap sound / run_emphasis). */
        triggers: z.array(storyClickActionSchema).optional(),
      })
      .optional(),
  })
  .superRefine((item, ctx) => {
    const kind = item.kind ?? "image";
    if (kind === "image" && !item.image_url?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Story item ${item.id} is image kind but missing image_url`,
      });
    }
    if (kind === "text" && !item.text?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Story item ${item.id} is text kind but missing text`,
      });
    }
  });
export type StoryItem = z.infer<typeof storyItemSchema>;

export const storyTimelineActionSchema = z.enum([
  "enter",
  "exit",
  "play_sound",
  "move",
  "emphasis",
]);

export const storyTimelineStepSchema = z.object({
  delay_ms: z.number().min(0).max(120_000),
  action: storyTimelineActionSchema,
  item_id: z.string().optional(),
  sound_url: z.string().optional(),
});

export type StoryTimelineStep = z.infer<typeof storyTimelineStepSchema>;

export const storyPageSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    background_image_url: z.string().optional(),
    image_fit: z.enum(["cover", "contain"]).optional(),
    background_crop: z
      .object({
        x_percent: z.number().min(-100).max(100).default(0),
        y_percent: z.number().min(-100).max(100).default(0),
        zoom_percent: z.number().min(50).max(300).default(100),
      })
      .optional(),
    background_color: z.string().optional(),
    video_url: z.string().optional(),
    body_text: z.string().optional(),
    read_aloud_text: z.string().optional(),
    auto_play_page_text: z.boolean().optional(),
    page_audio_url: z.string().optional(),
    items: z.array(storyItemSchema).default([]),
    /** Unified action sequences (v2). */
    action_sequences: z.array(storyActionSequenceSchema).optional(),
    /** Idle/looping animations (v2). */
    idle_animations: z.array(storyIdleAnimationSchema).optional(),
    auto_play: z.boolean().optional(),
    timeline: z.array(storyTimelineStepSchema).optional(),
    /** Step-by-step interaction phases (optional; legacy pages omit). */
    phases: z.array(storyPagePhaseSchema).optional(),
  })
  .superRefine((page, ctx) => {
    const ids = new Set<string>();
    for (const it of page.items) {
      if (ids.has(it.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate story item id on page: ${it.id}`,
        });
        return;
      }
      ids.add(it.id);
    }
    const validateActionAndIdleRefs = (
      sourceLabel: string,
      sequences: StoryActionSequence[] | undefined,
      idleAnimations: StoryIdleAnimation[] | undefined,
      phaseIds: Set<string> | null,
    ) => {
      for (const seq of sequences ?? []) {
        if (phaseIds) {
          for (const phaseId of seq.active_phase_ids ?? []) {
            if (!phaseIds.has(phaseId)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${sourceLabel} action sequence references unknown phase_id: ${phaseId}`,
              });
              return false;
            }
          }
        }
        for (const step of seq.steps ?? []) {
          if (step.target_item_id && !ids.has(step.target_item_id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${sourceLabel} action sequence references unknown item_id: ${step.target_item_id}`,
            });
            return false;
          }
          for (const line of step.smart_line_lines ?? []) {
            if (!phaseIds) continue;
            for (const phaseId of line.active_phase_ids ?? []) {
              if (!phaseIds.has(phaseId)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `${sourceLabel} smart_line references unknown phase_id: ${phaseId}`,
                });
                return false;
              }
            }
          }
        }
      }
      for (const idle of idleAnimations ?? []) {
        if (!phaseIds) continue;
        for (const phaseId of idle.active_phase_ids ?? []) {
          if (!phaseIds.has(phaseId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${sourceLabel} idle animation references unknown phase_id: ${phaseId}`,
            });
            return false;
          }
        }
      }
      return true;
    };
    const phases = page.phases;
    if (!validateActionAndIdleRefs("Page", page.action_sequences, page.idle_animations, null)) {
      return;
    }
    if (phases && phases.length > 0) {
      const phaseIds = new Set<string>();
      for (const ph of phases) {
        if (phaseIds.has(ph.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate story phase id on page: ${ph.id}`,
          });
          return;
        }
        phaseIds.add(ph.id);
      }
      if (
        !validateActionAndIdleRefs("Page", page.action_sequences, page.idle_animations, phaseIds)
      ) {
        return;
      }
      const starts = phases.filter((p) => p.is_start);
      if (starts.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Story page phases: exactly one phase must have is_start: true",
        });
        return;
      }
      for (const ph of phases) {
        if (
          !validateActionAndIdleRefs(
            `Phase ${ph.id}`,
            ph.action_sequences,
            ph.idle_animations,
            phaseIds,
          )
        ) {
          return;
        }
        if (ph.next_phase_id && !phaseIds.has(ph.next_phase_id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `next_phase_id references unknown phase: ${ph.next_phase_id}`,
          });
          return;
        }
        for (const vid of ph.visible_item_ids ?? []) {
          if (!ids.has(vid)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `visible_item_ids references unknown item_id: ${vid}`,
            });
            return;
          }
        }
        if (ph.advance_on_item_tap_id && !ids.has(ph.advance_on_item_tap_id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `advance_on_item_tap_id references unknown item_id: ${ph.advance_on_item_tap_id}`,
          });
          return;
        }
        for (const hid of ph.highlight_item_ids ?? []) {
          if (!ids.has(hid)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `highlight_item_ids references unknown item_id: ${hid}`,
            });
            return;
          }
        }
        for (const row of ph.on_enter ?? []) {
          const checkId = (iid: string) => {
            if (!ids.has(iid)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `on_enter references unknown item_id: ${iid}`,
              });
              return false;
            }
            return true;
          };
          if (row.item_id && !checkId(row.item_id)) return;
          for (const iid of row.item_ids ?? []) {
            if (!checkId(iid)) return;
          }
        }
        if (ph.completion) {
          if (
            (ph.completion.type === "on_click" ||
              ph.completion.type === "auto" ||
              ph.completion.type === "all_matched" ||
              ph.completion.type === "sequence_complete") &&
            !phaseIds.has(ph.completion.next_phase_id)
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `completion references unknown next_phase_id: ${ph.completion.next_phase_id}`,
            });
            return;
          }
          if (ph.completion.type === "on_click" && !ids.has(ph.completion.target_item_id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `completion on_click references unknown item_id: ${ph.completion.target_item_id}`,
            });
            return;
          }
          if (ph.completion.type === "sequence_complete") {
            const sid = ph.completion.sequence_id;
            const seqOk = page.items.some((it) => {
              for (const seq of it.action_sequences ?? []) {
                if (seq.event === "click" && seq.id === sid) return true;
              }
              if (
                sid === `legacy:item:${it.id}:triggers` &&
                (it.on_click?.triggers?.length ?? 0) > 0
              ) {
                return true;
              }
              return false;
            });
            if (!seqOk) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `completion sequence_complete references unknown sequence_id: ${sid}`,
              });
              return;
            }
          }
        }
        if (ph.kind === "drag_match") {
          if (!ph.drag_match) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "kind drag_match requires drag_match with draggable_item_ids, target_item_ids, and correct_map",
            });
            return;
          }
          const dm = ph.drag_match;
          const dragSet = new Set(dm.draggable_item_ids);
          const targetSet = new Set(dm.target_item_ids);
          for (const did of dm.draggable_item_ids) {
            if (!ids.has(did)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `drag_match references unknown draggable item_id: ${did}`,
              });
              return;
            }
          }
          for (const tid of dm.target_item_ids) {
            if (!ids.has(tid)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `drag_match references unknown target item_id: ${tid}`,
              });
              return;
            }
          }
          const mapKeys = new Set(Object.keys(dm.correct_map));
          if (mapKeys.size !== dragSet.size) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "drag_match.correct_map must have exactly one entry per draggable",
            });
            return;
          }
          for (const k of mapKeys) {
            if (!dragSet.has(k)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `drag_match.correct_map key not in draggable_item_ids: ${k}`,
              });
              return;
            }
            const v = dm.correct_map[k]!;
            if (!targetSet.has(v) || !ids.has(v)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `drag_match.correct_map target invalid for key ${k}`,
              });
              return;
            }
          }
          if (
            ph.completion &&
            ph.completion.type !== "all_matched" &&
            ph.completion.type !== "end_phase"
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "drag_match phases should use completion all_matched or end_phase",
            });
            return;
          }
        }
      }
      for (const it of page.items) {
        if (
          !validateActionAndIdleRefs(
            `Item ${it.id}`,
            it.action_sequences,
            it.idle_animations,
            phaseIds,
          )
        ) {
          return;
        }
        for (const entry of it.tap_speeches ?? []) {
          for (const phaseId of entry.phase_ids ?? []) {
            if (!phaseIds.has(phaseId)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `tap_speeches references unknown phase_id: ${phaseId} (item ${it.id})`,
              });
              return;
            }
          }
        }
      }
    }
    for (const step of page.timeline ?? []) {
      if (
        step.item_id &&
        step.action !== "play_sound" &&
        !ids.has(step.item_id)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Timeline references unknown item_id: ${step.item_id}`,
        });
        return;
      }
    }
    for (const it of page.items) {
      for (const tr of it.on_click?.triggers ?? []) {
        if (tr.action === "play_sound" && !tr.sound_url?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Tap trigger play_sound needs sound_url (item ${it.id})`,
          });
          return;
        }
        if (
          tr.item_id &&
          (tr.action === "emphasis" ||
            tr.action === "move" ||
            tr.action === "show_item" ||
            tr.action === "hide_item") &&
          !ids.has(tr.item_id)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Tap trigger references unknown item_id: ${tr.item_id}`,
          });
          return;
        }
      }
    }
    for (const it of page.items) {
      if (it.path) {
        for (const w of it.path.waypoints) {
          if (
            w.x_percent < -5 ||
            w.x_percent > 105 ||
            w.y_percent < -5 ||
            w.y_percent > 105
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Path waypoint out of bounds for item ${it.id}`,
            });
            return;
          }
        }
      }
    }
  });

export type StoryPage = z.infer<typeof storyPageSchema>;

export const storyPayloadSchema = z.object({
  type: z.literal("story"),
  /** Optional schema marker for new sequence/idle fields. */
  payload_version: z.literal(2).optional(),
  image_url: z.string().optional(),
  image_fit: z.enum(["cover", "contain"]).optional(),
  /** Shown when set; otherwise story image is used if present */
  video_url: z.string().optional(),
  body_text: z.string(),
  read_aloud_text: z.string().optional(),
  tts_lang: z.string().optional(),
  guide: guideSchema,
  /** Multi-page book; when absent or empty, legacy single-page fields above apply */
  pages: z.array(storyPageSchema).optional(),
  page_turn_style: z.enum(["slide", "curl"]).optional(),
});

export type StoryPayload = z.infer<typeof storyPayloadSchema>;

/** Default phase id when a page has no `phases` in JSON (synthetic, not stored). */
export const LEGACY_STORY_PHASE_ID = "__legacy";
const defaultLegacyPhase: StoryPagePhase = {
  id: LEGACY_STORY_PHASE_ID,
  name: "Scene",
  is_start: true,
  next_phase_id: null,
  visible_item_ids: undefined,
  advance_on_item_tap_id: null,
};

/** Phases in payload order; includes one synthetic entry when page has no explicit phases. */
export function getNormalizedPhasesForPage(
  page: { phases?: StoryPagePhase[] | null },
): { phases: StoryPagePhase[]; isExplicit: boolean } {
  const raw = page.phases;
  if (raw && raw.length > 0) {
    return { phases: raw, isExplicit: true };
  }
  return { phases: [defaultLegacyPhase], isExplicit: false };
}

/** Returns id of the start phase, or the synthetic legacy id. */
export function getStoryStartPhaseId(
  page: { phases?: StoryPagePhase[] | null },
): string {
  const { phases } = getNormalizedPhasesForPage(page);
  const start = phases.find((p) => p.is_start) ?? phases[0];
  return start?.id ?? LEGACY_STORY_PHASE_ID;
}

/** `page` is from `getNormalizedStoryPages` (always has at least one `phases` entry). */
export function getStartPhaseIdFromNormalizedPage(page: {
  phases: StoryPagePhase[];
}): string {
  const start = page.phases.find((p) => p.is_start) ?? page.phases[0];
  return start?.id ?? LEGACY_STORY_PHASE_ID;
}

/**
 * Whitelist of visible item ids for a phase, or `null` = use show_on_start per item (classic).
 */
export function getPhaseVisibleItemWhitelist(
  phase: StoryPagePhase,
): string[] | null {
  if (phase.visible_item_ids == null) return null;
  return phase.visible_item_ids;
}

/** Runtime page shape after merging legacy + defaults */
export type NormalizedStoryPage = {
  id: string;
  title?: string;
  background_image_url?: string;
  image_fit: "cover" | "contain";
  background_crop?: {
    x_percent: number;
    y_percent: number;
    zoom_percent: number;
  };
  background_color?: string;
  video_url?: string;
  body_text: string;
  read_aloud_text: string;
  auto_play_page_text: boolean;
  page_audio_url?: string;
  items: StoryItem[];
  action_sequences: StoryActionSequence[];
  idle_animations: StoryIdleAnimation[];
  auto_play: boolean;
  timeline: StoryTimelineStep[];
  /** From payload or a single legacy placeholder */
  phases: StoryPagePhase[];
  /** When false, player uses show_on_start only; phase switching UI is a no-op for progression */
  phasesExplicit: boolean;
};

/**
 * Legacy story screens have no `pages`; treat as one synthetic page so the player
 * always consumes a page list.
 */
export function getNormalizedStoryPages(payload: StoryPayload): NormalizedStoryPage[] {
  if (payload.pages && payload.pages.length > 0) {
    return payload.pages.map((p) => {
      const { phases, isExplicit } = getNormalizedPhasesForPage(p);
      return {
        id: p.id,
        title: p.title,
        background_image_url: p.background_image_url,
        image_fit: p.image_fit ?? payload.image_fit ?? "cover",
        background_crop: p.background_crop,
        background_color: p.background_color,
        video_url: p.video_url,
        body_text: (p.body_text ?? payload.body_text).trim() || payload.body_text,
        read_aloud_text:
          p.read_aloud_text ?? p.body_text ?? payload.read_aloud_text ?? payload.body_text,
        auto_play_page_text: p.auto_play_page_text ?? false,
        page_audio_url: p.page_audio_url,
        items: p.items.map((it) => ({ ...it, z_index: it.z_index ?? 0, image_scale: it.image_scale ?? 1 })),
        action_sequences: p.action_sequences ?? [],
        idle_animations: p.idle_animations ?? [],
        auto_play: p.auto_play ?? ((p.timeline?.length ?? 0) > 0),
        timeline: p.timeline ?? [],
        phases,
        phasesExplicit: isExplicit,
      };
    });
  }
  return [
    {
      id: "legacy",
      background_image_url: payload.image_url,
      image_fit: payload.image_fit ?? "cover",
      background_crop: undefined,
      video_url: payload.video_url,
      body_text: payload.body_text,
      read_aloud_text: payload.read_aloud_text ?? payload.body_text,
      auto_play_page_text: false,
      items: [],
      action_sequences: [],
      idle_animations: [],
      auto_play: false,
      timeline: [],
      phases: [defaultLegacyPhase],
      phasesExplicit: false,
    },
  ];
}

export function getStoryPageTurnStyle(payload: StoryPayload): "slide" | "curl" {
  return payload.page_turn_style ?? "curl";
}

function newEntityId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 11)}`;
}

/** Deep-copy story pages with new page and item ids so duplicate screens do not share ids. */
export function remapStoryPayloadIds(payload: StoryPayload): StoryPayload {
  if (!payload.pages?.length) return payload;
  return {
    ...payload,
    pages: payload.pages.map((page) => {
      const pageId = newEntityId();
      const idMap = new Map<string, string>();
      const items = page.items.map((it) => {
        const nid = newEntityId();
        idMap.set(it.id, nid);
        const oc = it.on_click;
        const on_click =
          oc ?
            {
              ...oc,
              ...(oc.triggers != null ?
                {
                  triggers: oc.triggers.map((tr) => ({
                    ...tr,
                    item_id:
                      tr.item_id && idMap.has(tr.item_id) ?
                        idMap.get(tr.item_id)
                      : tr.item_id,
                  })),
                }
              : {}),
            }
          : undefined;
        return { ...it, id: nid, on_click };
      });
      const timeline = page.timeline?.map((step) => ({
        ...step,
        item_id:
          step.item_id && idMap.has(step.item_id)
            ? idMap.get(step.item_id)
            : step.item_id,
      }));
      const phaseIdMap = new Map<string, string>();
      const nextPhases =
        page.phases?.map((ph) => {
          const nid = newEntityId();
          phaseIdMap.set(ph.id, nid);
          return { ...ph, id: nid };
        }) ?? undefined;
      const phases =
        nextPhases?.map((ph) => {
          const next = {
            ...ph,
            next_phase_id:
              ph.next_phase_id && phaseIdMap.has(ph.next_phase_id) ?
                phaseIdMap.get(ph.next_phase_id) ?? null
              : (ph.next_phase_id ?? null),
            visible_item_ids: ph.visible_item_ids?.map(
              (vid) => (idMap.has(vid) ? (idMap.get(vid) as string) : vid),
            ),
            advance_on_item_tap_id:
              ph.advance_on_item_tap_id && idMap.has(ph.advance_on_item_tap_id) ?
                idMap.get(ph.advance_on_item_tap_id)
              : ph.advance_on_item_tap_id,
            highlight_item_ids: ph.highlight_item_ids?.map(
              (hid) => (idMap.has(hid) ? (idMap.get(hid) as string) : hid),
            ),
            on_enter: ph.on_enter?.map((s) => ({
              ...s,
              item_id:
                s.item_id && idMap.has(s.item_id) ?
                  idMap.get(s.item_id)
                : s.item_id,
              item_ids: s.item_ids?.map(
                (i) => (idMap.has(i) ? (idMap.get(i) as string) : i),
              ),
            })),
            completion:
              !ph.completion ? undefined
              : ph.completion.type === "on_click" ?
                {
                  type: "on_click" as const,
                  target_item_id:
                    idMap.has(ph.completion.target_item_id) ?
                      (idMap.get(ph.completion.target_item_id) as string)
                    : ph.completion.target_item_id,
                  next_phase_id:
                    phaseIdMap.has(ph.completion.next_phase_id) ?
                      (phaseIdMap.get(ph.completion.next_phase_id) as string)
                    : ph.completion.next_phase_id,
                }
              : ph.completion.type === "auto" ?
                {
                  type: "auto" as const,
                  delay_ms: ph.completion.delay_ms,
                  next_phase_id:
                    phaseIdMap.has(ph.completion.next_phase_id) ?
                      (phaseIdMap.get(ph.completion.next_phase_id) as string)
                    : ph.completion.next_phase_id,
                }
              : ph.completion.type === "all_matched" ?
                {
                  type: "all_matched" as const,
                  next_phase_id:
                    phaseIdMap.has(ph.completion.next_phase_id) ?
                      (phaseIdMap.get(ph.completion.next_phase_id) as string)
                    : ph.completion.next_phase_id,
                }
              : ph.completion.type === "sequence_complete" ?
                {
                  type: "sequence_complete" as const,
                  sequence_id: ph.completion.sequence_id,
                  next_phase_id:
                    phaseIdMap.has(ph.completion.next_phase_id) ?
                      (phaseIdMap.get(ph.completion.next_phase_id) as string)
                    : ph.completion.next_phase_id,
                }
              : ph.completion,
            drag_match: ph.drag_match ? {
                draggable_item_ids: ph.drag_match.draggable_item_ids.map(
                  (i) => (idMap.has(i) ? (idMap.get(i) as string) : i),
                ),
                target_item_ids: ph.drag_match.target_item_ids.map(
                  (i) => (idMap.has(i) ? (idMap.get(i) as string) : i),
                ),
                correct_map: Object.fromEntries(
                  Object.entries(ph.drag_match.correct_map).map(
                    ([from, to]) => [
                      idMap.has(from) ? (idMap.get(from) as string) : from,
                      idMap.has(to) ? (idMap.get(to) as string) : to,
                    ],
                  ),
                ),
                after_correct_match: ph.drag_match.after_correct_match,
              } : undefined,
          };
          return next;
        }) ?? undefined;
      const remappedItems = items.map((it) => ({
        ...it,
        tap_speeches: it.tap_speeches?.map((entry) => ({
          ...entry,
          phase_ids: entry.phase_ids?.map((pid) =>
            phaseIdMap.has(pid) ? (phaseIdMap.get(pid) as string) : pid,
          ),
        })),
      }));
      return {
        ...page,
        id: pageId,
        items: remappedItems,
        timeline,
        phases,
      };
    }),
  };
}

const rectTargetSchema = z.object({
  id: z.string(),
  x_percent: z.number(),
  y_percent: z.number(),
  w_percent: z.number(),
  h_percent: z.number(),
  label: z.string().optional(),
});

const presentationElementKindSchema = z.enum([
  "image",
  "text",
  "shape",
  "line",
  "button",
]);

const presentationElementActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("info_popup"),
    title: z.string().optional(),
    body: z.string().optional(),
    image_url: z.string().optional(),
    video_url: z.string().optional(),
  }),
  z.object({
    type: z.literal("navigate_slide"),
    target: z.enum(["next", "prev", "slide_id"]),
    slide_id: z.string().optional(),
  }),
  z.object({
    type: z.literal("show_element"),
    element_id: z.string(),
  }),
  z.object({
    type: z.literal("hide_element"),
    element_id: z.string(),
  }),
  z.object({
    type: z.literal("toggle_element"),
    element_id: z.string(),
  }),
]);

const presentationElementSchema = z.object({
  id: z.string(),
  kind: presentationElementKindSchema,
  x_percent: z.number(),
  y_percent: z.number(),
  w_percent: z.number(),
  h_percent: z.number(),
  z_index: z.number().int().default(0),
  visible: z.boolean().optional().default(true),
  label: z.string().optional(),
  text: z.string().optional(),
  image_url: z.string().optional(),
  color_hex: z.string().optional(),
  line_width_px: z.number().min(1).max(24).optional(),
  // Draggable interaction modes for V1.
  draggable_mode: z.enum(["none", "free", "check_target"]).optional().default("none"),
  drop_target_id: z.string().optional(),
  actions: z.array(presentationElementActionSchema).optional(),
});

const presentationSlideSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  body_text: z.string().optional(),
  background_image_url: z.string().optional(),
  background_color: z.string().optional(),
  video_url: z.string().optional(),
  image_fit: z.enum(["cover", "contain"]).optional().default("cover"),
  elements: z.array(presentationElementSchema).default([]),
});

export const presentationInteractivePayloadSchema = z
  .object({
    type: z.literal("interaction"),
    subtype: z.literal("presentation_interactive"),
    title: z.string().optional(),
    body_text: z.string().optional(),
    slides: z.array(presentationSlideSchema).min(1),
    pass_rule: z.enum(["drag_targets_complete", "visit_all_slides"]).optional().default("drag_targets_complete"),
    guide: guideSchema,
  })
  .superRefine((data, ctx) => {
    const slideIds = new Set<string>();
    for (const slide of data.slides) {
      if (slideIds.has(slide.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate slide id: ${slide.id}`,
        });
        return;
      }
      slideIds.add(slide.id);
      const elementIds = new Set<string>();
      for (const el of slide.elements) {
        if (elementIds.has(el.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate element id on slide ${slide.id}: ${el.id}`,
          });
          return;
        }
        elementIds.add(el.id);
      }
      for (const el of slide.elements) {
        if (el.draggable_mode === "check_target") {
          if (!el.drop_target_id || !elementIds.has(el.drop_target_id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Element ${el.id} check_target requires valid drop_target_id on slide ${slide.id}`,
            });
            return;
          }
        }
        for (const action of el.actions ?? []) {
          if (
            (action.type === "show_element" ||
              action.type === "hide_element" ||
              action.type === "toggle_element") &&
            !elementIds.has(action.element_id)
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Action on ${el.id} references unknown element ${action.element_id} on slide ${slide.id}`,
            });
            return;
          }
          if (
            action.type === "navigate_slide" &&
            action.target === "slide_id" &&
            action.slide_id &&
            !slideIds.has(action.slide_id) &&
            !data.slides.some((s) => s.id === action.slide_id)
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `navigate_slide references unknown slide id ${action.slide_id}`,
            });
            return;
          }
        }
      }
    }
  });

export const mcQuizPayloadSchema = z.object({
  type: z.literal("interaction"),
  subtype: z.literal("mc_quiz"),
  image_url: z.string().optional(),
  image_fit: z.enum(["cover", "contain"]).optional().default("cover"),
  body_text: z.string().optional(),
  question: z.string(),
  options: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
    }),
  ),
  correct_option_id: z.string(),
  shuffle_options: z.boolean().optional().default(false),
  guide: guideSchema,
});

export const clickTargetsPayloadSchema = z
  .object({
    type: z.literal("interaction"),
    subtype: z.literal("click_targets"),
    image_url: z.string(),
    body_text: z.string(),
    targets: z.array(rectTargetSchema),
    /** Single-correct tap (legacy) */
    correct_target_id: z.string().optional(),
    /** Tap every listed target (any order); other targets are decoys */
    treasure_target_ids: z.array(z.string()).min(1).optional(),
    guide: guideSchema,
  })
  .superRefine((data, ctx) => {
    const hasTreasure = (data.treasure_target_ids?.length ?? 0) > 0;
    const hasSingle = !!data.correct_target_id;
    if (hasTreasure === hasSingle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: hasTreasure && hasSingle
          ? "Use only one of correct_target_id or treasure_target_ids"
          : "Provide correct_target_id or treasure_target_ids",
      });
      return;
    }
    const ids = new Set(data.targets.map((t) => t.id));
    if (hasSingle && data.correct_target_id && !ids.has(data.correct_target_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "correct_target_id must match a target id",
      });
    }
    if (hasTreasure && data.treasure_target_ids) {
      for (const id of data.treasure_target_ids) {
        if (!ids.has(id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `treasure_target_ids references unknown id ${id}`,
          });
          return;
        }
      }
    }
  });

export const dragSentencePayloadSchema = z.object({
  type: z.literal("interaction"),
  subtype: z.literal("drag_sentence"),
  image_url: z.string().optional(),
  body_text: z.string().optional(),
  sentence_slots: z.array(z.string()),
  word_bank: z.array(z.string()),
  correct_order: z.array(z.string()),
  guide: guideSchema,
});

export const trueFalsePayloadSchema = z.object({
  type: z.literal("interaction"),
  subtype: z.literal("true_false"),
  image_url: z.string().optional(),
  statement: z.string(),
  correct: z.boolean(),
  guide: guideSchema,
});

export const shortAnswerPayloadSchema = z.object({
  type: z.literal("interaction"),
  subtype: z.literal("short_answer"),
  image_url: z.string().optional(),
  prompt: z.string(),
  acceptable_answers: z.array(z.string()).min(1),
  case_insensitive: z.boolean().optional().default(true),
  normalize_whitespace: z.boolean().optional().default(true),
  guide: guideSchema,
});

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const fillBlanksPayloadSchema = z
  .object({
    type: z.literal("interaction"),
    subtype: z.literal("fill_blanks"),
    image_url: z.string().optional(),
    image_fit: z.enum(["cover", "contain"]).optional().default("cover"),
    image_size: z.enum(["small", "normal"]).optional().default("normal"),
    body_text: z.string().optional(),
    /** e.g. "Hello __1__" — placeholders __1__, __2__, ... */
    template: z.string(),
    blanks: z.array(
      z.object({
        id: z.string(),
        acceptable: z.array(z.string()).min(1),
      }),
    ),
    word_bank: z.array(z.string()).optional(),
    guide: guideSchema,
  })
  .superRefine((data, ctx) => {
    for (const b of data.blanks) {
      const re = new RegExp(`__${escapeRegExp(b.id)}__`, "g");
      if (!re.test(data.template)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Template must contain placeholder __${b.id}__ for each blank`,
        });
        return;
      }
    }
  });

export const fixTextPayloadSchema = z.object({
  type: z.literal("interaction"),
  subtype: z.literal("fix_text"),
  image_url: z.string().optional(),
  image_fit: z.enum(["cover", "contain"]).optional().default("cover"),
  body_text: z.string().optional(),
  broken_text: z.string(),
  acceptable: z.array(z.string()).min(1),
  case_insensitive: z.boolean().optional().default(true),
  normalize_whitespace: z.boolean().optional().default(true),
  /** When true, students see a Hint control (spotlight + 3-word choices). */
  hints_enabled: z.boolean().optional().default(true),
  /**
   * Extra wrong words used to build 3-choice hints (with the correct word).
   * One per line in the editor; optional — other words from the sentence are used too.
   */
  hint_decoy_words: z.array(z.string()).optional(),
  guide: guideSchema,
});

const hotspotInfoItemSchema = z.object({
  id: z.string(),
  x_percent: z.number(),
  y_percent: z.number(),
  w_percent: z.number(),
  h_percent: z.number(),
  title: z.string().optional(),
  body: z.string().optional(),
  label: z.string().optional(),
});

export type HotspotGatePayloadIn = {
  targets: { id: string }[];
  mode: "single" | "sequence" | "all";
  correct_target_id?: string;
  order?: string[];
};

export function validateHotspotGatePayload(
  data: HotspotGatePayloadIn,
): { ok: true } | { ok: false; message: string } {
  const ids = new Set(data.targets.map((t) => t.id));
  if (data.mode === "single") {
    if (!data.correct_target_id || !ids.has(data.correct_target_id)) {
      return { ok: false, message: "single mode requires correct_target_id in targets" };
    }
  }
  if (data.mode === "sequence") {
    const ord = data.order ?? [];
    if (ord.length === 0) {
      return { ok: false, message: "sequence mode requires order array" };
    }
    for (const id of ord) {
      if (!ids.has(id)) return { ok: false, message: `order references unknown id ${id}` };
    }
  }
  if (data.mode === "all") {
    if (data.targets.length === 0) {
      return { ok: false, message: "all mode needs at least one target" };
    }
  }
  return { ok: true };
}

export const hotspotInfoPayloadSchema = z.object({
  type: z.literal("interaction"),
  subtype: z.literal("hotspot_info"),
  image_url: z.string(),
  body_text: z.string().optional(),
  hotspots: z.array(hotspotInfoItemSchema).min(1),
  require_all_viewed: z.boolean().optional().default(false),
  guide: guideSchema,
});

export const hotspotGatePayloadSchema = z
  .object({
    type: z.literal("interaction"),
    subtype: z.literal("hotspot_gate"),
    image_url: z.string(),
    body_text: z.string().optional(),
    targets: z.array(rectTargetSchema).min(1),
    mode: z.enum(["single", "sequence", "all"]),
    correct_target_id: z.string().optional(),
    order: z.array(z.string()).optional(),
    guide: guideSchema,
  })
  .superRefine((data, ctx) => {
    const v = validateHotspotGatePayload(data);
    if (!v.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message: v.message });
  });

export const listenHotspotSequencePayloadSchema = z
  .object({
    type: z.literal("interaction"),
    subtype: z.literal("listen_hotspot_sequence"),
    image_url: z.string(),
    body_text: z.string().optional(),
    prompt_audio_url: z.string(),
    targets: z.array(rectTargetSchema).min(1),
    order: z.array(z.string()).min(1),
    allow_replay: z.boolean().optional().default(true),
    guide: guideSchema,
  })
  .superRefine((data, ctx) => {
    const v = validateHotspotGatePayload({
      targets: data.targets,
      mode: "sequence",
      order: data.order,
    });
    if (!v.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message: v.message });
  });

const listenColorWritePaletteItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  color_hex: z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/),
});

const listenColorWriteTextItemSchema = z.object({
  id: z.string(),
  label: z.string(),
});

const listenColorWriteTargetSchema = rectTargetSchema.extend({
  expected_mode: z.enum(["color", "text"]),
  expected_value: z.string(),
});

export const listenColorWritePayloadSchema = z
  .object({
    type: z.literal("interaction"),
    subtype: z.literal("listen_color_write"),
    image_url: z.string(),
    body_text: z.string().optional(),
    prompt_audio_url: z.string().optional(),
    allow_replay: z.boolean().optional().default(true),
    allow_overwrite: z.boolean().optional().default(true),
    require_all_targets: z.boolean().optional().default(true),
    shuffle_text_options: z.boolean().optional().default(false),
    palette: z.array(listenColorWritePaletteItemSchema).min(1),
    text_options: z.array(listenColorWriteTextItemSchema).min(1),
    targets: z.array(listenColorWriteTargetSchema).min(1),
    guide: guideSchema,
  })
  .superRefine((data, ctx) => {
    const targetIds = new Set<string>();
    for (const t of data.targets) {
      if (targetIds.has(t.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate target id: ${t.id}`,
        });
        return;
      }
      targetIds.add(t.id);
    }

    const paletteIds = new Set<string>();
    for (const p of data.palette) {
      if (paletteIds.has(p.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate palette id: ${p.id}`,
        });
        return;
      }
      paletteIds.add(p.id);
    }

    const textIds = new Set<string>();
    for (const t of data.text_options) {
      if (textIds.has(t.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate text option id: ${t.id}`,
        });
        return;
      }
      textIds.add(t.id);
    }

    for (const t of data.targets) {
      if (t.expected_mode === "color" && !paletteIds.has(t.expected_value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Target ${t.id} expects color id ${t.expected_value} not found in palette`,
        });
        return;
      }
      if (t.expected_mode === "text" && !textIds.has(t.expected_value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Target ${t.id} expects text id ${t.expected_value} not found in text_options`,
        });
        return;
      }
    }
  });

const letterMixupItemSchema = z.object({
  id: z.string(),
  target_word: z.string().min(1),
  accepted_words: z.array(z.string().min(1)).optional(),
  hint: z.string().optional(),
});

export const letterMixupPayloadSchema = z.object({
  type: z.literal("interaction"),
  subtype: z.literal("letter_mixup"),
  image_url: z.string().optional(),
  image_fit: z.enum(["cover", "contain"]).optional().default("cover"),
  /** Plays when the student taps the picture (upload / library / record in editor). */
  image_audio_url: z.string().optional(),
  /** When true, tap uses device TTS instead of `image_audio_url`. */
  image_use_tts: z.boolean().optional().default(false),
  /** Spoken on tap when `image_use_tts` is true; if empty, uses the item target word. */
  image_read_aloud_text: z.string().optional(),
  prompt: z.string(),
  items: z.array(letterMixupItemSchema).min(1),
  shuffle_letters: z.boolean().optional().default(true),
  case_sensitive: z.boolean().optional().default(false),
  guide: guideSchema,
});

const wordShapeChunkSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  is_vocab: z.boolean(),
});

export const wordShapeHuntPayloadSchema = z
  .object({
    type: z.literal("interaction"),
    subtype: z.literal("word_shape_hunt"),
    image_url: z.string().optional(),
    prompt: z.string(),
    prompt_audio_url: z.string().optional(),
    shape_layout: z.enum(["line", "wave", "circle"]).default("line"),
    word_chunks: z.array(wordShapeChunkSchema).min(2),
    shuffle_chunks: z.boolean().optional().default(false),
    guide: guideSchema,
  })
  .superRefine((data, ctx) => {
    if (!data.word_chunks.some((w) => w.is_vocab)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "word_chunks must include at least one vocabulary word",
      });
    }
  });

const tableRowSchema = z.object({
  id: z.string(),
  prompt_text: z.string().min(1),
  accepted_answers: z.array(z.string().min(1)).min(1).optional(),
  expected_token_id: z.string().optional(),
});

export const tableCompletePayloadSchema = z
  .object({
    type: z.literal("interaction"),
    subtype: z.literal("table_complete"),
    image_url: z.string().optional(),
    prompt: z.string(),
    left_column_label: z.string().default("Question"),
    right_column_label: z.string().default("Answer"),
    input_mode: z.enum(["typing", "tokens"]).default("typing"),
    rows: z.array(tableRowSchema).min(1),
    token_bank: z
      .array(
        z.object({
          id: z.string(),
          label: z.string().min(1),
        }),
      )
      .optional(),
    case_insensitive: z.boolean().optional().default(true),
    normalize_whitespace: z.boolean().optional().default(true),
    guide: guideSchema,
  })
  .superRefine((data, ctx) => {
    const tokenIds = new Set((data.token_bank ?? []).map((t) => t.id));
    for (const row of data.rows) {
      if (data.input_mode === "typing") {
        if (!row.accepted_answers?.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Row ${row.id} requires accepted_answers in typing mode`,
          });
          return;
        }
      } else if (data.input_mode === "tokens") {
        if (!row.expected_token_id || !tokenIds.has(row.expected_token_id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Row ${row.id} requires expected_token_id from token_bank`,
          });
          return;
        }
      }
    }
  });

const sortingDisplayItemSchema = z.object({
  text: z.string().optional(),
  image_url: z.string().optional(),
  show_text: z.boolean().optional(),
  show_image: z.boolean().optional(),
  image_fit: z.enum(["contain", "cover"]).optional(),
});

const sortingContainerSchema = z
  .object({
    id: z.string(),
    display: sortingDisplayItemSchema,
  })
  .superRefine((data, ctx) => {
    const showText = data.display.show_text ?? true;
    const showImage = data.display.show_image ?? true;
    const hasText = showText && !!data.display.text?.trim();
    const hasImage = showImage && !!data.display.image_url?.trim();
    if (!hasText && !hasImage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Container display requires text, image, or both",
      });
    }
  });

const sortingObjectSchema = z
  .object({
    id: z.string(),
    display: sortingDisplayItemSchema,
    target_container_id: z.string(),
  })
  .superRefine((data, ctx) => {
    const showText = data.display.show_text ?? true;
    const showImage = data.display.show_image ?? true;
    const hasText = showText && !!data.display.text?.trim();
    const hasImage = showImage && !!data.display.image_url?.trim();
    if (!hasText && !hasImage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Object display requires text, image, or both",
      });
    }
  });

export const sortingGamePayloadSchema = z
  .object({
    type: z.literal("interaction"),
    subtype: z.literal("sorting_game"),
    image_url: z.string().optional(),
    prompt: z.string(),
    prompt_audio_url: z.string().optional(),
    containers: z.array(sortingContainerSchema).min(2),
    objects: z.array(sortingObjectSchema).min(2),
    shuffle_objects: z.boolean().optional().default(true),
    allow_reassign: z.boolean().optional().default(true),
    guide: guideSchema,
  })
  .superRefine((data, ctx) => {
    const containerIds = new Set(data.containers.map((c) => c.id));
    for (const o of data.objects) {
      if (!containerIds.has(o.target_container_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Object ${o.id} references unknown target container ${o.target_container_id}`,
        });
        return;
      }
    }
  });

const dragZoneSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
});

const dragTokenSchema = z.object({
  id: z.string(),
  label: z.string(),
});

/**
 * Full-screen / interaction-screen drag-match payload.
 * A future "Story Phase 2b" slice may embed drag-match on a story page by binding zones to `StoryItem` rects; see `storyPagePhaseSchema`.
 */
export const dragMatchPayloadSchema = z.object({
  type: z.literal("interaction"),
  subtype: z.literal("drag_match"),
  image_url: z.string().optional(),
  body_text: z.string().optional(),
  zones: z.array(dragZoneSchema).min(1),
  tokens: z.array(dragTokenSchema).min(1),
  /** token id -> zone id */
  correct_map: z.record(z.string(), z.string()),
  guide: guideSchema,
});

export const soundSortPayloadSchema = z.object({
  type: z.literal("interaction"),
  subtype: z.literal("sound_sort"),
  body_text: z.string().optional(),
  prompt_audio_url: z.string(),
  choices: z
    .array(
      z.object({
        id: z.string(),
        image_url: z.string(),
        label: z.string().optional(),
      }),
    )
    .min(2),
  correct_choice_id: z.string(),
  guide: guideSchema,
});

export const essayPayloadSchema = z.object({
  type: z.literal("interaction"),
  subtype: z.literal("essay"),
  image_url: z.string().optional(),
  prompt: z.string(),
  min_chars: z.number().int().min(0).optional(),
  /** Terms the teacher expects — used for optional hints and post-submit keyword summary */
  keywords: z.array(z.string()).optional(),
  /** Shown after submit */
  feedback_text: z.string().optional(),
  /** When true, list keywords while the student writes */
  show_keywords_to_students: z.boolean().optional().default(false),
  guide: guideSchema,
});

export const voiceQuestionPayloadSchema = z.object({
  type: z.literal("interaction"),
  subtype: z.literal("voice_question"),
  image_url: z.string().optional(),
  prompt: z.string(),
  prompt_audio_url: z.string().optional(),
  max_duration_seconds: z.number().int().min(5).max(300).optional().default(90),
  max_attempts: z.number().int().min(1).max(10).optional().default(3),
  require_playback_before_submit: z.boolean().optional().default(false),
  guide: guideSchema,
});

const guidedDialogueTurnSchema = z.object({
  id: z.string(),
  prompt_text: z.string(),
  prompt_audio_url: z.string().optional(),
  student_response_label: z.string().optional(),
  max_duration_seconds: z.number().int().min(5).max(300).optional().default(90),
});

export const guidedDialoguePayloadSchema = z
  .object({
    type: z.literal("interaction"),
    subtype: z.literal("guided_dialogue"),
    character_name: z.string(),
    character_image_url: z.string(),
    intro_text: z.string().optional(),
    turns: z.array(guidedDialogueTurnSchema).min(2).max(8),
    require_turn_audio_playback: z.boolean().optional().default(false),
    allow_retry_each_turn: z.boolean().optional().default(true),
    guide: guideSchema,
  })
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    for (const turn of data.turns) {
      if (ids.has(turn.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate dialogue turn id: ${turn.id}`,
        });
        return;
      }
      ids.add(turn.id);
    }
  });

export const interactionPayloadSchema = z.intersection(
  z.discriminatedUnion("subtype", [
    mcQuizPayloadSchema,
    clickTargetsPayloadSchema,
    dragSentencePayloadSchema,
    trueFalsePayloadSchema,
    shortAnswerPayloadSchema,
    fillBlanksPayloadSchema,
    fixTextPayloadSchema,
    hotspotInfoPayloadSchema,
    hotspotGatePayloadSchema,
    listenHotspotSequencePayloadSchema,
    listenColorWritePayloadSchema,
    letterMixupPayloadSchema,
    wordShapeHuntPayloadSchema,
    tableCompletePayloadSchema,
    sortingGamePayloadSchema,
    dragMatchPayloadSchema,
    soundSortPayloadSchema,
    essayPayloadSchema,
    voiceQuestionPayloadSchema,
    guidedDialoguePayloadSchema,
    presentationInteractivePayloadSchema,
  ]),
  z.object({
    auto_advance_on_pass: z.boolean().optional(),
    /** Gold awarded for a correct answer on this interaction screen. */
    gold_reward_on_pass: z.number().int().min(0).max(100).optional(),
  }),
);

export type ScreenPayload =
  | z.infer<typeof startPayloadSchema>
  | z.infer<typeof storyPayloadSchema>
  | z.infer<typeof interactionPayloadSchema>;

export type StartPayload = z.infer<typeof startPayloadSchema>;
export type McQuizPayload = z.infer<typeof mcQuizPayloadSchema>;

export type InteractionSubtype = z.infer<
  typeof interactionPayloadSchema
>["subtype"];

export function parseScreenPayload(
  screenType: string,
  raw: unknown,
): ScreenPayload | null {
  if (screenType === "start") {
    const r = startPayloadSchema.safeParse(raw);
    return r.success ? r.data : null;
  }
  if (screenType === "story") {
    const r = storyPayloadSchema.safeParse(raw);
    return r.success ? r.data : null;
  }
  if (screenType === "interaction") {
    const r = interactionPayloadSchema.safeParse(raw);
    return r.success ? r.data : null;
  }
  return null;
}

/** For teacher outline / validation messages */
export function getInteractionSubtype(raw: unknown): string | null {
  if (
    raw &&
    typeof raw === "object" &&
    "type" in raw &&
    (raw as { type: string }).type === "interaction" &&
    "subtype" in raw &&
    typeof (raw as { subtype: string }).subtype === "string"
  ) {
    return (raw as { subtype: string }).subtype;
  }
  return null;
}

