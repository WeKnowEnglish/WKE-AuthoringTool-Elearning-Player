import {
  DEFAULT_SENTENCE_COLUMNS,
  DEFAULT_SENTENCE_COLUMNS_INSTRUCTIONS,
  SENTENCE_COLUMNS_KIND,
  type SentenceColumnsDocument,
} from "@/lib/sentence-columns/types";
import { validateSentenceColumnsDocument } from "@/lib/sentence-columns/document";

/** Sample lifted from Homework Template One Part 3. */
export function createSampleSentenceColumnsDocument(): SentenceColumnsDocument {
  return validateSentenceColumnsDocument({
    version: 1,
    kind: SENTENCE_COLUMNS_KIND,
    id: "sentence-columns-sample",
    title: "Build a sentence",
    instructions: DEFAULT_SENTENCE_COLUMNS_INSTRUCTIONS,
    columns: DEFAULT_SENTENCE_COLUMNS,
    challenges: [
      {
        id: "build-1",
        pieces: [
          { id: "b1-extra", text: "quickly", columnId: "extra" },
          { id: "b1-subject", text: "The small dog", columnId: "subject" },
          { id: "b1-action", text: "runs", columnId: "action" },
        ],
      },
      {
        id: "build-2",
        pieces: [
          { id: "b2-action", text: "is reading", columnId: "action" },
          { id: "b2-extra", text: "a funny comic", columnId: "extra" },
          { id: "b2-subject", text: "Mia", columnId: "subject" },
        ],
      },
      {
        id: "build-3",
        pieces: [
          { id: "b3-subject", text: "The children", columnId: "subject" },
          { id: "b3-extra", text: "in the playground", columnId: "extra" },
          { id: "b3-action", text: "are playing", columnId: "action" },
        ],
      },
      {
        id: "build-4",
        pieces: [
          { id: "b4-action", text: "carries", columnId: "action" },
          { id: "b4-subject", text: "Ben", columnId: "subject" },
          { id: "b4-extra", text: "the heavy box carefully", columnId: "extra" },
        ],
      },
    ],
  });
}
