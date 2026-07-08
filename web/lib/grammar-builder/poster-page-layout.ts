import type { GrammarModule, GrammarPageLayout, GrammarPageRow } from "./schema";

const POSTER_GRID_CLASS =
  "grid grid-cols-1 items-start gap-3 sm:grid-cols-2";

export function getPosterPageGridClass(pageLayout: GrammarPageLayout): string {
  switch (pageLayout) {
    case "single-column":
      return "grid grid-cols-1 items-start gap-3";
    case "two-equal":
    case "two-equal-then-full":
    case "two-by-two-then-full":
    case "four-card-grid-then-split":
    case "custom":
      return POSTER_GRID_CLASS;
    default: {
      const _exhaustive: never = pageLayout;
      return _exhaustive;
    }
  }
}

function chunkCardIds(cardIds: number[], size: number): number[][] {
  const chunks: number[][] = [];
  for (let i = 0; i < cardIds.length; i += size) {
    chunks.push(cardIds.slice(i, i + size));
  }
  return chunks;
}

export function derivePresetPageRows(
  pageLayout: GrammarPageLayout,
  cardIds: number[],
): GrammarPageRow[] {
  if (cardIds.length === 0) {
    return [];
  }

  switch (pageLayout) {
    case "single-column":
      return cardIds.map((id) => ({ columns: 1, cardIds: [id] }));

    case "two-equal":
      return chunkCardIds(cardIds, 2).map((chunk) => ({
        columns: 2 as const,
        cardIds: chunk,
      }));

    case "two-equal-then-full": {
      if (cardIds.length <= 2) {
        return chunkCardIds(cardIds, 2).map((chunk) => ({
          columns: 2 as const,
          cardIds: chunk,
        }));
      }
      const rows: GrammarPageRow[] = [{ columns: 2, cardIds: cardIds.slice(0, 2) }];
      for (const id of cardIds.slice(2)) {
        rows.push({ columns: 1, cardIds: [id] });
      }
      return rows;
    }

    case "two-by-two-then-full": {
      if (cardIds.length <= 4) {
        return chunkCardIds(cardIds, 2).map((chunk) => ({
          columns: 2 as const,
          cardIds: chunk,
        }));
      }
      const rows: GrammarPageRow[] = [];
      for (let i = 0; i < 4; i += 2) {
        rows.push({ columns: 2, cardIds: cardIds.slice(i, i + 2) });
      }
      for (const id of cardIds.slice(4)) {
        rows.push({ columns: 1, cardIds: [id] });
      }
      return rows;
    }

    case "four-card-grid-then-split":
      return chunkCardIds(cardIds, 2).map((chunk) => ({
        columns: 2 as const,
        cardIds: chunk,
      }));

    case "custom":
      return [];

    default: {
      const _exhaustive: never = pageLayout;
      return _exhaustive;
    }
  }
}

export function resolvePageRows(module: Pick<GrammarModule, "pageLayout" | "customRows" | "cards">): GrammarPageRow[] {
  const cardIds = module.cards.map((card) => card.id);
  if (module.pageLayout === "custom") {
    return module.customRows ?? [];
  }
  return derivePresetPageRows(module.pageLayout, cardIds);
}

/** @deprecated Use resolvePageRows for row-based rendering. */
export function getPosterSectionWrapperClass(
  index: number,
  pageLayout: GrammarPageLayout,
  total: number,
): string | undefined {
  if (pageLayout === "two-equal-then-full" && total > 2 && index === total - 1) {
    return "sm:col-span-2";
  }

  if (pageLayout === "two-by-two-then-full" && index >= 4) {
    return "sm:col-span-2";
  }

  return undefined;
}

export function getPosterRowGridClass(columns: 1 | 2): string {
  return columns === 1 ?
      "grid grid-cols-1 items-start gap-3"
    : "grid grid-cols-1 items-start gap-3 sm:grid-cols-2";
}
