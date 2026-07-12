import type {
  GrammarCard,
  GrammarComparisonSide,
  GrammarItem,
  GrammarMiniCard,
  GrammarModule,
  GrammarSidePanel,
  GrammarSummaryCell,
} from "../schema";

function updateCard(
  module: GrammarModule,
  cardId: number,
  updater: (card: GrammarCard) => GrammarCard,
): GrammarModule {
  return {
    ...module,
    cards: module.cards.map((card) => (card.id === cardId ? updater(card) : card)),
  };
}

export function updateCardBannerText(
  module: GrammarModule,
  cardId: number,
  bannerText: string,
): GrammarModule {
  return updateCard(module, cardId, (card) => ({ ...card, bannerText }));
}

export function updateCardSidePanel(
  module: GrammarModule,
  cardId: number,
  side: "leftSide" | "rightSide" | "positiveSide" | "negativeSide",
  patch: Partial<GrammarSidePanel>,
): GrammarModule {
  return updateCard(module, cardId, (card) => ({
    ...card,
    [side]: {
      ...(card[side] ?? {}),
      ...patch,
    },
  }));
}

export function updateCardComparisonSide(
  module: GrammarModule,
  cardId: number,
  side: "leftColumn" | "rightColumn",
  patch: Partial<GrammarComparisonSide>,
): GrammarModule {
  return updateCard(module, cardId, (card) => ({
    ...card,
    [side]: {
      title: card[side]?.title ?? "",
      badge: card[side]?.badge,
      items: card[side]?.items ?? [{ text: "Example" }],
      ...patch,
    },
  }));
}

export function updateCardComparisonItem(
  module: GrammarModule,
  cardId: number,
  side: "leftColumn" | "rightColumn",
  itemIndex: number,
  patch: Partial<GrammarItem>,
): GrammarModule {
  return updateCard(module, cardId, (card) => {
    const column = card[side];
    if (!column) {
      return card;
    }
    const items = column.items.map((item, index) =>
      index === itemIndex ? { ...item, ...patch } : item,
    );
    return {
      ...card,
      [side]: { ...column, items },
    };
  });
}

export function updateCardItems(
  module: GrammarModule,
  cardId: number,
  items: GrammarItem[],
): GrammarModule {
  return updateCard(module, cardId, (card) => ({ ...card, items }));
}

export function updateCardItem(
  module: GrammarModule,
  cardId: number,
  itemIndex: number,
  patch: Partial<GrammarItem>,
): GrammarModule {
  return updateCard(module, cardId, (card) => {
    const items = (card.items ?? []).map((item, index) =>
      index === itemIndex ? { ...item, ...patch } : item,
    );
    return { ...card, items };
  });
}

export function updateMiniCard(
  module: GrammarModule,
  cardId: number,
  miniIndex: number,
  patch: Partial<GrammarMiniCard>,
): GrammarModule {
  return updateCard(module, cardId, (card) => {
    const miniCards = (card.miniCards ?? []).map((mini, index) =>
      index === miniIndex ? { ...mini, ...patch } : mini,
    );
    return { ...card, miniCards };
  });
}

export function updateSummaryGridColumn(
  module: GrammarModule,
  cardId: number,
  colIndex: number,
  label: string,
): GrammarModule {
  return updateCard(module, cardId, (card) => {
    if (!card.summaryGrid) {
      return card;
    }
    const columns = card.summaryGrid.columns.map((column, index) =>
      index === colIndex ? { label } : column,
    );
    return { ...card, summaryGrid: { ...card.summaryGrid, columns } };
  });
}

export function updateSummaryGridRowLabel(
  module: GrammarModule,
  cardId: number,
  rowIndex: number,
  label: string,
): GrammarModule {
  return updateCard(module, cardId, (card) => {
    if (!card.summaryGrid) {
      return card;
    }
    const rows = card.summaryGrid.rows.map((row, index) =>
      index === rowIndex ? { ...row, label } : row,
    );
    return { ...card, summaryGrid: { ...card.summaryGrid, rows } };
  });
}

export function updateSummaryGridCell(
  module: GrammarModule,
  cardId: number,
  rowIndex: number,
  colIndex: number,
  patch: Partial<GrammarSummaryCell>,
): GrammarModule {
  return updateCard(module, cardId, (card) => {
    if (!card.summaryGrid) {
      return card;
    }
    const rows = card.summaryGrid.rows.map((row, rIndex) => {
      if (rIndex !== rowIndex) {
        return row;
      }
      const cells = row.cells.map((cell, cIndex) =>
        cIndex === colIndex ? { ...cell, ...patch } : cell,
      );
      return { ...row, cells };
    });
    return { ...card, summaryGrid: { ...card.summaryGrid, rows } };
  });
}

type GoodBadSide = "good" | "bad";

export function updateCardGoodBadSide(
  module: GrammarModule,
  cardId: number,
  side: GoodBadSide,
  patch: Partial<{ text: string; graphic?: string; highlight?: string }>,
): GrammarModule {
  return updateCard(module, cardId, (card) => {
    if (!card.goodBadPair) {
      return card;
    }
    return {
      ...card,
      goodBadPair: {
        ...card.goodBadPair,
        [side]: { ...card.goodBadPair[side], ...patch },
      },
    };
  });
}

export function updateCardSubHeader(
  module: GrammarModule,
  cardId: number,
  patch: Partial<NonNullable<GrammarCard["subHeader"]>>,
): GrammarModule {
  return updateCard(module, cardId, (card) => ({
    ...card,
    subHeader: {
      label: card.subHeader?.label ?? "",
      badge: card.subHeader?.badge,
      desc: card.subHeader?.desc,
      extra: card.subHeader?.extra,
      ...patch,
    },
  }));
}

export function updateCardPattern(
  module: GrammarModule,
  cardId: number,
  patternIndex: number,
  patch: Partial<{ label: string; formula: string; graphic?: string }>,
): GrammarModule {
  return updateCard(module, cardId, (card) => {
    const patterns = (card.patterns ?? []).map((pattern, index) =>
      index === patternIndex ? { ...pattern, ...patch } : pattern,
    );
    return { ...card, patterns };
  });
}

export function updateCardItemTransformation(
  module: GrammarModule,
  cardId: number,
  itemIndex: number,
  patch: Partial<{
    from: string;
    operator: string;
    suffix: string;
    to: string;
    graphic?: string;
    ipa?: string;
  }>,
): GrammarModule {
  return updateCard(module, cardId, (card) => {
    const items = (card.items ?? []).map((item, index) => {
      if (index !== itemIndex || !item.transformationRow) {
        return item;
      }
      return {
        ...item,
        transformationRow: { ...item.transformationRow, ...patch },
      };
    });
    return { ...card, items };
  });
}
