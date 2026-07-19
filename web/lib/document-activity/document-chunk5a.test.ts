import { describe, expect, it } from "vitest";
import {
  DOCUMENT_TEMPLATE_OPTIONS,
  defaultPromptForTemplate,
  defaultScaffoldsForTemplate,
  parseScaffoldList,
} from "@/lib/document-activity/domain";
import type { DocumentTemplateType } from "@/lib/document-activity/types";

describe("document templates launch (chunk 5a)", () => {
  it("exposes all four template options", () => {
    expect(DOCUMENT_TEMPLATE_OPTIONS.map((o) => o.value)).toEqual([
      "paragraph",
      "story_continuation",
      "reading_response",
      "dialogue",
    ]);
  });

  it("gives each template distinct prompt defaults", () => {
    const types: DocumentTemplateType[] = [
      "paragraph",
      "story_continuation",
      "reading_response",
      "dialogue",
    ];
    const titles = types.map((t) => defaultPromptForTemplate(t).title);
    expect(new Set(titles).size).toBe(4);
  });

  it("gives each template scaffold packs", () => {
    const story = defaultScaffoldsForTemplate("story_continuation");
    const reading = defaultScaffoldsForTemplate("reading_response");
    const dialogue = defaultScaffoldsForTemplate("dialogue");
    const paragraph = defaultScaffoldsForTemplate("paragraph");
    expect(story.wordBank).toContain("suddenly");
    expect(reading.sentenceStarters[0]?.toLowerCase()).toContain("answer");
    expect(dialogue.sentenceStarters.some((s) => s.startsWith("A:"))).toBe(true);
    expect(paragraph.wordBank.length).toBeGreaterThan(0);
  });

  it("parses scaffold lists from commas and newlines", () => {
    expect(parseScaffoldList("first, then\nalso")).toEqual(["first", "then", "also"]);
    expect(parseScaffoldList("  ,  \n  ")).toEqual([]);
  });
});
