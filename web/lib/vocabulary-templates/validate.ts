import { vocabClozeVariants } from "./vocab-cloze";
import type { VocabularySetDefinition } from "./types";

/** Returns human-readable validation errors (empty = ok). */
export function validateVocabularySetDefinition(def: VocabularySetDefinition): string[] {
  const errors: string[] = [];
  if (!def.id?.trim()) errors.push("Set id is required.");
  if (!def.title?.trim()) errors.push("Set title is required.");
  if (!def.coverImageUrl?.trim()) errors.push("coverImageUrl is required.");
  if (def.words.length === 0) errors.push("At least one word is required.");

  const ids = new Set<string>();
  for (const w of def.words) {
    if (!w.id?.trim()) errors.push("Word id is required.");
    else if (ids.has(w.id)) errors.push(`Duplicate word id: ${w.id}`);
    else ids.add(w.id);
    if (!w.lemma?.trim()) errors.push(`Word ${w.id}: lemma is required.`);
    if (!w.imageUrl?.trim()) errors.push(`Word ${w.id}: imageUrl is required.`);
    const clozeVariants = vocabClozeVariants(w);
    if (clozeVariants.length === 0) {
      errors.push(`Word ${w.id}: at least one cloze variant is required.`);
    }
    clozeVariants.forEach((c, i) => {
      if (!c.template.includes("__1__")) {
        errors.push(`Word ${w.id}: cloze variant ${i + 1} must include __1__.`);
      }
      if (c.acceptable.length === 0) {
        errors.push(`Word ${w.id}: cloze variant ${i + 1} acceptable answers required.`);
      }
    });
    if (w.grammar && !["count", "uncountable", "plural"].includes(w.grammar)) {
      errors.push(`Word ${w.id}: grammar must be count, uncountable, or plural.`);
    }
    if (w.mealVerb && !["eat", "drink", "none"].includes(w.mealVerb)) {
      errors.push(`Word ${w.id}: mealVerb must be eat, drink, or none.`);
    }
  }
  for (const id of def.learnExcludeWordIds ?? []) {
    if (!ids.has(id)) errors.push(`learnExcludeWordIds: unknown word id "${id}".`);
  }
  const learnCount = def.words.filter(
    (w) => !(def.learnExcludeWordIds ?? []).includes(w.id),
  ).length;
  if (learnCount === 0) errors.push("At least one word must remain for the learn screen.");
  return errors;
}

/** Opening + learn + T/F×N + drag + cloze×N + spell×N. */
export function expectedVocabularyScreenCount(practiceCount: number): number {
  return 3 + practiceCount * 3;
}
