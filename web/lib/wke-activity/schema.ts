import { z } from "zod";

const pointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const assetSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  src: z.string().min(1),
  mimeType: z.string().optional(),
  intrinsicSize: z
    .object({
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
  alt: z.string().optional(),
});

const hotspotGeometrySchema = z.discriminatedUnion("shape", [
  z.object({
    shape: z.literal("polygon"),
    points: z.array(pointSchema).min(3),
  }),
  z.object({
    shape: z.literal("rectangle"),
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  z.object({
    shape: z.literal("ellipse"),
    cx: z.number(),
    cy: z.number(),
    rx: z.number().positive(),
    ry: z.number().positive(),
  }),
]);

const hotspotElementSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("hotspot"),
  regionId: z.string().min(1),
  name: z.string().optional(),
  accessibleLabel: z.string().optional(),
  geometry: hotspotGeometrySchema,
  tabOrder: z.number().optional(),
  required: z.boolean().optional(),
  highlight: z
    .object({
      style: z.string().optional(),
      color: z.string().optional(),
      outlineWidth: z.number().optional(),
      glowRadius: z.number().optional(),
      backgroundDim: z.number().optional(),
    })
    .optional(),
  visualShape: z
    .object({
      type: z.literal("segmentation-contour"),
      sourceAssetId: z.string().min(1),
      sourceWidth: z.number().positive(),
      sourceHeight: z.number().positive(),
      paths: z.array(z.array(pointSchema).min(3)).min(1),
      score: z.number().optional(),
    })
    .optional(),
  interactionKind: z
    .enum(["dialogue", "info", "audio", "question", "none", "silent"])
    .optional(),
  presentation: z.enum(["target", "sprite", "shape", "text"]).optional(),
  spriteAssetId: z.string().min(1).optional(),
  labelText: z.string().optional(),
  textStyle: z
    .object({
      role: z.enum(["title", "body", "caption"]).optional(),
      align: z.enum(["left", "center", "right"]).optional(),
    })
    .optional(),
  rotationDeg: z.number().optional(),
  zIndex: z.number().int().optional(),
  animation: z
    .object({
      entrance: z
        .enum(["none", "fade_in", "pop", "slide_up", "slide_down"])
        .optional(),
      entranceDurationMs: z.number().min(0).max(12_000).optional(),
      entranceDelayMs: z.number().min(0).max(12_000).optional(),
      idle: z.enum(["none", "pulse", "bob", "wiggle"]).optional(),
    })
    .optional(),
  orderIndex: z.number().int().optional(),
  initialState: z.enum(["locked", "available", "hidden"]).optional(),
  wrongOrderHint: z.string().optional(),
  responseCards: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({
          id: z.string().min(1),
          kind: z.literal("info"),
          text: z.string().min(1),
          imageUrl: z.string().min(1).optional(),
        }),
        z.object({
          id: z.string().min(1),
          kind: z.literal("audio"),
          audioUrl: z.string().min(1),
          label: z.string().optional(),
        }),
        z.object({
          id: z.string().min(1),
          kind: z.literal("dialogue"),
          dialogueId: z.string().min(1).optional(),
        }),
        z.object({
          id: z.string().min(1),
          kind: z.literal("question"),
          prompt: z.string().min(1),
          questionType: z.enum(["mc", "true_false"]),
          choices: z
            .array(
              z.object({
                id: z.string().min(1),
                label: z.string().min(1),
              }),
            )
            .min(2),
          correctChoiceId: z.string().min(1),
          gateDiscover: z.boolean().optional(),
        }),
      ]),
    )
    .optional(),
  onTap: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          id: z.string().min(1),
          type: z.literal("play_audio"),
          audioUrl: z.string(),
          label: z.string().optional(),
          wait: z.boolean().optional(),
        }),
        z.object({
          id: z.string().min(1),
          type: z.literal("show_dialogue"),
          dialogueId: z.string().min(1).optional(),
          wait: z.boolean().optional(),
        }),
        z.object({
          id: z.string().min(1),
          type: z.literal("show_info"),
          text: z.string().min(1),
          imageUrl: z.string().min(1).optional(),
          wait: z.boolean().optional(),
        }),
        z.object({
          id: z.string().min(1),
          type: z.literal("ask_question"),
          prompt: z.string().min(1),
          questionType: z.enum(["mc", "true_false"]),
          choices: z
            .array(
              z.object({
                id: z.string().min(1),
                label: z.string().min(1),
              }),
            )
            .min(2),
          correctChoiceId: z.string().min(1),
          gateDiscover: z.boolean().optional(),
          wait: z.boolean().optional(),
        }),
        z.object({
          id: z.string().min(1),
          type: z.literal("wait"),
          ms: z.number().nonnegative(),
        }),
        z.object({
          id: z.string().min(1),
          type: z.literal("set_object_state"),
          targetId: z.string().min(1),
          state: z.enum(["hidden", "visible", "locked", "available"]),
        }),
        z.object({
          id: z.string().min(1),
          type: z.literal("swap_sprite_asset"),
          targetId: z.string().min(1),
          spriteAssetId: z.string().min(1),
        }),
        z.object({
          id: z.string().min(1),
          type: z.literal("tween_object"),
          targetId: z.string().min(1),
          to: z.object({
            x: z.number(),
            y: z.number(),
            width: z.number().positive(),
            height: z.number().positive(),
          }),
          durationMs: z.number().nonnegative(),
          easing: z.enum(["linear", "easeOut"]).optional(),
          wait: z.boolean().optional(),
        }),
        z.object({
          id: z.string().min(1),
          type: z.literal("enter_object"),
          targetId: z.string().min(1),
          to: z.object({
            x: z.number(),
            y: z.number(),
            width: z.number().positive(),
            height: z.number().positive(),
          }),
          durationMs: z.number().nonnegative(),
          from: z
            .object({
              x: z.number().optional(),
              y: z.number().optional(),
              width: z.number().positive().optional(),
              height: z.number().positive().optional(),
            })
            .optional(),
          wait: z.boolean().optional(),
        }),
        z.object({
          id: z.string().min(1),
          type: z.literal("complete_object"),
          targetId: z.string().min(1).optional(),
        }),
        z.object({
          id: z.string().min(1),
          type: z.literal("pulse_object"),
          targetId: z.string().min(1),
          enabled: z.boolean().optional(),
        }),
      ]),
    )
    .optional(),
  enableHintPulse: z.boolean().optional(),
});

const mediaElementSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("media"),
  regionId: z.string().min(1),
  assetId: z.string().min(1),
  fit: z.enum(["contain", "cover"]).optional(),
});

const dialoguePanelElementSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("dialogue-panel"),
  regionId: z.string().min(1),
  emptyStateText: z.string().optional(),
  showTranscript: z.boolean().optional(),
  showReplay: z.boolean().optional(),
  showProgress: z.boolean().optional(),
});

const layoutElementSchema = z.union([
  hotspotElementSchema,
  mediaElementSchema,
  dialoguePanelElementSchema,
  z
    .object({
      id: z.string(),
      kind: z.string(),
    })
    .passthrough(),
]);

const dialogueSchema = z.object({
  id: z.string().min(1),
  hotspotId: z.string().min(1),
  title: z.string().min(1),
  turns: z
    .array(
      z.object({
        speaker: z.string().default(""),
        text: z.string().min(1),
        speakText: z.string().min(1).optional(),
        audioUrl: z.string().min(1).optional(),
      }),
    )
    .min(1),
});

export const wkeActivityV2Schema = z
  .object({
    version: z.literal(2),
    kind: z.literal("activity-authoring"),
    id: z.string().min(1),
    name: z.string().min(1),
    educationalIntent: z
      .object({
        objective: z.string().optional(),
        successCriteria: z.string().optional(),
        cefr: z.string().optional(),
        vocabulary: z.array(z.string()).optional(),
        languageFrames: z.array(z.string()).optional(),
      })
      .optional(),
    content: z.object({
      instruction: z.string().min(1),
      completionMessage: z.string().optional(),
    }),
    assets: z.array(assetSchema).min(1),
    layout: z.object({
      aspectRatio: z.string().optional(),
      responsive: z.string().optional(),
      regions: z
        .array(
          z.object({
            id: z.string().min(1),
            role: z.string().min(1),
            widthFraction: z.number().optional(),
          }),
        )
        .min(1),
      elements: z.array(layoutElementSchema).min(1),
    }),
    interaction: z.object({
      type: z.literal("explore-hotspots"),
      completion: z.object({
        type: z.literal("visit-all-required-hotspots"),
      }),
      visitedWhen: z
        .enum(["dialogue-started", "dialogue-finished", "dialogue-completed"])
        .optional(),
      autoPlayOnSelect: z.boolean().optional(),
      dialogues: z.array(dialogueSchema),
      phases: z
        .array(
          z.object({
            id: z.string().min(1),
            title: z.string().optional(),
            imageAssetId: z.string().min(1),
            hotspotIds: z.array(z.string().min(1)),
            onEnter: hotspotElementSchema.shape.onTap,
            objective: z
              .object({
                label: z.string().optional(),
              })
              .optional(),
            strictOrder: z.boolean().optional(),
            hintPulseEnabled: z.boolean().optional(),
            visitedWhen: z
              .enum(["dialogue-started", "dialogue-finished", "dialogue-completed"])
              .optional(),
            autoPlayOnSelect: z.boolean().optional(),
          }),
        )
        .optional(),
      objective: z
        .object({
          label: z.string().optional(),
        })
        .optional(),
      strictOrder: z.boolean().optional(),
      hintPulseEnabled: z.boolean().optional(),
    }),
    accessibility: z
      .object({
        keyboardEnabled: z.boolean().optional(),
        transcriptFallback: z.boolean().optional(),
        announceProgress: z.boolean().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hotspots = data.layout.elements.filter(
      (el): el is z.infer<typeof hotspotElementSchema> => el.kind === "hotspot",
    );
    if (hotspots.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "explore-hotspots requires at least one hotspot element",
      });
      return;
    }
    const hotspotIds = new Set(hotspots.map((h) => h.id));
    const dialogueByHotspot = new Map(
      data.interaction.dialogues.map((d) => [d.hotspotId, d] as const),
    );

    for (const dialogue of data.interaction.dialogues) {
      if (!hotspotIds.has(dialogue.hotspotId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Dialogue ${dialogue.id} references unknown hotspot ${dialogue.hotspotId}`,
        });
      }
    }

    for (const hotspot of hotspots) {
      const presentation = hotspot.presentation ?? "target";
      const interactionKind =
        hotspot.interactionKind ?? (presentation === "sprite" ? "silent" : "dialogue");
      const hasDialogue = dialogueByHotspot.has(hotspot.id);
      const hasCards = (hotspot.responseCards?.length ?? 0) > 0;
      const hasOnTap = (hotspot.onTap?.length ?? 0) > 0;
      const needsContent =
        interactionKind !== "none" && interactionKind !== "silent";
      if (needsContent && !hasDialogue && !hasCards && !hasOnTap) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Object ${hotspot.id} needs a dialogue, responseCards, or onTap sequence`,
        });
      }
      if (presentation === "sprite") {
        if (!hotspot.spriteAssetId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Sprite object ${hotspot.id} requires spriteAssetId`,
          });
        } else if (!data.assets.some((asset) => asset.id === hotspot.spriteAssetId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Sprite object ${hotspot.id} references unknown asset ${hotspot.spriteAssetId}`,
          });
        }
        if (hotspot.geometry.shape !== "rectangle") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Sprite object ${hotspot.id} must use rectangle geometry`,
          });
        }
      }
      for (const card of hotspot.responseCards ?? []) {
        if (card.kind === "question") {
          if (!card.choices.some((choice) => choice.id === card.correctChoiceId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Question card ${card.id} correctChoiceId is not in choices`,
            });
          }
        }
        if (card.kind === "dialogue" && card.dialogueId) {
          if (!data.interaction.dialogues.some((d) => d.id === card.dialogueId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Dialogue card ${card.id} references unknown dialogue ${card.dialogueId}`,
            });
          }
        }
      }
    }

    const media = data.layout.elements.find((el) => el.kind === "media");
    if (!media || media.kind !== "media") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "explore-hotspots requires a media element",
      });
      return;
    }
    if (!data.assets.some((a) => a.id === media.assetId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Media element references unknown asset ${media.assetId}`,
      });
    }

    const assetIds = new Set(data.assets.map((a) => a.id));
    for (const phase of data.interaction.phases ?? []) {
      if (!assetIds.has(phase.imageAssetId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Phase ${phase.id} references unknown image asset ${phase.imageAssetId}`,
        });
      }
      for (const hotspotId of phase.hotspotIds) {
        if (!hotspotIds.has(hotspotId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Phase ${phase.id} references unknown hotspot ${hotspotId}`,
          });
        }
      }
    }
  });

export type WkeActivityV2Parsed = z.infer<typeof wkeActivityV2Schema>;

export function parseWkeActivity(raw: unknown): WkeActivityV2Parsed {
  return wkeActivityV2Schema.parse(raw);
}

export function safeParseWkeActivity(raw: unknown) {
  return wkeActivityV2Schema.safeParse(raw);
}
