import type { GrammarSummaryMark } from "../schema";

export type PosterChromeField =
  | "kidTitle"
  | "kidSubtitle"
  | "glanceRuleText"
  | "glanceRuleHighlight";

export type PosterItemProp = "text" | "highlight" | "graphic" | "caption";

export type PosterColumnSide = "leftColumn" | "rightColumn";

export type PosterSidePanelKey = "leftSide" | "rightSide" | "positiveSide" | "negativeSide";

export type PosterSidePanelField = "title" | "content" | "example" | "formula" | "warning";

export type PosterGoodBadSide = "good" | "bad";

export type PosterGoodBadProp = "text" | "highlight" | "graphic";

export type PosterMiniCardProp = "title" | "rule" | "formula" | "badge";

export type PosterSubHeaderField = "label" | "badge" | "desc" | "extra";

export type PosterPatternProp = "label" | "formula" | "graphic";

export type PosterTransformationField = "from" | "operator" | "suffix" | "to" | "graphic" | "ipa";

export type PosterInlineEditTarget =
  | { kind: "chrome"; field: PosterChromeField }
  | { kind: "columnTitle"; side: PosterColumnSide }
  | { kind: "columnBadge"; side: PosterColumnSide }
  | { kind: "cardItem"; index: number; prop: PosterItemProp }
  | { kind: "columnItem"; side: PosterColumnSide; index: number; prop: PosterItemProp }
  | { kind: "goodBad"; side: PosterGoodBadSide; prop: PosterGoodBadProp }
  | { kind: "banner"; field: "text" | "highlight" }
  | { kind: "sidePanel"; panel: PosterSidePanelKey; field: PosterSidePanelField }
  | { kind: "miniCard"; index: number; prop: PosterMiniCardProp }
  | { kind: "summaryColumn"; index: number }
  | { kind: "summaryRow"; index: number }
  | {
      kind: "summaryCell";
      rowIndex: number;
      colIndex: number;
      prop: "mark" | "text" | "graphic";
    }
  | { kind: "transformation"; itemIndex: number; field: PosterTransformationField }
  | { kind: "subHeader"; field: PosterSubHeaderField }
  | { kind: "pattern"; index: number; prop: PosterPatternProp };

export function posterInlineEditFieldKey(cardId: number, target: PosterInlineEditTarget): string {
  switch (target.kind) {
    case "chrome":
      return `card:${cardId}:chrome:${target.field}`;
    case "columnTitle":
      return `card:${cardId}:${target.side}:title`;
    case "columnBadge":
      return `card:${cardId}:${target.side}:badge`;
    case "cardItem":
      return `card:${cardId}:items:${target.index}:${target.prop}`;
    case "columnItem":
      return `card:${cardId}:${target.side}:items:${target.index}:${target.prop}`;
    case "goodBad":
      return `card:${cardId}:goodBad:${target.side}:${target.prop}`;
    case "banner":
      return `card:${cardId}:banner:${target.field}`;
    case "sidePanel":
      return `card:${cardId}:${target.panel}:${target.field}`;
    case "miniCard":
      return `card:${cardId}:miniCards:${target.index}:${target.prop}`;
    case "summaryColumn":
      return `card:${cardId}:summary:columns:${target.index}`;
    case "summaryRow":
      return `card:${cardId}:summary:rows:${target.index}`;
    case "summaryCell":
      return `card:${cardId}:summary:rows:${target.rowIndex}:cells:${target.colIndex}:${target.prop}`;
    case "transformation":
      return `card:${cardId}:items:${target.itemIndex}:transform:${target.field}`;
    case "subHeader":
      return `card:${cardId}:subHeader:${target.field}`;
    case "pattern":
      return `card:${cardId}:patterns:${target.index}:${target.prop}`;
    default: {
      const _exhaustive: never = target;
      return _exhaustive;
    }
  }
}

export function posterChromeFieldKey(cardId: number, field: PosterChromeField): string {
  return posterInlineEditFieldKey(cardId, { kind: "chrome", field });
}

export function posterExampleFieldKey(
  cardId: number,
  region: "item" | PosterColumnSide,
  itemIndex: number,
  prop: PosterItemProp,
): string {
  if (region === "item") {
    return posterInlineEditFieldKey(cardId, { kind: "cardItem", index: itemIndex, prop });
  }
  return posterInlineEditFieldKey(cardId, {
    kind: "columnItem",
    side: region,
    index: itemIndex,
    prop,
  });
}

