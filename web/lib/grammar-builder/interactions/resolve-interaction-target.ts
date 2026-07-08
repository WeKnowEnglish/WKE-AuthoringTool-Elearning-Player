import type { GrammarInteraction, GrammarInteractionTarget } from "../schema";

export type InteractionTargetKey = string;

export function interactionTargetKey(target: GrammarInteractionTarget): InteractionTargetKey {
  let key = `${target.cardId}:${target.region}`;
  if (target.itemIndex !== undefined) {
    key += `:${target.itemIndex}`;
  }
  if (target.rowIndex !== undefined) {
    key += `:r${target.rowIndex}`;
  }
  if (target.colIndex !== undefined) {
    key += `:c${target.colIndex}`;
  }
  return key;
}

export function indexInteractionsByTarget(
  interactions: GrammarInteraction[] | undefined,
): Map<InteractionTargetKey, GrammarInteraction[]> {
  const map = new Map<InteractionTargetKey, GrammarInteraction[]>();
  for (const interaction of interactions ?? []) {
    const key = interactionTargetKey(interaction.target);
    const existing = map.get(key) ?? [];
    existing.push(interaction);
    map.set(key, existing);
  }
  return map;
}

export function buildInteractionTarget(
  cardId: number,
  region: GrammarInteractionTarget["region"],
  itemIndex?: number,
  opts?: { rowIndex?: number; colIndex?: number },
): GrammarInteractionTarget {
  const target: GrammarInteractionTarget = { cardId, region };
  if (itemIndex !== undefined) {
    target.itemIndex = itemIndex;
  }
  if (opts?.rowIndex !== undefined) {
    target.rowIndex = opts.rowIndex;
  }
  if (opts?.colIndex !== undefined) {
    target.colIndex = opts.colIndex;
  }
  return target;
}
