import type {
  GrammarCard,
  GrammarDifficulty,
  GrammarGlanceRule,
  GrammarModule,
  GrammarPageLayout,
  GrammarThemeId,
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

export function updateModuleField<K extends keyof GrammarModule>(
  module: GrammarModule,
  field: K,
  value: GrammarModule[K],
): GrammarModule {
  return { ...module, [field]: value };
}

export function updateModulePageLayout(
  module: GrammarModule,
  pageLayout: GrammarPageLayout,
): GrammarModule {
  return updateModuleField(module, "pageLayout", pageLayout);
}

export function updateModuleDifficulty(
  module: GrammarModule,
  difficulty: GrammarDifficulty | undefined,
): GrammarModule {
  return updateModuleField(module, "difficulty", difficulty);
}

export function updateCardTheme(
  module: GrammarModule,
  cardId: number,
  theme: GrammarThemeId,
): GrammarModule {
  return updateCard(module, cardId, (card) => ({ ...card, theme }));
}

export function updateCardField<K extends keyof GrammarCard>(
  module: GrammarModule,
  cardId: number,
  field: K,
  value: GrammarCard[K],
): GrammarModule {
  return updateCard(module, cardId, (card) => ({ ...card, [field]: value }));
}

export function updateCardGlanceRule(
  module: GrammarModule,
  cardId: number,
  patch: Partial<GrammarGlanceRule>,
): GrammarModule {
  return updateCard(module, cardId, (card) => ({
    ...card,
    glanceRule: {
      text: card.glanceRule?.text ?? "",
      highlight: card.glanceRule?.highlight,
      ...patch,
    },
  }));
}
