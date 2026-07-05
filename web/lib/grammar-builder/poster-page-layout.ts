import type { GrammarPageLayout } from "./schema";

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
