import { describe, expect, it } from "vitest";
import {
  createEmptyPickerState,
  normalizeStudentPickerState,
  pickStudents,
} from "@/lib/classroom-tools/picker";
import {
  generateRandomGroups,
  normalizeGroupSetState,
} from "@/lib/virtual-classroom/tools/groups";

describe("picker and group realtime state", () => {
  it("accepts serialized picker cycles", () => {
    const state = pickStudents(createEmptyPickerState(["s1", "s2"]), {
      random: () => 0,
    });
    expect(normalizeStudentPickerState(state)).toEqual(state);
  });

  it("accepts serialized generated groups", () => {
    const state = generateRandomGroups({
      studentIds: ["s1", "s2", "s3"],
      sizeMode: "pairs",
      random: () => 0,
    });
    expect(normalizeGroupSetState(state)).toEqual(state);
  });

  it("rejects partial picker and group payloads", () => {
    expect(normalizeStudentPickerState({ mode: "one" })).toBeNull();
    expect(normalizeGroupSetState({ sizeMode: "pairs", groups: [{}] })).toBeNull();
  });
});