export function parsePosterInlineEditFieldKey(key: string): {
  cardId: number;
  target: PosterInlineEditTarget;
} | null {
  const legacyChrome = key.match(
    /^card:(\d+):(kidTitle|kidSubtitle|glanceRuleText|glanceRuleHighlight)$/,
  );
  if (legacyChrome) {
    return {
      cardId: Number(legacyChrome[1]),
      target: { kind: "chrome", field: legacyChrome[2] as PosterChromeField },
    };
  }

  const matchers: Array<{ regex: RegExp; build: (m: RegExpMatchArray) => PosterInlineEditTarget }> = [
    {
      regex: /^card:(\d+):chrome:(kidTitle|kidSubtitle|glanceRuleText|glanceRuleHighlight)$/,
      build: (m) => ({ kind: "chrome", field: m[2] as PosterChromeField }),
    },
    {
      regex: /^card:(\d+):(leftColumn|rightColumn):title$/,
      build: (m) => ({ kind: "columnTitle", side: m[2] as PosterColumnSide }),
    },
    {
      regex: /^card:(\d+):(leftColumn|rightColumn):badge$/,
      build: (m) => ({ kind: "columnBadge", side: m[2] as PosterColumnSide }),
    },
    {
      regex: /^card:(\d+):items:(\d+):(text|highlight|graphic|caption)$/,
      build: (m) => ({
        kind: "cardItem",
        index: Number(m[2]),
        prop: m[3] as PosterItemProp,
      }),
    },
    {
      regex: /^card:(\d+):(leftColumn|rightColumn):items:(\d+):(text|highlight|graphic|caption)$/,
      build: (m) => ({
        kind: "columnItem",
        side: m[2] as PosterColumnSide,
        index: Number(m[3]),
        prop: m[4] as PosterItemProp,
      }),
    },
    {
      regex: /^card:(\d+):goodBad:(good|bad):(text|highlight|graphic)$/,
      build: (m) => ({
        kind: "goodBad",
        side: m[2] as PosterGoodBadSide,
        prop: m[3] as PosterGoodBadProp,
      }),
    },
    {
      regex: /^card:(\d+):banner:(text|highlight)$/,
      build: (m) => ({ kind: "banner", field: m[2] as "text" | "highlight" }),
    },
    {
      regex:
        /^card:(\d+):(leftSide|rightSide|positiveSide|negativeSide):(title|content|example|formula|warning)$/,
      build: (m) => ({
        kind: "sidePanel",
        panel: m[2] as PosterSidePanelKey,
        field: m[3] as PosterSidePanelField,
      }),
    },
    {
      regex: /^card:(\d+):miniCards:(\d+):(title|rule|formula|badge)$/,
      build: (m) => ({
        kind: "miniCard",
        index: Number(m[2]),
        prop: m[3] as PosterMiniCardProp,
      }),
    },
    {
      regex: /^card:(\d+):summary:columns:(\d+)$/,
      build: (m) => ({ kind: "summaryColumn", index: Number(m[2]) }),
    },
    {
      regex: /^card:(\d+):summary:rows:(\d+)$/,
      build: (m) => ({ kind: "summaryRow", index: Number(m[2]) }),
    },
    {
      regex: /^card:(\d+):summary:rows:(\d+):cells:(\d+):(mark|text|graphic)$/,
      build: (m) => ({
        kind: "summaryCell",
        rowIndex: Number(m[2]),
        colIndex: Number(m[3]),
        prop: m[4] as "mark" | "text" | "graphic",
      }),
    },
    {
      regex: /^card:(\d+):items:(\d+):transform:(from|operator|suffix|to|graphic|ipa)$/,
      build: (m) => ({
        kind: "transformation",
        itemIndex: Number(m[2]),
        field: m[3] as PosterTransformationField,
      }),
    },
    {
      regex: /^card:(\d+):subHeader:(label|badge|desc|extra)$/,
      build: (m) => ({ kind: "subHeader", field: m[2] as PosterSubHeaderField }),
    },
    {
      regex: /^card:(\d+):patterns:(\d+):(label|formula|graphic)$/,
      build: (m) => ({
        kind: "pattern",
        index: Number(m[2]),
        prop: m[3] as PosterPatternProp,
      }),
    },
  ];

  for (const { regex, build } of matchers) {
    const match = key.match(regex);
    if (match) {
      return { cardId: Number(match[1]), target: build(match) };
    }
  }

  return null;
}

export const SUMMARY_MARK_OPTIONS: { value: GrammarSummaryMark; label: string }[] = [
  { value: "check", label: "✓ Check" },
  { value: "cross", label: "✗ Cross" },
  { value: "dash", label: "— Dash" },
  { value: "text", label: "Text" },
];
