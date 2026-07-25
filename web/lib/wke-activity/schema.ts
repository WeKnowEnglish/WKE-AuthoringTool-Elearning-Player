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
        speaker: z.string().min(1),
        text: z.string().min(1),
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
      dialogues: z.array(dialogueSchema).min(1),
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
    for (const dialogue of data.interaction.dialogues) {
      if (!hotspotIds.has(dialogue.hotspotId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Dialogue ${dialogue.id} references unknown hotspot ${dialogue.hotspotId}`,
        });
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
  });

export type WkeActivityV2Parsed = z.infer<typeof wkeActivityV2Schema>;

export function parseWkeActivity(raw: unknown): WkeActivityV2Parsed {
  return wkeActivityV2Schema.parse(raw);
}

export function safeParseWkeActivity(raw: unknown) {
  return wkeActivityV2Schema.safeParse(raw);
}
