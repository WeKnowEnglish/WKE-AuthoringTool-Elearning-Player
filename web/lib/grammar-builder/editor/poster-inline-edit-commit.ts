import type { GrammarModule, GrammarSummaryMark } from "../schema";
import {
  updateCardBannerText,
  updateCardGoodBadSide,
  updateCardItemTransformation,
  updateCardPattern,
  updateCardSidePanel,
  updateCardSubHeader,
  updateCardComparisonItem,
  updateCardComparisonSide,
  updateCardItem,
  updateMiniCard,
  updateSummaryGridCell,
  updateSummaryGridColumn,
  updateSummaryGridRowLabel,
} from "./grammar-card-body-mutations";
import {
  updateCardField,
  updateCardGlanceRule,
} from "./grammar-module-mutations";
import type {
  PosterInlineEditTarget,
  PosterItemProp,
  PosterSidePanelField,
  PosterSidePanelKey,
} from "./poster-inline-edit-fields";

function getCard(module: GrammarModule, cardId: number) {
  return module.cards.find((entry) => entry.id === cardId);
}

function readItemProp(
  item: { text?: string; highlight?: string; graphic?: string; caption?: string } | undefined,
  prop: PosterItemProp,
): string {
  if (!item) {
    return "";
  }
  switch (prop) {
    case "text":
      return item.text ?? "";
    case "highlight":
      return item.highlight ?? "";
    case "graphic":
      return item.graphic ?? "";
    case "caption":
      return item.caption ?? "";
    default:
      return "";
  }
}

function patchItemProp(prop: PosterItemProp, value: string) {
  switch (prop) {
    case "text":
      return { text: value };
    case "highlight":
      return { highlight: value || undefined };
    case "graphic":
      return { graphic: value || undefined };
    case "caption":
      return { caption: value || undefined };
    default:
      return {};
  }
}

function readSidePanelField(
  panel: { title?: string; content?: string; example?: string; formula?: string; warning?: string } | undefined,
  field: PosterSidePanelField,
): string {
  if (!panel) {
    return "";
  }
  switch (field) {
    case "title":
      return panel.title ?? "";
    case "content":
      return panel.content ?? "";
    case "example":
      return panel.example ?? "";
    case "formula":
      return panel.formula ?? "";
    case "warning":
      return panel.warning ?? "";
    default:
      return "";
  }
}

function patchSidePanelField(field: PosterSidePanelField, value: string) {
  switch (field) {
    case "title":
      return { title: value || undefined };
    case "content":
      return { content: value };
    case "example":
      return { example: value || undefined };
    case "formula":
      return { formula: value || undefined };
    case "warning":
      return { warning: value || undefined };
    default:
      return {};
  }
}

export function readPosterInlineEditValue(
  draft: GrammarModule,
  cardId: number,
  target: PosterInlineEditTarget,
): string {
  const card = getCard(draft, cardId);
  if (!card) {
    return "";
  }

  switch (target.kind) {
    case "chrome":
      switch (target.field) {
        case "kidTitle":
          return card.kidTitle ?? "";
        case "kidSubtitle":
          return card.kidSubtitle ?? "";
        case "glanceRuleText":
          return card.glanceRule?.text ?? "";
        case "glanceRuleHighlight":
          return card.glanceRule?.highlight ?? "";
        default:
          return "";
      }
    case "columnTitle":
      return card[target.side]?.title ?? "";
    case "columnBadge":
      return card[target.side]?.badge ?? "";
    case "cardItem":
      return readItemProp(card.items?.[target.index], target.prop);
    case "columnItem":
      return readItemProp(card[target.side]?.items[target.index], target.prop);
    case "goodBad":
      return card.goodBadPair?.[target.side]?.[target.prop === "text" ? "text" : target.prop] ?? "";
    case "banner":
      if (target.field === "text") {
        return card.leftSide?.content ?? "";
      }
      return card.bannerText ?? "";
    case "sidePanel":
      return readSidePanelField(card[target.panel], target.field);
    case "miniCard":
      return card.miniCards?.[target.index]?.[target.prop] ?? "";
    case "summaryColumn":
      return card.summaryGrid?.columns[target.index]?.label ?? "";
    case "summaryRow":
      return card.summaryGrid?.rows[target.index]?.label ?? "";
    case "summaryCell": {
      const cell = card.summaryGrid?.rows[target.rowIndex]?.cells[target.colIndex];
      if (!cell) {
        return "";
      }
      if (target.prop === "mark") {
        return cell.mark;
      }
      return cell[target.prop] ?? "";
    }
    case "transformation": {
      const row = card.items?.[target.itemIndex]?.transformationRow;
      if (!row) {
        return "";
      }
      if (target.field === "graphic") {
        return row.graphic ?? "";
      }
      return row[target.field] ?? "";
    }
    case "subHeader":
      return card.subHeader?.[target.field] ?? "";
    case "pattern": {
      const pattern = card.patterns?.[target.index];
      if (!pattern) {
        return "";
      }
      if (target.prop === "graphic") {
        return pattern.graphic ?? "";
      }
      return pattern[target.prop] ?? "";
    }
    default:
      return "";
  }
}

