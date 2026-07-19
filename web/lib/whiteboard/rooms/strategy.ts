/**
 * Room strategy for whiteboard rounds.
 * Default: one Liveblocks room per round (P0/P1).
 * Large-class flag: control room + per-board rooms (activate later).
 */

export type BoardScope =
  | { type: "teacher" }
  | { type: "student"; studentId: string }
  | { type: "group"; groupId: string };

export type WhiteboardRoomStrategy = "single_room" | "per_board_rooms";

export function getWhiteboardRoomStrategy(): WhiteboardRoomStrategy {
  return process.env.WHITEBOARD_LARGE_CLASS_ROOMS === "true"
    ? "per_board_rooms"
    : "single_room";
}

export function controlRoomId(sessionId: string, roundId: string): string {
  return `wke-whiteboard-ctrl-${sessionId}-${shortId(roundId)}`;
}

export function boardRoomId(
  sessionId: string,
  roundId: string,
  scope: BoardScope,
): string {
  if (scope.type === "teacher") {
    return `wke-whiteboard-board-${sessionId}-${shortId(roundId)}-teacher`;
  }
  if (scope.type === "student") {
    return `wke-whiteboard-board-${sessionId}-${shortId(roundId)}-s-${shortId(scope.studentId)}`;
  }
  return `wke-whiteboard-board-${sessionId}-${shortId(roundId)}-g-${shortId(scope.groupId)}`;
}

/** Resolve which Liveblocks room holds board strokes for a scope. */
export function workspaceRoomId(input: {
  strategy: WhiteboardRoomStrategy;
  singleRoomId: string;
  sessionId: string;
  roundId: string;
  scope: BoardScope;
}): string {
  if (input.strategy === "single_room") return input.singleRoomId;
  return boardRoomId(input.sessionId, input.roundId, input.scope);
}

function shortId(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "x";
}
