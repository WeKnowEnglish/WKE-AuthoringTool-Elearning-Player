import { describe, expect, it } from "vitest";
import {
  canEditActivityWork,
  canSubmitActivityWork,
} from "@/lib/activity-runtime/activity-permissions";
import {
  countWords,
  plainTextFromUnknown,
  submissionSnapshotId,
} from "@/lib/document-activity/snapshot";

describe("document snapshot helpers", () => {
  it("counts words and builds snapshot ids", () => {
    expect(countWords("  hello   world  ")).toBe(2);
    expect(countWords("")).toBe(0);
    expect(submissionSnapshotId("docr_1", "document:student:a", 2)).toBe(
      "docr_1:document:student:a:2",
    );
  });

  it("extracts plain text from prose-like JSON", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "world" }],
        },
      ],
    };
    expect(plainTextFromUnknown(json)).toContain("Hello");
    expect(plainTextFromUnknown(json)).toContain("world");
  });
});

describe("document edit/submit permissions (chunk 2 cycle)", () => {
  it("allows edit/submit in active for owner", () => {
    expect(
      canEditActivityWork({
        phase: "active",
        workStatus: "active",
        role: "player",
        isOwner: true,
        hasReviewPush: false,
      }),
    ).toBe(true);
    expect(
      canSubmitActivityWork({
        phase: "active",
        workStatus: "active",
        isOwner: true,
      }),
    ).toBe(true);
  });

  it("locks after submit and during collected", () => {
    expect(
      canEditActivityWork({
        phase: "active",
        workStatus: "submitted",
        role: "player",
        isOwner: true,
        hasReviewPush: false,
      }),
    ).toBe(false);
    expect(
      canEditActivityWork({
        phase: "collected",
        workStatus: "returned",
        role: "player",
        isOwner: true,
        hasReviewPush: false,
      }),
    ).toBe(false);
  });

  it("allows revise cycle after REVISE", () => {
    expect(
      canEditActivityWork({
        phase: "revision",
        workStatus: "revising",
        role: "player",
        isOwner: true,
        hasReviewPush: false,
      }),
    ).toBe(true);
    expect(
      canSubmitActivityWork({
        phase: "revision",
        workStatus: "revising",
        isOwner: true,
      }),
    ).toBe(true);
  });
});
