import type { WhiteboardSessionContext } from "@/lib/whiteboard/liveblocks/identity";

/** A remembered board belongs to one activity and one signed-in participant. */
export function isCurrentClassBoardContext(
  context: WhiteboardSessionContext | null,
  joinCode: string | null,
  userId: string,
  role: "host" | "member",
): context is WhiteboardSessionContext {
  return Boolean(context && joinCode && context.sessionId === joinCode &&
    context.userId === userId && context.role === (role === "host" ? "host" : "player"));
}
