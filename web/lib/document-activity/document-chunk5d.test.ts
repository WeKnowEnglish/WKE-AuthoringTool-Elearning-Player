import { describe, expect, it } from "vitest";
import { canCompareInParticipationMode } from "@/lib/document-activity/group-membership";
import type { DocumentParticipationMode } from "@/lib/document-activity/types";

describe("document whole-class launch (chunk 5d)", () => {
  it("supports all three launch participation modes", () => {
    const modes: DocumentParticipationMode[] = ["individual", "group", "whole_class"];
    expect(modes).toHaveLength(3);
    expect(canCompareInParticipationMode("whole_class")).toBe(false);
    expect(canCompareInParticipationMode("individual")).toBe(true);
  });
});
