import type { GrammarCard, GrammarLayoutType, GrammarModule } from "../schema";
import { mergeCardLayoutScaffold, getLayoutTypeScaffold } from "./layout-type-scaffolds";
import { derivePresetPageRows } from "../poster-page-layout";
import { pruneInteractionsForCard } from "./grammar-interaction-mutations";

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

function pruneInteractionsForCardLocal(module: GrammarModule, cardId: number): GrammarModule {
  return pruneInteractionsForCard(module, cardId);
}

export function getMaxCardCount(difficulty: GrammarModule["difficulty"]): number | null {
  if (difficulty === "A1") {
    return 3;
  }
  if (difficulty === "A2") {
    return 6;
  }
  return null;
}

export function canAddCard(module: GrammarModule): boolean {
  const max = getMaxCardCount(module.difficulty);
  if (max === null) {
    return true;
  }
  return module.cards.length < max;
}

export function canRemoveCard(module: GrammarModule): boolean {
  return module.cards.length > 1;
}

export function addCard(
  module: GrammarModule,
  layoutType: GrammarLayoutType = "two-equal",
): GrammarModule {
  if (!canAddCard(module)) {
    return module;
  }

  const newId = Math.max(0, ...module.cards.map((card) => card.id)) + 1;
  const scaffold = getLayoutTypeScaffold(layoutType);
  const newCard: GrammarCard = {
    ...structuredClone(scaffold),
    id: newId,
    title: `Card ${newId}`,
    kidTitle: `Card ${newId}`,
    layoutType,
  };

  let next: GrammarModule = {
    ...module,
    cards: [...module.cards, newCard],
  };

  if (next.pageLayout === "custom") {
    const rows = [...(next.customRows ?? [])];
    rows.push({ columns: 1, cardIds: [newId] });
    next = { ...next, customRows: rows };
  }

  return next;
}

export function removeCard(module: GrammarModule, cardId: number): GrammarModule {
  if (!canRemoveCard(module)) {
    return module;
  }

  let next = pruneInteractionsForCardLocal(module, cardId);
  next = {
    ...next,
    cards: next.cards.filter((card) => card.id !== cardId),
  };

  if (next.pageLayout === "custom" && next.customRows?.length) {
    const customRows = next.customRows
      .map((row) => ({
        ...row,
        cardIds: row.cardIds.filter((id) => id !== cardId),
      }))
      .filter((row) => row.cardIds.length > 0);
    next = { ...next, customRows };
  }

  return next;
}

export function moveCard(
  module: GrammarModule,
  cardId: number,
  direction: "up" | "down",
): GrammarModule {
  const index = module.cards.findIndex((card) => card.id === cardId);
  if (index < 0) {
    return module;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= module.cards.length) {
    return module;
  }

  const cards = [...module.cards];
  const [moved] = cards.splice(index, 1);
  cards.splice(targetIndex, 0, moved);
  return { ...module, cards };
}

export function changeCardLayoutType(
  module: GrammarModule,
  cardId: number,
  layoutType: GrammarLayoutType,
): GrammarModule {
  const pruned = pruneInteractionsForCardLocal(module, cardId);
  return updateCard(pruned, cardId, (card) => mergeCardLayoutScaffold(card, layoutType));
}

export function replaceCard(
  module: GrammarModule,
  cardId: number,
  nextCard: GrammarCard,
): GrammarModule {
  return updateCard(module, cardId, () => nextCard);
}

export function updateModulePageLayoutWithRows(
  module: GrammarModule,
  pageLayout: GrammarModule["pageLayout"],
): GrammarModule {
  const cardIds = module.cards.map((card) => card.id);

  if (pageLayout === "custom") {
    const customRows =
      module.pageLayout === "custom" && module.customRows?.length ?
        module.customRows
      : derivePresetPageRows(
          module.pageLayout === "custom" ? "two-equal-then-full" : module.pageLayout,
          cardIds,
        );
    return { ...module, pageLayout, customRows };
  }

  const { customRows: _removed, ...rest } = module;
  return { ...rest, pageLayout };
}
