import type { ReadingSetDefinition } from "./types";

const SLOT_IDS = new Set(["animal", "toy", "fruit", "food", "clothes"]);

/** Expected screen count: start + 5 + 5 + 1 + 5 */
export function expectedReadingScreenCount(): number {
  return 17;
}

export function validateReadingSetDefinition(def: ReadingSetDefinition): string[] {
  const errors: string[] = [];
  if (!def.id?.trim()) errors.push("Set id is required.");
  if (!def.title?.trim()) errors.push("Set title is required.");
  if (!def.coverImageUrl?.trim()) errors.push("coverImageUrl is required.");
  if (def.items.length !== 5) errors.push("Exactly five items are required.");

  const itemIds = new Set<string>();
  for (const item of def.items) {
    if (!SLOT_IDS.has(item.id)) errors.push(`Unknown item id: ${item.id}`);
    if (itemIds.has(item.id)) errors.push(`Duplicate item id: ${item.id}`);
    else itemIds.add(item.id);
    if (!item.imageUrl?.trim()) errors.push(`Item ${item.id}: imageUrl is required.`);
    if (!item.lemma?.trim()) errors.push(`Item ${item.id}: lemma is required.`);
  }

  const expectFive = (label: string, arr: readonly unknown[]) => {
    if (arr.length !== 5) errors.push(`${label} must have exactly 5 entries (got ${arr.length}).`);
  };
  expectFive("generalTrueFalse", def.generalTrueFalse);
  expectFive("pictureTrueFalse", def.pictureTrueFalse);
  expectFive("shortAnswers", def.shortAnswers);

  for (const row of [...def.generalTrueFalse, ...def.pictureTrueFalse]) {
    if (!itemIds.has(row.itemId)) errors.push(`T/F references unknown item: ${row.itemId}`);
    if (!row.statement?.trim()) errors.push(`T/F for ${row.itemId}: statement is required.`);
  }

  for (const sa of def.shortAnswers) {
    if (!itemIds.has(sa.itemId)) errors.push(`Short answer references unknown item: ${sa.itemId}`);
    if (!sa.prompt?.trim()) errors.push(`Short answer for ${sa.itemId}: prompt is required.`);
    if (sa.acceptable_answers.length === 0) {
      errors.push(`Short answer for ${sa.itemId}: acceptable_answers required.`);
    }
  }

  const cloze = def.cloze;
  if (!cloze.template?.trim()) errors.push("cloze.template is required.");
  if (cloze.blanks.length !== 5) {
    errors.push(`cloze.blanks must have 5 entries (got ${cloze.blanks.length}).`);
  }
  if (cloze.wordBank.length !== 8) {
    errors.push(`cloze.wordBank must have 8 entries (got ${cloze.wordBank.length}).`);
  }
  for (const b of cloze.blanks) {
    if (!cloze.template.includes(`__${b.id}__`)) {
      errors.push(`cloze.template must contain __${b.id}__.`);
    }
    if (b.acceptable.length === 0) {
      errors.push(`cloze blank ${b.id}: acceptable answers required.`);
    }
  }

  return errors;
}
