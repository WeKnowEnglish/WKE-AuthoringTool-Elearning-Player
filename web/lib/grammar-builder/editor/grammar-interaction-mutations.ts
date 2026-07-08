import type { GrammarInteraction, GrammarModule } from "../schema";

export function addInteraction(
  module: GrammarModule,
  interaction: GrammarInteraction,
): GrammarModule {
  return {
    ...module,
    interactions: [...(module.interactions ?? []), interaction],
  };
}

export function updateInteraction(
  module: GrammarModule,
  interactionId: string,
  patch: Partial<GrammarInteraction>,
): GrammarModule {
  return {
    ...module,
    interactions: (module.interactions ?? []).map((interaction) =>
      interaction.id === interactionId ? ({ ...interaction, ...patch } as GrammarInteraction) : interaction,
    ),
  };
}

export function removeInteraction(module: GrammarModule, interactionId: string): GrammarModule {
  return {
    ...module,
    interactions: (module.interactions ?? []).filter(
      (interaction) => interaction.id !== interactionId,
    ),
  };
}

export function pruneInteractionsForCard(
  module: GrammarModule,
  cardId: number,
): GrammarModule {
  if (!module.interactions?.length) {
    return module;
  }
  return {
    ...module,
    interactions: module.interactions.filter((interaction) => interaction.target.cardId !== cardId),
  };
}

export function createInteractionId(
  module: GrammarModule,
  cardId: number,
  action: GrammarInteraction["action"],
): string {
  const base = `${action}-card${cardId}`;
  const existing = new Set((module.interactions ?? []).map((interaction) => interaction.id));
  if (!existing.has(base)) {
    return base;
  }
  let index = 2;
  while (existing.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}
