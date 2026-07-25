import type { LanguageInFocusChunkRole } from "./types";

export type SlotOption = {
  id: string;
  label: string;
  base_form?: string;
  color?: string;
};

export type SlotBank = {
  role: LanguageInFocusChunkRole;
  options: SlotOption[];
};

export type ChunkDef = {
  id: string;
  role: LanguageInFocusChunkRole;
  label: string;
};

/**
 * Fill `{role}` / `{chunkId}` placeholders in a template.
 * Unknown tokens are left as-is.
 */
export function fillTemplate(
  template: string,
  valuesByToken: Record<string, string>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (full, key: string) => {
    const value = valuesByToken[key];
    return value !== undefined ? value : full;
  });
}

/** Resolve option ids (or raw labels) for an example into display labels by role + chunk id. */
export function resolveSlotLabels(
  values: Record<string, string>,
  chunks: ChunkDef[],
  slotBanks: SlotBank[],
): { byRole: Record<string, string>; byChunkId: Record<string, string> } {
  const bankByRole = new Map(slotBanks.map((b) => [b.role, b]));
  const byRole: Record<string, string> = {};
  const byChunkId: Record<string, string> = {};

  for (const chunk of chunks) {
    const raw = values[chunk.role] ?? values[chunk.id];
    if (!raw) continue;
    const bank = bankByRole.get(chunk.role);
    const option = bank?.options.find((o) => o.id === raw);
    const label = option?.label ?? raw;
    byRole[chunk.role] = label;
    byChunkId[chunk.id] = label;
  }

  return { byRole, byChunkId };
}

/** Build the spoken/display sentence from the activity template. */
export function resolveSentence(
  sentenceTemplate: string,
  values: Record<string, string>,
  chunks: ChunkDef[],
  slotBanks: SlotBank[],
): string {
  const { byRole, byChunkId } = resolveSlotLabels(values, chunks, slotBanks);
  return fillTemplate(sentenceTemplate, { ...byRole, ...byChunkId }).trim();
}

/** Bubble text from template + optional per-example override. */
export function resolveBubbleText(args: {
  bubbleTemplate: string;
  sentence: string;
  tabLabel: string;
  textOverride?: string;
}): string {
  if (args.textOverride?.trim()) return args.textOverride.trim();
  return fillTemplate(args.bubbleTemplate, {
    tab: args.tabLabel,
    speaker: args.tabLabel,
    sentence: args.sentence,
  }).trim();
}

/** Next option id in a slot bank (wraps). Optionally limit to a practice subset. */
export function nextSlotOptionId(
  bank: SlotBank,
  currentOptionId: string,
  optionIds?: string[] | null,
): string {
  const options = optionsForSlot(bank, optionIds);
  if (options.length === 0) return bank.options[0]!.id;
  const idx = options.findIndex((o) => o.id === currentOptionId);
  if (idx < 0) return options[0]!.id;
  return options[(idx + 1) % options.length]!.id;
}

/** Options available for remix / chooser (full bank when optionIds omitted). */
export function optionsForSlot(
  bank: SlotBank,
  optionIds?: string[] | null,
): SlotOption[] {
  if (!optionIds || optionIds.length === 0) return bank.options;
  const byId = new Map(bank.options.map((o) => [o.id, o]));
  return optionIds
    .map((id) => byId.get(id))
    .filter((option): option is SlotOption => !!option);
}

/**
 * Practice option ids for cycling a role: explicit cycle list, else matching
 * slot_chooser option_ids in the same workbench elements.
 */
export function remixOptionIdsForRole(
  elements: Array<
    | { type: "slot_chooser"; role: string; option_ids?: string[] }
    | { type: string; [key: string]: unknown }
  >,
  role: string,
  cycleOptionIds?: string[] | null,
): string[] | undefined {
  if (cycleOptionIds && cycleOptionIds.length > 0) return cycleOptionIds;
  const chooser = elements.find(
    (el) => el.type === "slot_chooser" && el.role === role,
  );
  if (
    chooser &&
    chooser.type === "slot_chooser" &&
    Array.isArray(chooser.option_ids) &&
    chooser.option_ids.length > 0
  ) {
    return chooser.option_ids;
  }
  return undefined;
}

/**
 * Build-target values for an example.
 * Prefers explicit `build_values`. When omitted, returns listen `values` unchanged
 * (authors should set build_values for person/agreement shifts).
 */
export function resolveBuildValues(example: {
  values: Record<string, string>;
  build_values?: Record<string, string>;
}): Record<string, string> {
  if (example.build_values && Object.keys(example.build_values).length > 0) {
    return { ...example.build_values };
  }
  return { ...example.values };
}

export type BuildWordCard = {
  id: string;
  label: string;
  role: LanguageInFocusChunkRole;
  color?: string;
};

/** Word bank for sentence build: prefer explicit 2-choice pairs per role. */
export function buildSentenceWordBank(args: {
  chunks: ChunkDef[];
  slotBanks: SlotBank[];
  targetValues: Record<string, string>;
  distractorOptionIds?: string[];
  /** role/chunkId → exactly the option ids to offer for that slot */
  choicesByRole?: Record<string, string[]>;
}): BuildWordCard[] {
  const bankByRole = new Map(args.slotBanks.map((b) => [b.role, b]));
  const byId = new Map<string, BuildWordCard>();

  function addOption(role: LanguageInFocusChunkRole, optionId: string) {
    if (byId.has(optionId)) return;
    const bank = bankByRole.get(role);
    const option = bank?.options.find((o) => o.id === optionId);
    byId.set(optionId, {
      id: optionId,
      label: option?.label ?? optionId,
      role,
      color: option?.color,
    });
  }

  if (args.choicesByRole && Object.keys(args.choicesByRole).length > 0) {
    for (const chunk of args.chunks) {
      const choiceIds =
        args.choicesByRole[chunk.role] ?? args.choicesByRole[chunk.id] ?? [];
      for (const optionId of choiceIds) {
        addOption(chunk.role, optionId);
      }
    }
    return Array.from(byId.values());
  }

  for (const chunk of args.chunks) {
    const optionId = args.targetValues[chunk.role] ?? args.targetValues[chunk.id];
    if (!optionId) continue;
    addOption(chunk.role, optionId);
  }

  for (const distractorId of args.distractorOptionIds ?? []) {
    if (byId.has(distractorId)) continue;
    for (const bank of args.slotBanks) {
      if (!bank.options.some((o) => o.id === distractorId)) continue;
      addOption(bank.role, distractorId);
      break;
    }
  }

  return Array.from(byId.values());
}

/** Two choices for one chunk role, shuffled. */
export function choicesForRole(
  cards: BuildWordCard[],
  role: LanguageInFocusChunkRole,
  seed: string,
): BuildWordCard[] {
  return shuffleWithSeed(
    cards.filter((c) => c.role === role),
    `${seed}:${role}`,
  );
}

/** Deterministic shuffle from a seed string (stable across remounts with same seed). */
export function shuffleWithSeed<T>(items: T[], seed: string): T[] {
  const out = [...items];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = out.length - 1; i > 0; i -= 1) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const j = Math.abs(h) % (i + 1);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

