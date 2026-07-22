/**
 * Shared teacher / student control vocabulary for VirtualClassroom activities.
 * Activity-specific command payloads may differ; labels and meanings must not.
 */

export type SharedTeacherCommandType =
  | "OPEN"
  | "COLLECT"
  | "SHOW"
  | "COMPARE"
  | "CLEAR_SHOW"
  | "CLEAR_COMPARE"
  | "RETURN"
  | "REVISE"
  | "COMPLETE"
  | "PAUSE"
  | "RESUME"
  | "ADD_TIME"
  | "ENTER_REVIEW";

export type SharedStudentCommandType =
  | "SUBMIT"
  | "SUBMIT_REVIEW"
  | "SET_READY"
  | "SET_HELP";

/** Map whiteboard legacy command types → shared labels. */
export function teacherControlLabel(command: string): string {
  const map: Record<string, string> = {
    OPEN: "Open",
    OPEN_BOARDS: "Open",
    COLLECT: "Collect",
    COLLECT_ALL: "Collect",
    SHOW: "Show",
    DISPLAY_BOARD: "Show",
    CLEAR_SHOW: "Close show",
    CLEAR_DISPLAY: "Close show",
    COMPARE: "Compare",
    COMPARE_BOARDS: "Compare",
    CLEAR_COMPARE: "Close compare",
    RETURN: "Return",
    RETURN_BOARD: "Return",
    REVISE: "Revise",
    APPROVE_CARD: "Approve",
    EDIT_CARD: "Save edit",
    START_PLAY: "Start race",
    NEXT_PLAY_ITEM: "Next",
    LOCK_PLAY_ANSWERS: "Lock answers",
    REVEAL_PLAY_RESULTS: "Reveal",
    END_PLAY: "End play",
    COMPLETE: "Complete",
    END_ROUND: "Complete",
    REVEAL_RESULTS: "Reveal results",
    ENTER_REVIEW: "Class review",
    PAUSE: "Pause",
    PAUSE_TIMER: "Pause",
    RESUME: "Resume",
    RESUME_TIMER: "Resume",
    ADD_TIME: "Add time",
  };
  return map[command] ?? command;
}

/**
 * Semantics locked for all activities:
 * - Collect: stop editing, snapshot, enable Show/Compare — does not end round
 * - Complete: finalize round, clear VC activeActivity — does not end VC session
 */
export const ACTIVITY_COMMAND_SEMANTICS = {
  collect: "Stops editing, snapshots work, enables Show/Compare. Does not end the round.",
  complete: "Finalizes the activity round and returns students to Virtual Classroom. Does not end the session.",
  show: "Pushes one response to all students with a required review task.",
  compare: "Pushes 2–4 responses to all students with a required review task.",
  return: "Unlocks selected work with one short teacher note.",
  revise: "Starts revision stage with feedback/criteria visible.",
} as const;
