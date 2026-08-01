import {
  CLOZE_OPEN_KIND,
  DEFAULT_CLOZE_OPEN_INSTRUCTIONS,
  type ClozeOpenDocument,
} from "@/lib/cloze-open/types";
import { validateClozeOpenDocument } from "@/lib/cloze-open/document";

/** Sample Primary open-cloze activity (admin draft: The School Garden). */
export function createSampleClozeOpenDocument(): ClozeOpenDocument {
  return validateClozeOpenDocument({
    version: 1,
    kind: CLOZE_OPEN_KIND,
    id: "cloze-open-sample",
    title: "The School Garden",
    instructions: DEFAULT_CLOZE_OPEN_INSTRUCTIONS,
    passageTitle: "Our Garden",
    caseSensitive: false,
    punctuationSensitive: false,
    segments: [
      { type: "text", id: "t1", text: "Our class has a small " },
      {
        type: "gap",
        id: "g1",
        correctAnswers: ["garden"],
        hint: "It is a place where plants grow.",
      },
      { type: "text", id: "t2", text: " behind the school. We water the plants every " },
      {
        type: "gap",
        id: "g2",
        correctAnswers: ["morning"],
        hint: "This comes before afternoon.",
      },
      { type: "text", id: "t3", text: ". Mia grows red tomatoes, and Ben " },
      {
        type: "gap",
        id: "g3",
        correctAnswers: ["grows"],
        hint: "Use the action word for helping a plant get bigger.",
      },
      { type: "text", id: "t4", text: " green beans. We are happy " },
      {
        type: "gap",
        id: "g4",
        correctAnswers: ["because"],
        hint: "This word introduces a reason.",
      },
      { type: "text", id: "t5", text: " our vegetables are healthy." },
    ],
  });
}
