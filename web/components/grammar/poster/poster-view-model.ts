import type { CardPalette } from "@/lib/grammar-builder/theme-tokens";
import type { GrammarLayoutType, GrammarThemeId } from "@/lib/grammar-builder/schema";
import type { PosterInternalLayout } from "@/lib/grammar-builder/map-poster-section/infer-internal-layout";
import { resolveCardPalette } from "@/lib/grammar-builder/theme-tokens";

export type PosterSectionColor = "blue" | "orange" | "purple" | "green" | "yellow" | "pink";

export type PosterGlanceRule = {
  text: string;
  highlight?: string;
};

export type PosterHeroData = {
  prefix: string;
  highlightA: { text: string; color: string };
  middle: string;
  highlightB: { text: string; color: string };
  suffix: string;
};

export type PosterExample = {
  sentence: string;
  highlight?: string;
  emoji: string;
  label?: string;
  transformationRow?: PosterTransformationRow;
};

export type PosterTransformationRow = {
  from: string;
  operator: string;
  suffix: string;
  to: string;
  emoji?: string;
  ipa?: string;
};

export type PosterMiniCard = {
  title: string;
  rule: string;
  formula?: string;
  badge?: string;
  color: PosterSectionColor;
  palette?: CardPalette;
};

export type PosterGoodBadPair = {
  good: { sentence: string; emoji?: string; highlight?: string };
  bad: { sentence: string; emoji?: string; highlight?: string };
};

export type PosterPattern = {
  label: string;
  formula: string;
  emoji: string;
};

export type PosterSubHeader = {
  label: string;
  badge?: string;
  desc?: string;
  extra?: string;
};

export type PosterSidePanel = {
  title?: string;
  body: string;
  example?: string;
  formula?: string;
  warning?: string;
};

export type PosterComparisonSide = {
  title: string;
  badge?: string;
  items: PosterExample[];
};

export type PosterSummaryMark = "check" | "cross" | "dash" | "text";

export type PosterSummaryCell = {
  mark: PosterSummaryMark;
  text?: string;
  graphic?: string;
};

export type PosterSummaryGrid = {
  columns: { label: string }[];
  rows: {
    label: string;
    cells: PosterSummaryCell[];
  }[];
};

export type PosterSection = {
  number: number;
  /** Author/reference only — not shown on student poster */
  title?: string;
  kidTitle: string;
  kidSubtitle?: string;
  glanceRule: PosterGlanceRule;
  color: PosterSectionColor;
  theme?: GrammarThemeId;
  palette?: CardPalette;
  layoutType: GrammarLayoutType;
  internalLayout: PosterInternalLayout;
  subHeader?: PosterSubHeader;
  columns?: PosterExample[];
  leftLabel?: string;
  leftEmoji?: string;
  leftExamples?: PosterExample[];
  rightLabel?: string;
  rightEmoji?: string;
  rightExamples?: PosterExample[];
  leftPanel?: PosterSidePanel;
  rightPanel?: PosterSidePanel;
  leftPatterns?: PosterPattern[];
  rightNote?: {
    title: string;
    body: string;
    highlight: string;
  };
  rememberBanner?: {
    title: string;
    body: string;
    highlight: string;
  };
  positivePanel?: PosterSidePanel;
  negativePanel?: PosterSidePanel;
  comparisonLeft?: PosterComparisonSide;
  comparisonRight?: PosterComparisonSide;
  summaryGrid?: PosterSummaryGrid;
  miniCards?: PosterMiniCard[];
  stackedExamples?: PosterExample[];
  goodBadPair?: PosterGoodBadPair;
};

const posterSky = resolveCardPalette("sky-blue");
const posterTangerine = resolveCardPalette("tangerine");

export const POSTER_HERO_FALLBACK = {
  prefix: "GRAMMAR",
  highlightA: { text: "THERE IS", color: posterSky.header },
  middle: "/",
  highlightB: { text: "THERE ARE", color: posterTangerine.header },
  suffix: "QUESTIONS",
};

export const SECTION_COLORS: Record<
  PosterSectionColor,
  { header: string; body: string; pill: string }
> = {
  blue: {
    header: "#1d4ed8",
    body: "#dbeafe",
    pill: "#bfdbfe",
  },
  orange: {
    header: "#c2410c",
    body: "#ffedd5",
    pill: "#fed7aa",
  },
  purple: {
    header: "#6d28d9",
    body: "#ede9fe",
    pill: "#ddd6fe",
  },
  green: {
    header: "#15803d",
    body: "#dcfce7",
    pill: "#bbf7d0",
  },
  yellow: {
    header: "#a16207",
    body: "#fef9c3",
    pill: "#fef08a",
  },
  pink: {
    header: "#be185d",
    body: "#fce7f3",
    pill: "#fbcfe8",
  },
};

export const POSTER_LAYOUT_SHOWCASE_DEMOS = {
  single: [
    {
      sentence: "There is a cat on the sofa.",
      highlight: "There is",
      emoji: "🐱",
      label: "singular",
    },
    {
      sentence: "There are three apples in the bowl.",
      highlight: "There are",
      emoji: "🍎",
      label: "plural",
    },
  ],
  twoLeft: [
    {
      sentence: "Some + countable nouns",
      emoji: "🧺",
      label: "affirmative",
    },
  ],
  twoRight: [
    {
      sentence: "Any + questions",
      emoji: "❓",
      label: "question",
    },
  ],
  thirtySeventy: [
    {
      sentence: "Are there any chairs?",
      highlight: "Are there",
      emoji: "🪑",
    },
    {
      sentence: "Are there any toys?",
      highlight: "Are there",
      emoji: "🧸",
    },
  ],
  threeCol: [
    { title: "Add -s", color: "blue" as const, rule: "Most nouns add -s", emoji: "📚 → 📚s" },
    { title: "Add -es", color: "green" as const, rule: "Ends in -s, -x, -ch", emoji: "📦 → 📦es" },
    { title: "y → ies", color: "yellow" as const, rule: "Consonant + y", emoji: "👶 → 👶ies" },
  ],
  fourGrid: [
    { title: "Regular -s", color: "blue" as const, rule: "book, pen", formula: "+ s" },
    { title: "Add -es", color: "green" as const, rule: "box, bus", formula: "+ es" },
    { title: "Consonant + y", color: "yellow" as const, rule: "baby, city", formula: "y → ies" },
    { title: "Vowel + y", color: "orange" as const, rule: "boy, toy", formula: "+ s" },
  ],
  comparison: {
    rule: [
      { emoji: "🍃", text: "leaf → leaves" },
      { emoji: "🐺", text: "wolf → wolves" },
    ],
    exceptions: [
      { emoji: "🏠", text: "roof → roofs" },
      { emoji: "👔", text: "chief → chiefs" },
    ],
  },
  patterns: [
    { label: "Pattern 1", formula: "IS THERE + noun ?", emoji: "🏢" },
    { label: "Pattern 2", formula: "IS THERE + any + noun ?", emoji: "💧" },
    { label: "Pattern 3", formula: "ARE THERE + any + nouns ?", emoji: "🪑" },
  ],
};
