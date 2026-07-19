import { describe, expect, it } from "vitest";
import {
  defaultPromptForTemplate,
  templateUsesStimulus,
} from "@/lib/document-activity/domain";

describe("document stimulus (chunk 5b)", () => {
  it("uses stimulus for story and reading only", () => {
    expect(templateUsesStimulus("story_continuation")).toBe(true);
    expect(templateUsesStimulus("reading_response")).toBe(true);
    expect(templateUsesStimulus("paragraph")).toBe(false);
    expect(templateUsesStimulus("dialogue")).toBe(false);
  });

  it("defaults story and reading with non-empty stimulus", () => {
    const story = defaultPromptForTemplate("story_continuation");
    const reading = defaultPromptForTemplate("reading_response");
    expect(story.stimulus?.trim().length).toBeGreaterThan(20);
    expect(reading.stimulus?.trim().length).toBeGreaterThan(20);
    expect(reading.instructions.toLowerCase()).toContain("why");
  });

  it("keeps paragraph and dialogue without stimulus content", () => {
    expect(defaultPromptForTemplate("paragraph").stimulus ?? "").toBe("");
    expect(defaultPromptForTemplate("dialogue").stimulus ?? "").toBe("");
  });
});
