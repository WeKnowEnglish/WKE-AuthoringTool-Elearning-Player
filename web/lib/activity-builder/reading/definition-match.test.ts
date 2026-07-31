import { describe, expect, it } from "vitest";
import {
  createDefinitionMatchDraft,
  definitionMatchDocumentSchema,
  definitionMatchValidationMessages,
} from "@/lib/activity-builder/reading/definition-match";
import { HOMEWORK_STUDIO_FORMATS } from "@/lib/class-homework/types";

describe("definition match reading activity", () => {
  it("creates a valid four-entry Primary draft", () => {
    expect(definitionMatchDocumentSchema.safeParse(createDefinitionMatchDraft()).success).toBe(true);
  });

  it("requires at least four entries", () => {
    const draft = createDefinitionMatchDraft();
    draft.content.entries = draft.content.entries.slice(0, 3);
    expect(definitionMatchValidationMessages(draft)).toContain(
      "Add at least four word-definition pairs.",
    );
  });

  it("rejects duplicate words regardless of case", () => {
    const draft = createDefinitionMatchDraft();
    draft.content.entries[0]!.word = "River";
    draft.content.entries[1]!.word = "river";
    expect(definitionMatchValidationMessages(draft)).toContain("Each word must be unique.");
  });

  it("rejects definitions that reveal the answer", () => {
    const draft = createDefinitionMatchDraft();
    draft.content.entries[0]!.word = "river";
    draft.content.entries[0]!.definition = "A river that carries water.";
    expect(definitionMatchValidationMessages(draft)[0]).toContain("should not contain the answer word");
  });

  it("is not exposed to the homework assignment allowlist", () => {
    expect(HOMEWORK_STUDIO_FORMATS).not.toContain("reading_definition_match");
  });
});
