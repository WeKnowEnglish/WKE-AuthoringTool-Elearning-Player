import { describe, expect, it } from "vitest";
import {
  isAssignableStudioHomeworkFormat,
  isDocumentHomeworkStudioFormat,
  assignableStudioHomeworkFormatLabel,
} from "@/lib/class-homework/assignable-studio-formats";

describe("assignable studio homework formats", () => {
  it("includes quiz packs and document modules", () => {
    expect(isAssignableStudioHomeworkFormat("multiple_choice")).toBe(true);
    expect(isAssignableStudioHomeworkFormat("learning_track")).toBe(true);
    expect(isAssignableStudioHomeworkFormat("definition_match")).toBe(true);
    expect(isAssignableStudioHomeworkFormat("cloze_choice")).toBe(true);
    expect(isAssignableStudioHomeworkFormat("vocabulary_list")).toBe(false);
  });

  it("labels document modules", () => {
    expect(isDocumentHomeworkStudioFormat("cloze_choice")).toBe(true);
    expect(assignableStudioHomeworkFormatLabel("cloze_choice")).toBe(
      "Cloze with choices",
    );
  });
});
