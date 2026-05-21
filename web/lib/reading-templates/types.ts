export const READING_SET_IDS = ["reading_mixed_items"] as const;

export type ReadingSetId = (typeof READING_SET_IDS)[number];

export type ReadingItemSlotId = "animal" | "toy" | "fruit" | "food" | "clothes";

export type ReadingItem = {
  id: ReadingItemSlotId;
  category: string;
  lemma: string;
  colorName: string;
  colorHex: string;
  imageUrl: string;
};

export type ReadingTfItem = {
  itemId: ReadingItemSlotId;
  statement: string;
  correct: boolean;
};

export type ReadingClozeBlank = {
  id: string;
  acceptable: string[];
};

export type ReadingCloze = {
  template: string;
  blanks: ReadingClozeBlank[];
  /** Exactly 8 entries: 5 answers + 3 distractors. */
  wordBank: string[];
  heroImageUrl?: string;
};

export type ReadingShortAnswerItem = {
  itemId: ReadingItemSlotId;
  prompt: string;
  acceptable_answers: string[];
};

export type ReadingSetDefinition = {
  id: ReadingSetId;
  title: string;
  coverImageUrl: string;
  items: ReadingItem[];
  generalTrueFalse: ReadingTfItem[];
  pictureTrueFalse: ReadingTfItem[];
  cloze: ReadingCloze;
  shortAnswers: ReadingShortAnswerItem[];
};

export type BuildReadingSetOptions = {
  seed?: string;
};

export function isReadingSetId(id: string): id is ReadingSetId {
  return (READING_SET_IDS as readonly string[]).includes(id);
}
