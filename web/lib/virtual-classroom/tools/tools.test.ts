import { describe, expect, it } from "vitest";
import {
  createEmptyGroupSet,
  generateRandomGroups,
  moveStudentBetweenGroups,
  restorePreviousGroups,
  saveCurrentAsPrevious,
  setGroupLeader,
  shuffleUnlockedGroups,
  toWhiteboardAssignPayload,
  toggleGroupLock,
} from "@/lib/virtual-classroom/tools/groups";
import {
  createEmptyPickerState,
  pickStudents,
  pickerPool,
  resetPickerCycle,
  setPickerExcluded,
  syncPickerRoster,
} from "@/lib/classroom-tools/picker";

describe("student picker", () => {
  it("picks without repeat until cycle resets", () => {
    const ids = ["a", "b", "c"];
    let state = createEmptyPickerState(ids, { mode: "one" });
    const randomSeq = [0.9, 0.1, 0.5, 0.2, 0.8, 0.3];
    let i = 0;
    const random = () => randomSeq[i++ % randomSeq.length]!;

    state = pickStudents(state, { random });
    expect(state.currentStudentIds).toHaveLength(1);
    expect(state.pickedStudentIds).toHaveLength(1);
    expect(pickerPool(state)).toHaveLength(2);

    state = pickStudents(state, { random });
    state = pickStudents(state, { random });
    expect(state.pickedStudentIds).toHaveLength(3);
    expect(pickerPool(state)).toHaveLength(0);

    // Next pick starts a new cycle
    state = pickStudents(state, { random });
    expect(state.cycleNumber).toBe(2);
    expect(state.pickedStudentIds).toHaveLength(1);
    expect(state.currentStudentIds).toHaveLength(1);
  });

  it("picks two at once in two mode", () => {
    const state = pickStudents(createEmptyPickerState(["a", "b", "c", "d"], { mode: "two" }), {
      random: () => 0.1,
    });
    expect(state.currentStudentIds).toHaveLength(2);
    expect(state.pickedStudentIds).toHaveLength(2);
  });

  it("excludes students from the pool", () => {
    let state = createEmptyPickerState(["a", "b", "c"]);
    state = setPickerExcluded(state, ["b"]);
    expect(pickerPool(state)).toEqual(["a", "c"]);
    state = pickStudents(state, { random: () => 0 });
    expect(state.currentStudentIds).not.toContain("b");
  });

  it("reset cycle clears picked without changing roster", () => {
    let state = createEmptyPickerState(["a", "b"]);
    state = pickStudents(state, { random: () => 0 });
    state = resetPickerCycle(state);
    expect(state.pickedStudentIds).toEqual([]);
    expect(state.cycleNumber).toBe(2);
    expect(state.availableStudentIds).toEqual(["a", "b"]);
  });

  it("sync roster drops removed students from picked/excluded", () => {
    let state = createEmptyPickerState(["a", "b", "c"]);
    state = setPickerExcluded(state, ["b"]);
    state = pickStudents(state, { random: () => 0 });
    state = syncPickerRoster(state, ["a", "c"]);
    expect(state.availableStudentIds).toEqual(["a", "c"]);
    expect(state.excludedStudentIds).toEqual([]);
  });
});

describe("group maker", () => {
  it("makes pairs", () => {
    const set = generateRandomGroups({
      studentIds: ["a", "b", "c", "d"],
      sizeMode: "pairs",
      random: () => 0.2,
    });
    expect(set.groups).toHaveLength(2);
    expect(set.groups.every((g) => g.memberIds.length === 2)).toBe(true);
    expect(set.targetGroupCount).toBeNull();
  });

  it("makes n groups of roughly even size", () => {
    const set = generateRandomGroups({
      studentIds: ["a", "b", "c", "d", "e", "f"],
      sizeMode: "n_groups",
      targetGroupCount: 3,
      random: () => 0.3,
    });
    expect(set.groups).toHaveLength(3);
    expect(set.groups.flatMap((g) => g.memberIds).sort()).toEqual(
      ["a", "b", "c", "d", "e", "f"].sort(),
    );
    expect(set.targetGroupCount).toBe(3);
  });

  it("moves students and updates leaders", () => {
    let set = generateRandomGroups({
      studentIds: ["a", "b", "c", "d"],
      sizeMode: "pairs",
      random: () => 0,
    });
    const from = set.groups[0]!;
    const to = set.groups[1]!;
    const studentId = from.memberIds[0]!;
    set = moveStudentBetweenGroups(set, studentId, to.id);
    expect(set.groups.find((g) => g.id === to.id)?.memberIds).toContain(studentId);
    expect(set.groups.find((g) => g.id === from.id)?.memberIds).not.toContain(studentId);
  });

  it("respects locked groups on shuffle", () => {
    let set = generateRandomGroups({
      studentIds: ["a", "b", "c", "d"],
      sizeMode: "pairs",
      random: () => 0,
    });
    const lockedId = set.groups[0]!.id;
    const lockedMembers = [...set.groups[0]!.memberIds];
    set = toggleGroupLock(set, lockedId);
    set = shuffleUnlockedGroups(set, ["a", "b", "c", "d"], () => 0.9);
    expect(set.groups.find((g) => g.id === lockedId)?.memberIds).toEqual(lockedMembers);
  });

  it("saves and restores previous groups", () => {
    const first = generateRandomGroups({
      studentIds: ["a", "b", "c", "d"],
      sizeMode: "pairs",
      random: () => 0,
    });
    let set = saveCurrentAsPrevious(first);
    set = {
      ...generateRandomGroups({
        studentIds: ["a", "b", "c", "d"],
        sizeMode: "pairs",
        random: () => 0.99,
      }),
      previousGroups: set.previousGroups,
    };
    set = restorePreviousGroups(set);
    expect(set.groups.map((g) => g.memberIds.join(","))).toEqual(
      first.groups.map((g) => g.memberIds.join(",")),
    );
  });

  it("sets leader and maps to whiteboard payload", () => {
    let set = generateRandomGroups({
      studentIds: ["a", "b"],
      sizeMode: "pairs",
      random: () => 0,
    });
    const g = set.groups[0]!;
    set = setGroupLeader(set, g.id, g.memberIds[1] ?? g.memberIds[0]!);
    expect(toWhiteboardAssignPayload(set.groups)[0]?.memberIds).toEqual(g.memberIds);
    expect(createEmptyGroupSet().groups).toEqual([]);
  });
});
