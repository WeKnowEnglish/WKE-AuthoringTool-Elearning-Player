export type CollectionPageId = "stickers" | "scenes" | "words" | "achievements";

export const COLLECTION_PAGES: { id: CollectionPageId; label: string }[] = [
  { id: "stickers", label: "Stickers" },
  { id: "scenes", label: "Scenes" },
  { id: "words", label: "Words" },
  { id: "achievements", label: "Awards" },
];

export function parseCollectionPageId(raw: string | null | undefined): CollectionPageId {
  if (raw === "scenes" || raw === "words" || raw === "achievements") return raw;
  return "stickers";
}
