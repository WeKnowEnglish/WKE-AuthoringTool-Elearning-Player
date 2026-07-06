import type { GrammarLayoutType, GrammarPageLayout } from "./schema";

export type LayoutLabIndexEntry = {
  layoutType: GrammarLayoutType;
  label: string;
  description: string;
  fixturePath: string;
  cardId: number;
  pageLayout?: GrammarPageLayout;
};

/** Author fixtures under docs/grammar-module/examples/ — one demo card per layoutType. */
export const LAYOUT_LAB_BY_LAYOUT_TYPE: LayoutLabIndexEntry[] = [
  {
    layoutType: "full-width",
    label: "Full width",
    description: "Vertical item stack",
    fixturePath: "plural-spelling-page-shell.json",
    cardId: 1,
    pageLayout: "four-card-grid-then-split",
  },
  {
    layoutType: "two-equal",
    label: "Two equal",
    description: "50 / 50 split inside card",
    fixturePath: "there-is-there-are-affirmative-a1.json",
    cardId: 1,
    pageLayout: "two-equal-then-full",
  },
  {
    layoutType: "three-column",
    label: "Three column",
    description: "Examples side by side",
    fixturePath: "plural-pronunciation-author.json",
    cardId: 1,
    pageLayout: "two-equal",
  },
  {
    layoutType: "full-width-split",
    label: "Full width split",
    description: "Two panels with dashed divider",
    fixturePath: "there-is-there-are.json",
    cardId: 3,
    pageLayout: "two-equal-then-full",
  },
  {
    layoutType: "four-card-grid",
    label: "Four card grid",
    description: "Nested mini rule cards",
    fixturePath: "countable-nouns-author-excerpt.json",
    cardId: 2,
    pageLayout: "two-equal-then-full",
  },
  {
    layoutType: "comparison",
    label: "Comparison",
    description: "Rule vs exceptions",
    fixturePath: "plural-spelling-comparison.json",
    cardId: 1,
    pageLayout: "four-card-grid-then-split",
  },
  {
    layoutType: "banner",
    label: "Banner",
    description: "Full-width highlight strip",
    fixturePath: "there-is-there-are-affirmative-a1.json",
    cardId: 3,
    pageLayout: "two-equal-then-full",
  },
  {
    layoutType: "two-column-positive-negative",
    label: "Positive / negative",
    description: "Yes / No short answer columns",
    fixturePath: "short-answers-there-is-author.json",
    cardId: 1,
    pageLayout: "two-equal-then-full",
  },
  {
    layoutType: "summary-grid",
    label: "Summary grid",
    description: "Checkmark matrix",
    fixturePath: "some-and-any-author.json",
    cardId: 5,
    pageLayout: "two-by-two-then-full",
  },
];

export const LAYOUT_LAB_PAGE_LAYOUTS: {
  pageLayout: GrammarPageLayout;
  label: string;
  slug: string;
}[] = [
  { pageLayout: "two-equal-then-full", label: "Two equal + full", slug: "short-answers-there-is-a1" },
  { pageLayout: "two-by-two-then-full", label: "2×2 + summary", slug: "some-and-any-a2" },
  { pageLayout: "four-card-grid-then-split", label: "Four grid + split", slug: "plural-spelling-a2" },
  { pageLayout: "two-equal", label: "Three equal columns", slug: "plural-pronunciation-a2" },
];
