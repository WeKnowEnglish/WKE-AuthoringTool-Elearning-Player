import { describe, expect, it } from "vitest";
import {
  createCompareReviewTask,
  createShowReviewTask,
  readReviewFromRuntime,
  revealReviewTaskResults,
  reviewResponseCounts,
  setReviewTaskKind,
  studentFacingState,
  submitReviewResponse,
  syncReviewToRuntime,
  teacherControlLabel,
  toSharedReview,
} from "@/lib/whiteboard/review-task";

describe("review task", () => {
  it("creates show task with notice default", () => {
    const task = createShowReviewTask({ boardId: "board:student:a", anonymous: true });
    expect(task.mode).toBe("show");
    expect(task.taskKind).toBe("notice");
    expect(task.boardIds).toEqual(["board:student:a"]);
    expect(task.anonymous).toBe(true);
  });

  it("creates compare task with vote default", () => {
    const task = createCompareReviewTask({
      boardIds: ["board:student:a", "board:student:b"],
      anonymous: true,
    });
    expect(task.taskKind).toBe("vote_board");
    expect(task.boardIds).toHaveLength(2);
  });

  it("submits note responses and vote choices", () => {
    let task = createShowReviewTask({ boardId: "b1", anonymous: false });
    task = submitReviewResponse(task, {
      studentId: "u1",
      note: "Nice colours",
      nowMs: 1,
    });
    expect(task.responsesByStudentId.u1?.note).toBe("Nice colours");

    task = createCompareReviewTask({
      boardIds: ["b1", "b2"],
      anonymous: true,
    });
    task = submitReviewResponse(task, {
      studentId: "u2",
      choice: "b2",
      nowMs: 2,
    });
    expect(reviewResponseCounts(task).byChoice.b2).toBe(1);
  });

  it("rejects invalid vote and empty notes", () => {
    const compare = createCompareReviewTask({
      boardIds: ["b1", "b2"],
      anonymous: false,
    });
    expect(() =>
      submitReviewResponse(compare, { studentId: "u1", choice: "b9" }),
    ).toThrow(/Choose one/);

    const show = createShowReviewTask({ boardId: "b1", anonymous: false });
    expect(() =>
      submitReviewResponse(show, { studentId: "u1", note: "x" }),
    ).toThrow(/short response/);
  });

  it("changes task kind and clears responses", () => {
    let task = createCompareReviewTask({
      boardIds: ["b1", "b2"],
      anonymous: true,
    });
    task = submitReviewResponse(task, { studentId: "u1", choice: "b1", nowMs: 1 });
    task = setReviewTaskKind(task, "find_difference");
    expect(task.taskKind).toBe("find_difference");
    expect(Object.keys(task.responsesByStudentId)).toHaveLength(0);
  });
});

describe("student facing state labels", () => {
  it("maps phases and board status", () => {
    expect(
      studentFacingState({ phase: "WAITING", boardStatus: "WAITING", hasReviewPush: false }),
    ).toBe("Waiting");
    expect(
      studentFacingState({ phase: "OPEN", boardStatus: "ACTIVE", hasReviewPush: false }),
    ).toBe("Active");
    expect(
      studentFacingState({
        phase: "OPEN",
        boardStatus: "SUBMITTED",
        hasReviewPush: false,
      }),
    ).toBe("Submitted");
    expect(
      studentFacingState({
        phase: "OPEN",
        boardStatus: "SUBMITTED",
        hasReviewPush: true,
      }),
    ).toBe("Class review");
    expect(
      studentFacingState({
        phase: "REVIEW",
        boardStatus: "SUBMITTED",
        hasReviewPush: false,
      }),
    ).toBe("Class review");
    expect(
      studentFacingState({
        phase: "OPEN",
        boardStatus: "RETURNED",
        hasReviewPush: false,
      }),
    ).toBe("Revision");
    expect(
      studentFacingState({ phase: "ENDED", boardStatus: null, hasReviewPush: false }),
    ).toBe("Completed");
  });

  it("maps teacher control labels", () => {
    expect(teacherControlLabel("COLLECT_ALL")).toBe("Collect");
    expect(teacherControlLabel("DISPLAY_BOARD")).toBe("Show");
    expect(teacherControlLabel("END_ROUND")).toBe("Complete");
    expect(teacherControlLabel("REVEAL_RESULTS")).toBe("Reveal results");
  });
});

describe("whiteboard review storage dual-write (WB-2)", () => {
  it("syncs shared review + legacy fields", () => {
    const store: Record<string, unknown> = {};
    const runtime = {
      get: (k: string) => store[k],
      set: (k: string, v: unknown) => {
        store[k] = v;
      },
    };
    const task = createShowReviewTask({
      boardId: "board:student:a",
      anonymous: false,
    });
    syncReviewToRuntime(runtime, task);
    expect(store.displayBoardId).toBe("board:student:a");
    expect(store.reviewTask).toBeTruthy();
    expect((store.review as { targetIds: string[] }).targetIds).toEqual([
      "board:student:a",
    ]);
    expect(readReviewFromRuntime(runtime)?.boardIds).toEqual(["board:student:a"]);
  });

  it("prefers runtime.review over legacy reviewTask", () => {
    const show = createShowReviewTask({ boardId: "board:student:new", anonymous: true });
    const legacy = createShowReviewTask({ boardId: "board:student:old", anonymous: true });
    const runtime = {
      get: (k: string) => {
        if (k === "review") return toSharedReview(show);
        if (k === "reviewTask") return legacy;
        return null;
      },
      set: () => undefined,
    };
    expect(readReviewFromRuntime(runtime)?.boardIds).toEqual(["board:student:new"]);
  });

  it("reveals results status", () => {
    let task = createCompareReviewTask({
      boardIds: ["b1", "b2"],
      anonymous: true,
    });
    task = submitReviewResponse(task, { studentId: "u1", choice: "b1", nowMs: 1 });
    expect(task.status ?? "open").toBe("open");
    task = revealReviewTaskResults(task);
    expect(task.status).toBe("results");
  });

  it("clears all review fields on sync null", () => {
    const store: Record<string, unknown> = {
      displayBoardId: "x",
      reviewTask: {},
      review: {},
      compareBoardIds: ["a", "b"],
    };
    const runtime = {
      get: (k: string) => store[k],
      set: (k: string, v: unknown) => {
        store[k] = v;
      },
    };
    syncReviewToRuntime(runtime, null);
    expect(store.review).toBeNull();
    expect(store.reviewTask).toBeNull();
    expect(store.displayBoardId).toBeNull();
    expect(store.compareBoardIds).toBeNull();
  });
});
