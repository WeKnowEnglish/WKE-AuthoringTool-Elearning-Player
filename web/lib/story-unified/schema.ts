import { z } from "zod";

/** Stripped canonical triggers (v1). See plan: unified story reactions. */
export const storyUnifiedTriggerSchema = z.enum([
  "phase_enter",
  "item_click",
  "pool_quota_met",
  "all_drag_matched",
  "timer",
  "item_sequence_done",
]);

export type StoryUnifiedTrigger = z.infer<typeof storyUnifiedTriggerSchema>;

export const storyUnifiedEmphasisPresetSchema = z.enum([
  "grow",
  "shrink",
  "spin",
  "wobble",
  "fade_in",
  "fade_out",
]);

export const storyUnifiedNavPayloadSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("next_phase") }),
  z.object({ kind: z.literal("phase_id"), phase_id: z.string().min(1) }),
  z.object({
    kind: z.literal("story_page"),
    target: z.enum(["next", "prev", "page_id"]),
    page_id: z.string().optional(),
  }),
  z.object({ kind: z.literal("lesson_screen") }),
  z.object({ kind: z.literal("lesson_pass") }),
  z.object({ kind: z.literal("end_phase") }),
]);

export type StoryUnifiedNavPayload = z.infer<typeof storyUnifiedNavPayloadSchema>;

export const storyUnifiedSpeakLineSchema = z.object({
  id: z.string(),
  priority: z.number().int(),
  text: z.string().optional(),
  sound_url: z.string().optional(),
  max_plays: z.number().int().positive().optional(),
  active_phase_ids: z.array(z.string()).optional(),
});

/** One leaf effect inside a `reaction_body` tree. */
export const storyUnifiedOutputLeafSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("emphasis"),
    target_item_id: z.string().min(1),
    preset: storyUnifiedEmphasisPresetSchema.optional(),
    duration_ms: z.number().min(0).max(120_000).optional(),
  }),
  z.object({
    kind: z.literal("path_move"),
    target_item_id: z.string().min(1),
    /** When set, overrides item.path duration for this run. */
    duration_ms: z.number().min(0).max(120_000).optional(),
  }),
  z.object({
    kind: z.literal("visibility"),
    op: z.enum(["show", "hide", "toggle"]),
    item_ids: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    kind: z.literal("play_sound"),
    target_item_id: z.string().optional(),
    sound_url: z.string().optional(),
  }),
  z
    .object({
      kind: z.literal("speak"),
      mode: z.enum(["literal", "line_set"]),
      text: z.string().optional(),
      lines: z.array(storyUnifiedSpeakLineSchema).optional(),
      tts_lang: z.string().optional(),
    })
    .superRefine((v, ctx) => {
      if (v.mode === "literal") {
        if (!v.text?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "speak literal mode requires non-empty text",
          });
        }
      } else if (!v.lines?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "speak line_set mode requires at least one line",
        });
      }
    }),
  z.object({
    kind: z.literal("info_popup"),
    title: z.string().optional(),
    body: z.string().optional(),
    image_url: z.string().optional(),
    video_url: z.string().optional(),
    /** When set, validates popup against this item’s kind; else uses row `owner_item_id`. */
    target_item_id: z.string().optional(),
  }),
  z.object({
    kind: z.literal("nav"),
    nav: storyUnifiedNavPayloadSchema,
  }),
]);

export type StoryUnifiedOutputLeaf = z.infer<typeof storyUnifiedOutputLeafSchema>;

export type StoryUnifiedReactionBodyNode =
  | { type: "parallel"; children: StoryUnifiedReactionBodyNode[] }
  | { type: "serial"; children: StoryUnifiedReactionBodyNode[] }
  | { type: "tap_chain"; children: StoryUnifiedReactionBodyNode[] }
  | { type: "output"; leaf: StoryUnifiedOutputLeaf };

export const storyUnifiedReactionBodyNodeSchema: z.ZodType<StoryUnifiedReactionBodyNode> =
  z.lazy(() =>
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("parallel"),
        children: z.array(storyUnifiedReactionBodyNodeSchema),
      }),
      z.object({
        type: z.literal("serial"),
        children: z.array(storyUnifiedReactionBodyNodeSchema),
      }),
      z.object({
        type: z.literal("tap_chain"),
        children: z.array(storyUnifiedReactionBodyNodeSchema),
      }),
      z.object({
        type: z.literal("output"),
        leaf: storyUnifiedOutputLeafSchema,
      }),
    ]),
  );

export const storyUnifiedReactionRowSchema = z.object({
  id: z.string().optional(),
  /** Phase this row belongs to (always set for v1 validation). */
  phase_id: z.string().min(1),
  /** When set, row is anchored on this item (e.g. `item_click`). */
  owner_item_id: z.string().optional(),
  trigger: storyUnifiedTriggerSchema,
  /** When set with `item_click`, advance only after this sequence id completes (replaces dual on_click vs sequence_complete). */
  advance_after_sequence_id: z.string().optional(),
  /** When `trigger` is `timer`, delay after `phase_enter` (legacy `completion.auto`). */
  timer_delay_ms: z.number().min(0).max(120_000).optional(),
  /** Legacy `StoryActionSequence.id` that produced this row (provenance). */
  source_sequence_id: z.string().optional(),
  reaction_body: storyUnifiedReactionBodyNodeSchema,
});

export type StoryUnifiedReactionRow = z.infer<typeof storyUnifiedReactionRowSchema>;
