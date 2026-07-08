import type { GrammarPageLayout } from "../schema";

export const PAGE_LAYOUT_OPTIONS: {
  value: GrammarPageLayout;
  label: string;
  hint: string;
  disabled?: boolean;
}[] = [
  {
    value: "single-column",
    label: "Single column",
    hint: "All cards stacked vertically, full width.",
  },
  {
    value: "two-equal",
    label: "Two equal",
    hint: "Two cards side by side. Works best with 2 cards.",
  },
  {
    value: "two-equal-then-full",
    label: "Two equal + full",
    hint: "Row 1: two equal cards; row 2: one full-width card. Best with 3 cards.",
  },
  {
    value: "two-by-two-then-full",
    label: "2×2 + full",
    hint: "Row 1: four cards in a 2×2 grid; row 2: one full-width card. Best with 5 cards.",
  },
  {
    value: "four-card-grid-then-split",
    label: "Four grid + split",
    hint: "Row 1: four mini cards; row 2: two wide cards. Best with 6 cards.",
  },
  {
    value: "custom",
    label: "Custom rows",
    hint: "Define explicit rows and assign cards per row.",
  },
];

export function getPageLayoutHint(pageLayout: GrammarPageLayout): string {
  return PAGE_LAYOUT_OPTIONS.find((option) => option.value === pageLayout)?.hint ?? "";
}
