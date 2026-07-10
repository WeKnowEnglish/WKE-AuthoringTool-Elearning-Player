import { describe, expect, it } from "vitest";
import {
  secondaryDebugReasonLabel,
  secondaryStudentReasonLabel,
} from "@/lib/secondary/secondary-selection-reason-labels";

describe("secondary-selection-reason-labels", () => {
  it("maps student-friendly labels for primary reasons", () => {
    expect(secondaryStudentReasonLabel("due_review")).toBe("Due");
    expect(secondaryStudentReasonLabel("fragile")).toBe("Practice more");
    expect(secondaryStudentReasonLabel("new")).toBe("New");
    expect(secondaryStudentReasonLabel("stretch")).toBe("Stretch");
    expect(secondaryStudentReasonLabel("refresh")).toBeNull();
  });

  it("maps debug labels for staff preview", () => {
    expect(secondaryDebugReasonLabel("due_review")).toBe("due review");
    expect(secondaryDebugReasonLabel("stretch")).toBe("stretch");
    expect(secondaryDebugReasonLabel("cloze_include")).toBe("cloze include");
  });
});
