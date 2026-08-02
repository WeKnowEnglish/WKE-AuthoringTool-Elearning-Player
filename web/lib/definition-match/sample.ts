import {
  DEFAULT_DEFINITION_MATCH_INSTRUCTIONS,
  DEFINITION_MATCH_KIND,
  type DefinitionMatchDocument,
} from "@/lib/definition-match/types";
import { validateDefinitionMatchDocument } from "@/lib/definition-match/document";

/** Sample Primary definition match activity. */
export function createSampleDefinitionMatchDocument(): DefinitionMatchDocument {
  return validateDefinitionMatchDocument({
    version: 1,
    kind: DEFINITION_MATCH_KIND,
    id: "definition-match-sample",
    title: "Hobbies · Definition match",
    instructions: DEFAULT_DEFINITION_MATCH_INSTRUCTIONS,
    shuffleWords: true,
    pairs: [
      {
        id: "dm-paint",
        word: "paint",
        definition: "To put colour on a picture or wall with a brush.",
      },
      {
        id: "dm-dance",
        word: "dance",
        definition: "To move your body to music.",
      },
      {
        id: "dm-garden",
        word: "garden",
        definition: "An outdoor place where people grow flowers or vegetables.",
      },
      {
        id: "dm-cook",
        word: "cook",
        definition: "To make food ready to eat by heating it.",
      },
      {
        id: "dm-read",
        word: "read",
        definition: "To look at words and understand what they mean.",
      },
    ],
  });
}
