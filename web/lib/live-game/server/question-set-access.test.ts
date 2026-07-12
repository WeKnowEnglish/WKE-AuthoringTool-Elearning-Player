import { describe, expect, it } from "vitest";
import { QuestionSetAccessError } from "@/lib/live-game/server/question-set-access";
import type { LiveGameQuestionSetRow } from "@/lib/live-game/question-banks/types";

function canEditDraft(set: LiveGameQuestionSetRow, userId: string): boolean {
  return set.visibility === "teacher" && set.status === "draft" && set.createdBy === userId;
}

describe("question set draft access rules", () => {
  const ownerId = "teacher-a";
  const otherId = "teacher-b";

  const draft: LiveGameQuestionSetRow = {
    id: "draft-1",
    slug: "my-set",
    title: "My Set",
    level: "A1",
    topic: "topic",
    learningObjective: "objective",
    description: "",
    version: 1,
    status: "draft",
    visibility: "teacher",
    sortOrder: 0,
    createdBy: ownerId,
  };

  it("allows owner to edit own teacher draft", () => {
    expect(canEditDraft(draft, ownerId)).toBe(true);
  });

  it("denies non-owner teacher draft edits", () => {
    expect(canEditDraft(draft, otherId)).toBe(false);
  });

  it("denies edits on system published sets", () => {
    const systemSet: LiveGameQuestionSetRow = {
      ...draft,
      visibility: "system",
      status: "published",
      createdBy: null,
    };
    expect(canEditDraft(systemSet, ownerId)).toBe(false);
  });

  it("exposes access error status codes", () => {
    const error = new QuestionSetAccessError("Forbidden", 403);
    expect(error.status).toBe(403);
    expect(error.message).toBe("Forbidden");
  });
});
