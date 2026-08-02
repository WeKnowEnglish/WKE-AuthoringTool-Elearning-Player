import {
  DEFAULT_VERB_TABLE_COLUMNS,
  DEFAULT_VERB_TABLE_INSTRUCTIONS,
  VERB_TABLE_KIND,
  type VerbTableDocument,
} from "@/lib/verb-table/types";
import { validateVerbTableDocument } from "@/lib/verb-table/document";

/** Sample lifted from Homework Template One Part 4. */
export function createSampleVerbTableDocument(): VerbTableDocument {
  return validateVerbTableDocument({
    version: 1,
    kind: VERB_TABLE_KIND,
    id: "verb-table-sample",
    title: "Complete the verb table",
    instructions: DEFAULT_VERB_TABLE_INSTRUCTIONS,
    columns: DEFAULT_VERB_TABLE_COLUMNS,
    rows: [
      { id: "verb-go", forms: { base: "go", past: "went", participle: "gone" }, missing: ["past"] },
      {
        id: "verb-play",
        forms: { base: "play", past: "played", participle: "played" },
        missing: ["participle"],
      },
      {
        id: "verb-see",
        forms: { base: "see", past: "saw", participle: "seen" },
        missing: ["past", "participle"],
      },
      { id: "verb-eat", forms: { base: "eat", past: "ate", participle: "eaten" }, missing: ["base"] },
      {
        id: "verb-write",
        forms: { base: "write", past: "wrote", participle: "written" },
        missing: ["past"],
      },
      {
        id: "verb-be",
        forms: { base: "be", past: "was/were", participle: "been" },
        missing: ["participle"],
      },
    ],
  });
}
