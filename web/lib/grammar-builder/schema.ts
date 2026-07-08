/**
 * Runtime Zod schemas for grammar infographic modules.
 * Authoritative spec: docs/grammar-module/grammar-module.schema.json
 */
import { z } from "zod";

export const grammarThemeIdSchema = z.enum([
  "sky-blue",
  "tangerine",
  "mint-green",
  "sun-gold",
  "lavender",
  "bubblegum",
]);

export const grammarPageLayoutSchema = z.enum([
  "single-column",
  "two-equal",
  "two-equal-then-full",
  "four-card-grid-then-split",
  "two-by-two-then-full",
  "custom",
]);

export const grammarLayoutTypeSchema = z.enum([
  "full-width",
  "two-equal",
  "three-column",
  "full-width-split",
  "four-card-grid",
  "comparison",
  "banner",
  "two-column-positive-negative",
  "summary-grid",
]);

export const grammarDisplayModeSchema = z.enum(["poster", "showcase"]);

export const grammarDifficultySchema = z.enum(["A1", "A2", "B1"]);

export const grammarGlanceRuleSchema = z.object({
  text: z.string().min(1).max(60),
  highlight: z.string().optional(),
});

export const grammarItemSchema = z
  .object({
    text: z.string().min(1).optional(),
    graphic: z.string().optional(),
    caption: z.string().optional(),
    highlight: z.string().optional(),
    transformationRow: z
      .object({
        from: z.string().min(1),
        operator: z.string().min(1),
        suffix: z.string().min(1),
        to: z.string().min(1),
        graphic: z.string().optional(),
        ipa: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((item, ctx) => {
    if (!item.text?.trim() && !item.transformationRow) {
      ctx.addIssue({
        code: "custom",
        message: "item requires text or transformationRow",
        path: ["text"],
      });
    }
  });

export const grammarSubHeaderSchema = z.object({
  label: z.string().min(1),
  badge: z.string().optional(),
  desc: z.string().optional(),
  extra: z.string().optional(),
});

export const grammarSidePanelSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  example: z.string().optional(),
  formula: z.string().optional(),
  warning: z.string().optional(),
});

export const grammarComparisonSideSchema = z
  .object({
    title: z.string().min(1),
    badge: z.string().optional(),
    items: z.array(grammarItemSchema).min(1),
  })
  .strict();

export const grammarPatternSchema = z.object({
  label: z.string().min(1),
  formula: z.string().min(1),
  graphic: z.string().optional(),
});

export const grammarMiniCardSchema = z
  .object({
    title: z.string().min(1),
    rule: z.string().min(1),
    formula: z.string().optional(),
    badge: z.string().optional(),
    theme: grammarThemeIdSchema.optional(),
  })
  .strict();

export const grammarQaSideSchema = z
  .object({
    text: z.string().min(1),
    graphic: z.string().optional(),
    highlight: z.string().optional(),
  })
  .strict();

export const grammarGoodBadPairSchema = z
  .object({
    good: grammarQaSideSchema,
    bad: grammarQaSideSchema,
  })
  .strict();

export const grammarSummaryMarkSchema = z.enum(["check", "cross", "dash", "text"]);

export const grammarSummaryCellSchema = z
  .object({
    mark: grammarSummaryMarkSchema,
    text: z.string().optional(),
    graphic: z.string().optional(),
  })
  .strict();

export const grammarSummaryGridSchema = z
  .object({
    columns: z
      .array(
        z
          .object({
            label: z.string().min(1),
          })
          .strict(),
      )
      .min(2),
    rows: z
      .array(
        z
          .object({
            label: z.string().min(1),
            cells: z.array(grammarSummaryCellSchema).min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const grammarCardSchema = z
  .object({
    id: z.number().int().min(1),
    title: z.string().min(1),
    kidTitle: z.string().max(40).optional(),
    kidSubtitle: z.string().max(30).optional(),
    theme: grammarThemeIdSchema,
    layoutType: grammarLayoutTypeSchema,
    glanceRule: grammarGlanceRuleSchema.optional(),
    subHeader: grammarSubHeaderSchema.optional(),
    items: z.array(grammarItemSchema).optional(),
    leftSide: grammarSidePanelSchema.optional(),
    rightSide: grammarSidePanelSchema.optional(),
    leftColumn: grammarComparisonSideSchema.optional(),
    rightColumn: grammarComparisonSideSchema.optional(),
    positiveSide: grammarSidePanelSchema.optional(),
    negativeSide: grammarSidePanelSchema.optional(),
    patterns: z.array(grammarPatternSchema).optional(),
    bannerText: z.string().optional(),
    summaryGrid: grammarSummaryGridSchema.optional(),
    miniCards: z.array(grammarMiniCardSchema).optional(),
    goodBadPair: grammarGoodBadPairSchema.optional(),
  })
  .strict();

export type GrammarParseOptions = {
  /** Enforce kidTitle, glanceRule, and no tags on poster modules. Default true. */
  posterContentRules?: boolean;
};

export const grammarPageRowSchema = z
  .object({
    columns: z.union([z.literal(1), z.literal(2)]),
    cardIds: z.array(z.number().int().min(1)).min(1).max(2),
  })
  .strict();

export const grammarInteractionRegionSchema = z.enum([
  "card",
  "glanceRule",
  "leftColumn",
  "rightColumn",
  "item",
  "banner",
  "leftSide",
  "positiveSide",
  "negativeSide",
  "miniCard",
  "summaryCell",
]);

export const grammarInteractionTargetSchema = z
  .object({
    cardId: z.number().int().min(1),
    region: grammarInteractionRegionSchema,
    itemIndex: z.number().int().min(0).optional(),
    rowIndex: z.number().int().min(0).optional(),
    colIndex: z.number().int().min(0).optional(),
  })
  .strict();

export const grammarRevealPayloadSchema = z
  .object({
    text: z.string().min(1),
    label: z.string().optional(),
  })
  .strict();

export const grammarHighlightPayloadSchema = z
  .object({
    durationMs: z.number().int().min(100).max(5000).optional(),
    sticky: z.boolean().optional(),
  })
  .strict();

export const grammarTogglePayloadSchema = z
  .object({
    textA: z.string().min(1),
    textB: z.string().min(1),
    initial: z.enum(["a", "b"]).default("a"),
  })
  .strict();

export const grammarPlayAudioPayloadSchema = z
  .object({
    text: z.string().min(1),
    lang: z.string().optional(),
    label: z.string().optional(),
  })
  .strict();

const grammarInteractionBaseSchema = z.object({
  id: z.string().min(1),
  target: grammarInteractionTargetSchema,
  trigger: z.literal("tap").default("tap"),
});

export const grammarInteractionSchema = z.discriminatedUnion("action", [
  grammarInteractionBaseSchema.extend({
    action: z.literal("reveal"),
    payload: grammarRevealPayloadSchema,
  }),
  grammarInteractionBaseSchema.extend({
    action: z.literal("highlight"),
    payload: grammarHighlightPayloadSchema,
  }),
  grammarInteractionBaseSchema.extend({
    action: z.literal("toggle"),
    payload: grammarTogglePayloadSchema,
  }),
  grammarInteractionBaseSchema.extend({
    action: z.literal("play-audio"),
    payload: grammarPlayAudioPayloadSchema,
  }),
]);

export const grammarModuleSchema = z
  .object({
    moduleTitle: z.string().min(1),
    moduleSubtitle: z.string().optional(),
    displayMode: grammarDisplayModeSchema.default("poster"),
    difficulty: grammarDifficultySchema.optional(),
    pageLayout: grammarPageLayoutSchema,
    customRows: z.array(grammarPageRowSchema).optional(),
    interactions: z.array(grammarInteractionSchema).optional(),
    tags: z.array(z.string()).optional(),
    cards: z.array(grammarCardSchema).min(1),
  })
  .strict();

export type GrammarThemeId = z.infer<typeof grammarThemeIdSchema>;
export type GrammarPageLayout = z.infer<typeof grammarPageLayoutSchema>;
export type GrammarLayoutType = z.infer<typeof grammarLayoutTypeSchema>;
export type GrammarDisplayMode = z.infer<typeof grammarDisplayModeSchema>;
export type GrammarDifficulty = z.infer<typeof grammarDifficultySchema>;
export type GrammarGlanceRule = z.infer<typeof grammarGlanceRuleSchema>;
export type GrammarSubHeader = z.infer<typeof grammarSubHeaderSchema>;
export type GrammarSidePanel = z.infer<typeof grammarSidePanelSchema>;
export type GrammarComparisonSide = z.infer<typeof grammarComparisonSideSchema>;
export type GrammarPattern = z.infer<typeof grammarPatternSchema>;
export type GrammarQaSide = z.infer<typeof grammarQaSideSchema>;
export type GrammarItem = z.infer<typeof grammarItemSchema>;
export type GrammarMiniCard = z.infer<typeof grammarMiniCardSchema>;
export type GrammarSummaryMark = z.infer<typeof grammarSummaryMarkSchema>;
export type GrammarSummaryCell = z.infer<typeof grammarSummaryCellSchema>;
export type GrammarGoodBadPair = z.infer<typeof grammarGoodBadPairSchema>;
export type GrammarCard = z.infer<typeof grammarCardSchema>;
export type GrammarPageRow = z.infer<typeof grammarPageRowSchema>;
export type GrammarInteractionRegion = z.infer<typeof grammarInteractionRegionSchema>;
export type GrammarInteractionTarget = z.infer<typeof grammarInteractionTargetSchema>;
export type GrammarInteraction = z.infer<typeof grammarInteractionSchema>;
export type GrammarModule = z.infer<typeof grammarModuleSchema>;

function refineGrammarModule(
  module: GrammarModule,
  ctx: z.RefinementCtx,
  posterContentRules: boolean,
) {
  const isA1Poster =
    module.displayMode === "poster" && module.difficulty === "A1";

  if (isA1Poster && module.cards.length > 3) {
    ctx.addIssue({
      code: "custom",
      message: "A1 poster modules allow at most 3 cards",
      path: ["cards"],
    });
  }

  const isA2Poster =
    module.displayMode === "poster" && module.difficulty === "A2";

  if (isA2Poster && module.cards.length > 6) {
    ctx.addIssue({
      code: "custom",
      message: "A2 poster modules allow at most 6 cards",
      path: ["cards"],
    });
  }

  const seenCardIds = new Set<number>();
  module.cards.forEach((card, index) => {
    if (seenCardIds.has(card.id)) {
      ctx.addIssue({
        code: "custom",
        message: `Duplicate card id: ${card.id}`,
        path: ["cards", index, "id"],
      });
    }
    seenCardIds.add(card.id);
  });

  if (module.pageLayout === "custom") {
    if (!module.customRows?.length) {
      ctx.addIssue({
        code: "custom",
        message: "custom pageLayout requires customRows",
        path: ["customRows"],
      });
    } else {
      const assigned = new Set<number>();
      const validIds = new Set(module.cards.map((card) => card.id));

      module.customRows.forEach((row, rowIndex) => {
        if (row.cardIds.length > row.columns) {
          ctx.addIssue({
            code: "custom",
            message: `Row has more cards (${row.cardIds.length}) than columns (${row.columns})`,
            path: ["customRows", rowIndex, "cardIds"],
          });
        }

        row.cardIds.forEach((cardId, cardIndex) => {
          if (!validIds.has(cardId)) {
            ctx.addIssue({
              code: "custom",
              message: `Unknown card id in row: ${cardId}`,
              path: ["customRows", rowIndex, "cardIds", cardIndex],
            });
          }
          if (assigned.has(cardId)) {
            ctx.addIssue({
              code: "custom",
              message: `Card id ${cardId} appears in more than one row`,
              path: ["customRows", rowIndex, "cardIds", cardIndex],
            });
          }
          assigned.add(cardId);
        });
      });

      module.cards.forEach((card) => {
        if (!assigned.has(card.id)) {
          ctx.addIssue({
            code: "custom",
            message: `Card id ${card.id} is not assigned to any custom row`,
            path: ["customRows"],
          });
        }
      });
    }
  } else if (module.customRows?.length) {
    ctx.addIssue({
      code: "custom",
      message: "customRows is only allowed when pageLayout is custom",
      path: ["customRows"],
    });
  }

  const seenInteractionIds = new Set<string>();
  (module.interactions ?? []).forEach((interaction, index) => {
    if (seenInteractionIds.has(interaction.id)) {
      ctx.addIssue({
        code: "custom",
        message: `Duplicate interaction id: ${interaction.id}`,
        path: ["interactions", index, "id"],
      });
    }
    seenInteractionIds.add(interaction.id);

    const cardExists = module.cards.some((card) => card.id === interaction.target.cardId);
    if (!cardExists) {
      ctx.addIssue({
        code: "custom",
        message: `Interaction targets unknown card id: ${interaction.target.cardId}`,
        path: ["interactions", index, "target", "cardId"],
      });
    }
  });

  if (module.displayMode === "poster" && posterContentRules) {
    if (module.tags && module.tags.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "Student posters must not include footer tags",
        path: ["tags"],
      });
    }

    module.cards.forEach((card, index) => {
      if (!card.kidTitle?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Poster cards require kidTitle",
          path: ["cards", index, "kidTitle"],
        });
      }
      if (!card.glanceRule?.text?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Poster cards require glanceRule.text",
          path: ["cards", index, "glanceRule"],
        });
      }
    });
  }

  module.cards.forEach((card, index) => {
    if (card.layoutType === "two-equal") {
      if (!card.leftColumn) {
        ctx.addIssue({
          code: "custom",
          message: "two-equal layout requires leftColumn",
          path: ["cards", index, "leftColumn"],
        });
      }
      if (!card.rightColumn) {
        ctx.addIssue({
          code: "custom",
          message: "two-equal layout requires rightColumn",
          path: ["cards", index, "rightColumn"],
        });
      }
    }

    if (card.layoutType === "banner") {
      if (!card.bannerText?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "banner layout requires bannerText",
          path: ["cards", index, "bannerText"],
        });
      }
      if (!card.leftSide?.content?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "banner layout requires leftSide.content",
          path: ["cards", index, "leftSide", "content"],
        });
      }
    }

    if (card.layoutType === "three-column") {
      if (!card.items?.length) {
        ctx.addIssue({
          code: "custom",
          message: "three-column layout requires items",
          path: ["cards", index, "items"],
        });
      }
    }

    if (card.layoutType === "full-width-split") {
      if (!card.leftSide) {
        ctx.addIssue({
          code: "custom",
          message: "full-width-split layout requires leftSide",
          path: ["cards", index, "leftSide"],
        });
      }
      if (!card.rightSide) {
        ctx.addIssue({
          code: "custom",
          message: "full-width-split layout requires rightSide",
          path: ["cards", index, "rightSide"],
        });
      }
    }

    if (card.layoutType === "two-column-positive-negative") {
      if (!card.positiveSide) {
        ctx.addIssue({
          code: "custom",
          message: "two-column-positive-negative layout requires positiveSide",
          path: ["cards", index, "positiveSide"],
        });
      }
      if (!card.negativeSide) {
        ctx.addIssue({
          code: "custom",
          message: "two-column-positive-negative layout requires negativeSide",
          path: ["cards", index, "negativeSide"],
        });
      }

      for (const sideKey of ["positiveSide", "negativeSide"] as const) {
        const side = card[sideKey];
        if (
          side &&
          !side.content?.trim() &&
          !side.example?.trim() &&
          !side.formula?.trim()
        ) {
          ctx.addIssue({
            code: "custom",
            message: `${sideKey} requires content, example, or formula`,
            path: ["cards", index, sideKey],
          });
        }
      }
    }

    if (card.layoutType === "comparison") {
      if (!card.leftColumn) {
        ctx.addIssue({
          code: "custom",
          message: "comparison layout requires leftColumn",
          path: ["cards", index, "leftColumn"],
        });
      }
      if (!card.rightColumn) {
        ctx.addIssue({
          code: "custom",
          message: "comparison layout requires rightColumn",
          path: ["cards", index, "rightColumn"],
        });
      }
    }

    if (card.layoutType === "summary-grid") {
      if (!card.summaryGrid) {
        ctx.addIssue({
          code: "custom",
          message: "summary-grid layout requires summaryGrid",
          path: ["cards", index, "summaryGrid"],
        });
      } else {
        const { columns, rows } = card.summaryGrid;
        rows.forEach((row, rowIndex) => {
          if (row.cells.length !== columns.length) {
            ctx.addIssue({
              code: "custom",
              message: `summaryGrid row ${rowIndex + 1} must have ${columns.length} cells`,
              path: ["cards", index, "summaryGrid", "rows", rowIndex, "cells"],
            });
          }
          row.cells.forEach((cell, cellIndex) => {
            if (cell.mark === "text" && !cell.text?.trim()) {
              ctx.addIssue({
                code: "custom",
                message: "summaryGrid text cells require text",
                path: [
                  "cards",
                  index,
                  "summaryGrid",
                  "rows",
                  rowIndex,
                  "cells",
                  cellIndex,
                  "text",
                ],
              });
            }
          });
        });
      }
    }

    if (card.layoutType === "four-card-grid") {
      if (!card.miniCards || card.miniCards.length !== 4) {
        ctx.addIssue({
          code: "custom",
          message: "four-card-grid layout requires exactly 4 miniCards",
          path: ["cards", index, "miniCards"],
        });
      }
    }

    if (card.layoutType === "full-width") {
      if (!card.items?.length) {
        ctx.addIssue({
          code: "custom",
          message: "full-width layout requires items",
          path: ["cards", index, "items"],
        });
      }
    }
  });
}

export function createGrammarModuleSchema(options: GrammarParseOptions = {}) {
  const posterContentRules = options.posterContentRules ?? true;

  return grammarModuleSchema.superRefine((module, ctx) => {
    refineGrammarModule(module, ctx, posterContentRules);
  });
}

/** Default parser schema with poster content rules enabled. */
export const grammarModuleParserSchema = createGrammarModuleSchema();
