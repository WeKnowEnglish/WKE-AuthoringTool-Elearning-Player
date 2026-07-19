/**
 * Map shared teacher command vocabulary → whiteboard legacy command types.
 * Legacy names pass through unchanged.
 */

import type { ReviewTaskKind } from "@/lib/whiteboard/review-task";
import type { TeacherWhiteboardCommand } from "@/lib/whiteboard/server/commands";

/** Incoming commands may use shared names (OPEN, COLLECT, …) or legacy names. */
export type IncomingTeacherWhiteboardCommand =
  | TeacherWhiteboardCommand
  | { type: "OPEN" }
  | { type: "COLLECT" }
  | { type: "COMPLETE" }
  | { type: "CLEAR_SHOW" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | {
      type: "SHOW";
      boardId: string;
      anonymous: boolean;
      taskKind?: ReviewTaskKind;
      prompt?: string;
    }
  | {
      type: "COMPARE";
      boardIds: [string, string];
      anonymous: boolean;
      taskKind?: ReviewTaskKind;
      prompt?: string;
    }
  | {
      type: "RETURN";
      boardId: string;
      feedback?: string;
      note?: string;
    }
  | { type: "REVEAL_RESULTS" }
  | { type: "REVISE" };

export function normalizeTeacherWhiteboardCommand(
  raw: IncomingTeacherWhiteboardCommand,
): TeacherWhiteboardCommand {
  switch (raw.type) {
    case "OPEN":
      return { type: "OPEN_BOARDS" };
    case "COLLECT":
      return { type: "COLLECT_ALL" };
    case "COMPLETE":
      return { type: "END_ROUND" };
    case "CLEAR_SHOW":
      return { type: "CLEAR_DISPLAY" };
    case "PAUSE":
      return { type: "PAUSE_TIMER" };
    case "RESUME":
      return { type: "RESUME_TIMER" };
    case "SHOW":
      return {
        type: "DISPLAY_BOARD",
        boardId: raw.boardId,
        anonymous: raw.anonymous,
        taskKind: raw.taskKind,
        prompt: raw.prompt,
      };
    case "COMPARE":
      return {
        type: "COMPARE_BOARDS",
        boardIds: raw.boardIds,
        anonymous: raw.anonymous,
        taskKind: raw.taskKind,
        prompt: raw.prompt,
      };
    case "RETURN":
      return {
        type: "RETURN_BOARD",
        boardId: raw.boardId,
        feedback: raw.feedback ?? raw.note,
      };
    default:
      return raw;
  }
}