export function commitPosterInlineEditValue(
  draft: GrammarModule,
  cardId: number,
  target: PosterInlineEditTarget,
  value: string,
): GrammarModule {
  const card = getCard(draft, cardId);
  if (!card) {
    return draft;
  }

  switch (target.kind) {
    case "chrome":
      switch (target.field) {
        case "kidTitle":
          return updateCardField(draft, cardId, "kidTitle", value);
        case "kidSubtitle":
          return updateCardField(draft, cardId, "kidSubtitle", value || undefined);
        case "glanceRuleText":
          return updateCardGlanceRule(draft, cardId, { text: value });
        case "glanceRuleHighlight":
          return updateCardGlanceRule(draft, cardId, { highlight: value || undefined });
        default:
          return draft;
      }
    case "columnTitle":
      return updateCardComparisonSide(draft, cardId, target.side, { title: value });
    case "columnBadge":
      return updateCardComparisonSide(draft, cardId, target.side, { badge: value || undefined });
    case "cardItem":
      return updateCardItem(draft, cardId, target.index, patchItemProp(target.prop, value));
    case "columnItem":
      return updateCardComparisonItem(
        draft,
        cardId,
        target.side,
        target.index,
        patchItemProp(target.prop, value),
      );
    case "goodBad":
      if (target.prop === "text") {
        return updateCardGoodBadSide(draft, cardId, target.side, { text: value });
      }
      return updateCardGoodBadSide(draft, cardId, target.side, {
        [target.prop]: value || undefined,
      });
    case "banner":
      if (target.field === "text") {
        return updateCardSidePanel(draft, cardId, "leftSide", { content: value });
      }
      return updateCardBannerText(draft, cardId, value);
    case "sidePanel":
      return updateCardSidePanel(
        draft,
        cardId,
        target.panel as PosterSidePanelKey,
        patchSidePanelField(target.field, value),
      );
    case "miniCard": {
      const patch =
        target.prop === "title" || target.prop === "rule" ?
          { [target.prop]: value }
        : { [target.prop]: value || undefined };
      return updateMiniCard(draft, cardId, target.index, patch);
    }
    case "summaryColumn":
      return updateSummaryGridColumn(draft, cardId, target.index, value);
    case "summaryRow":
      return updateSummaryGridRowLabel(draft, cardId, target.index, value);
    case "summaryCell": {
      if (target.prop === "mark") {
        return updateSummaryGridCell(draft, cardId, target.rowIndex, target.colIndex, {
          mark: value as GrammarSummaryMark,
        });
      }
      return updateSummaryGridCell(draft, cardId, target.rowIndex, target.colIndex, {
        [target.prop]: value || undefined,
      });
    }
    case "transformation":
      return updateCardItemTransformation(draft, cardId, target.itemIndex, {
        [target.field]: value || undefined,
      });
    case "subHeader":
      return updateCardSubHeader(draft, cardId, {
        [target.field]: value || undefined,
      });
    case "pattern": {
      const patch =
        target.prop === "label" || target.prop === "formula" ?
          { [target.prop]: value }
        : { [target.prop]: value || undefined };
      return updateCardPattern(draft, cardId, target.index, patch);
    }
    default:
      return draft;
  }
}
