import type { LetterFruitSlug } from "@/lib/topdown/letter-fruit-variants";

export function resolveLetterFruitSlug(
  slugProp: LetterFruitSlug | undefined,
  contextSlug: LetterFruitSlug | null | undefined,
): LetterFruitSlug {
  const resolved = slugProp ?? contextSlug ?? null;
  if (!resolved) {
    throw new Error(
      "Letter fruit rendering requires a slug prop or LetterFruitSelectorProvider",
    );
  }
  return resolved;
}
