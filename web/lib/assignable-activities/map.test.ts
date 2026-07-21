import { describe, expect, it } from "vitest";
import {
  ASSIGNABLE_ACTIVITY_KINDS,
  isAssignableActivityKind,
} from "@/lib/assignable-activities/types";
import {
  assignableKindForHomeworkPayloadType,
  homeworkPayloadTypeForAssignableKind,
  sourceLabelForAssignableKind,
  sourceLabelForHomeworkPayloadType,
} from "@/lib/assignable-activities/map";

describe("assignable-activities catalog", () => {
  it("registers pack_mc_quiz and pack_flashcards", () => {
    expect(ASSIGNABLE_ACTIVITY_KINDS).toEqual(["pack_mc_quiz", "pack_flashcards"]);
    expect(isAssignableActivityKind("pack_mc_quiz")).toBe(true);
    expect(isAssignableActivityKind("pack_flashcards")).toBe(true);
    expect(isAssignableActivityKind("letter_scramble")).toBe(false);
  });

  it("maps catalog kinds ↔ homework payload types", () => {
    expect(homeworkPayloadTypeForAssignableKind("pack_mc_quiz")).toBe("pack_quiz");
    expect(homeworkPayloadTypeForAssignableKind("pack_flashcards")).toBe("pack_flashcards");
    expect(assignableKindForHomeworkPayloadType("pack_quiz")).toBe("pack_mc_quiz");
    expect(assignableKindForHomeworkPayloadType("pack_flashcards")).toBe("pack_flashcards");
    expect(assignableKindForHomeworkPayloadType("external_note")).toBeNull();
    expect(assignableKindForHomeworkPayloadType("word_pack_practice")).toBeNull();
  });

  it("exposes stable source labels for catalog kinds", () => {
    expect(sourceLabelForAssignableKind("pack_mc_quiz")).toBe("Pack quiz");
    expect(sourceLabelForAssignableKind("pack_flashcards")).toBe("Flashcards");
    expect(sourceLabelForHomeworkPayloadType("pack_quiz")).toBe("Pack quiz");
    expect(sourceLabelForHomeworkPayloadType("pack_flashcards")).toBe("Flashcards");
    expect(sourceLabelForHomeworkPayloadType("external_note")).toBeNull();
  });
});
