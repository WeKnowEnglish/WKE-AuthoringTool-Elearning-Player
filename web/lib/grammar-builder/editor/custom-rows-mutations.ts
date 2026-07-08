import type { GrammarModule, GrammarPageRow } from "../schema";

export function updateCustomRows(
  module: GrammarModule,
  customRows: GrammarPageRow[],
): GrammarModule {
  return { ...module, pageLayout: "custom", customRows };
}

export function addCustomRow(module: GrammarModule, columns: 1 | 2 = 2): GrammarModule {
  const assigned = new Set(module.customRows?.flatMap((row) => row.cardIds) ?? []);
  const nextCardId = module.cards.find((card) => !assigned.has(card.id))?.id;
  const cardIds = nextCardId ? [nextCardId] : [];

  const customRows = [...(module.customRows ?? []), { columns, cardIds }];
  return { ...module, pageLayout: "custom", customRows };
}

export function removeCustomRow(module: GrammarModule, rowIndex: number): GrammarModule {
  const customRows = (module.customRows ?? []).filter((_, index) => index !== rowIndex);
  return { ...module, customRows };
}

export function moveCustomRow(
  module: GrammarModule,
  rowIndex: number,
  direction: "up" | "down",
): GrammarModule {
  const rows = [...(module.customRows ?? [])];
  const targetIndex = direction === "up" ? rowIndex - 1 : rowIndex + 1;
  if (targetIndex < 0 || targetIndex >= rows.length) {
    return module;
  }
  const [row] = rows.splice(rowIndex, 1);
  rows.splice(targetIndex, 0, row);
  return { ...module, customRows: rows };
}

export function updateCustomRowColumns(
  module: GrammarModule,
  rowIndex: number,
  columns: 1 | 2,
): GrammarModule {
  const customRows = (module.customRows ?? []).map((row, index) => {
    if (index !== rowIndex) {
      return row;
    }
    return {
      columns,
      cardIds: row.cardIds.slice(0, columns),
    };
  });
  return { ...module, customRows };
}

export function setCustomRowCard(
  module: GrammarModule,
  rowIndex: number,
  slotIndex: number,
  cardId: number | null,
): GrammarModule {
  const customRows = (module.customRows ?? []).map((row, index) => {
    if (index !== rowIndex) {
      return row;
    }
    const cardIds = [...row.cardIds];
    if (cardId === null) {
      cardIds.splice(slotIndex, 1);
    } else {
      cardIds[slotIndex] = cardId;
    }
    return { ...row, cardIds: cardIds.filter(Boolean) };
  });
  return { ...module, customRows };
}
