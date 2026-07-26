import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";

/** Core Day-1 hobby words aligned with flashcards / listening practice. */
export function createHobbiesVocabularyListDocument(): VocabularyListDocument {
  return {
    version: 1,
    kind: "vocabulary-list",
    id: "hobbies-vocab-day-1",
    name: "Our favorite hobbies",
    cefr: "A1",
    entries: [
      {
        id: "v1",
        word: "painting",
        definitionEn: "Making a picture with paint.",
        example: "I like painting in art class.",
        imageUrl: "/pilots/games-flashcards/hobbies/01-painting.webp",
      },
      {
        id: "v2",
        word: "drawing",
        definitionEn: "Making a picture with a pencil or pen.",
        example: "I like drawing animals.",
        imageUrl: "/pilots/games-flashcards/hobbies/02-drawing.webp",
      },
      {
        id: "v3",
        word: "singing",
        definitionEn: "Making music with your voice.",
        example: "I like singing pop songs.",
        imageUrl: "/pilots/games-flashcards/hobbies/03-singing.webp",
      },
      {
        id: "v4",
        word: "dancing",
        definitionEn: "Moving your body to music.",
        example: "I like dancing with my friends.",
        imageUrl: "/pilots/games-flashcards/hobbies/04-dancing.webp",
      },
      {
        id: "v5",
        word: "reading",
        definitionEn: "Looking at books or comics.",
        example: "I like reading comics.",
        imageUrl: "/pilots/games-flashcards/hobbies/09-reading-comics.webp",
      },
      {
        id: "v6",
        word: "cycling",
        definitionEn: "Riding a bicycle.",
        example: "I like cycling in the park.",
        imageUrl: "/pilots/games-flashcards/hobbies/07-riding-a-bike.webp",
      },
    ],
  };
}
