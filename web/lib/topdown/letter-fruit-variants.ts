/** Letter fruit sheet variant — A–Z with two J colorways. */
export type LetterFruitSlug =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j_green"
  | "j_red"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z";

export type LetterFruitVariantDef = {
  slug: LetterFruitSlug;
  letter: string;
  label: string;
  imageFile: string;
};

const BASE_PATH = "/assets/Letter%20Fruit%20Stages/";

function variant(
  slug: LetterFruitSlug,
  letter: string,
  label: string,
  imageFile: string,
): LetterFruitVariantDef {
  return { slug, letter, label, imageFile };
}

const SINGLE_LETTER_SLUGS = "bcdefghiklmnopqrstuvwxyz".split("") as LetterFruitSlug[];

export const LETTER_FRUIT_VARIANTS: readonly LetterFruitVariantDef[] = [
  variant("a", "A", "Letter A", "Letter A Stages.png"),
  ...SINGLE_LETTER_SLUGS.map((slug) =>
    variant(
      slug,
      slug.toUpperCase(),
      `Letter ${slug.toUpperCase()}`,
      `Letter ${slug.toUpperCase()} Stages.png`,
    ),
  ),
  variant("j_green", "J", "Letter J (Green)", "Letter J Stages - Green.png"),
  variant("j_red", "J", "Letter J (Red)", "Letter J Stages - Red.png"),
];

export const LETTER_FRUIT_SLUGS = LETTER_FRUIT_VARIANTS.map(
  (entry) => entry.slug,
) as readonly LetterFruitSlug[];

export function getLetterFruitVariant(slug: LetterFruitSlug): LetterFruitVariantDef {
  const found = LETTER_FRUIT_VARIANTS.find((entry) => entry.slug === slug);
  if (!found) throw new Error(`Unknown letter fruit slug: ${slug}`);
  return found;
}

export function letterFruitImageSrc(slug: LetterFruitSlug): string {
  const { imageFile } = getLetterFruitVariant(slug);
  return `${BASE_PATH}${encodeURIComponent(imageFile).replace(/%20/g, "%20")}`;
}

/** Pilot atlas id, e.g. `letter-fruit-a`, `letter-fruit-j-green`. */
export function letterFruitAtlasIdForSlug(slug: LetterFruitSlug): `letter-fruit-${string}` {
  return `letter-fruit-${slug.replace(/_/g, "-")}`;
}

export function letterFruitSlugFromAtlasId(
  atlasId: string,
): LetterFruitSlug | undefined {
  if (!atlasId.startsWith("letter-fruit-")) return undefined;
  const tail = atlasId.slice("letter-fruit-".length).replace(/-/g, "_");
  return LETTER_FRUIT_SLUGS.find((slug) => slug === tail);
}

export function isLetterFruitAtlasId(atlasId: string): boolean {
  return letterFruitSlugFromAtlasId(atlasId) != null;
}
