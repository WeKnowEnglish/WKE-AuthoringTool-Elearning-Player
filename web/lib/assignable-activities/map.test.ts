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

describe("assignable-activities catalog (MCQ-first)", () => {
  it("registers only pack_mc_quiz for now", () => {
    expect(ASSIGNABLE_ACTIVITY_KINDS).toEqual(["pack_mc_quiz"]);
    expect(isAssignableActivityKind("pack_mc_quiz")).toBe(true);
    expect(isAssignableActivityKind("letter_scramble")).toBe(false);
  });

  it("maps pack_mc_quiz ↔ pack_quiz homework payload (Phase A)", () => {
    expect(homeworkPayloadTypeForAssignableKind("pack_mc_quiz")).toBe("pack_quiz");
    expect(assignableKindForHomeworkPayloadType("pack_quiz")).toBe("pack_mc_quiz");
    expect(assignableKindForHomeworkPayloadType("external_note")).toBeNull();
    expect(assignableKindForHomeworkPayloadType("word_pack_practice")).toBeNull();
  });

  it("exposes stable source labels for catalog kinds", () => {
    expect(sourceLabelForAssignableKind("pack_mc_quiz")).toBe("Pack quiz");
    expect(sourceLabelForHomeworkPayloadType("pack_quiz")).toBe("Pack quiz");
    expect(sourceLabelForHomeworkPayloadType("external_note")).toBeNull();
  });
});
