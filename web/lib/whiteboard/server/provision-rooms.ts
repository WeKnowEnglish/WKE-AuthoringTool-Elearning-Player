import "server-only";

import { LiveObject, toPlainLson, type PlainLsonObject } from "@liveblocks/client";
import { Liveblocks } from "@liveblocks/node";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { createWhiteboardInitialStorage } from "@/lib/whiteboard/liveblocks/initial-storage";
import {
  boardRoomId,
  controlRoomId,
  getWhiteboardRoomStrategy,
  type BoardScope,
} from "@/lib/whiteboard/rooms/strategy";

/** When large-class mode is on, create control + scoped board rooms (auth fan-out). */
export async function provisionLargeClassRooms(input: {
  sessionId: string;
  roundId: string;
  hostUserId: string;
  scopes: BoardScope[];
  prompt: { title: string; instructions: string };
}): Promise<{
  strategy: "single_room" | "per_board_rooms";
  controlRoomId: string | null;
  boardRoomIds: string[];
}> {
  const strategy = getWhiteboardRoomStrategy();
  if (strategy !== "per_board_rooms") {
    return { strategy, controlRoomId: null, boardRoomIds: [] };
  }

  const secret = assertLiveblocksSecret();
  const liveblocks = new Liveblocks({ secret });
  const ctrl = controlRoomId(input.sessionId, input.roundId);
  const boardRoomIds: string[] = [];

  await liveblocks.createRoom(ctrl, { defaultAccesses: [] }).catch(() => undefined);

  for (const scope of input.scopes) {
    const id = boardRoomId(input.sessionId, input.roundId, scope);
    boardRoomIds.push(id);
    await liveblocks.createRoom(id, { defaultAccesses: [] }).catch(() => undefined);
    const initial = createWhiteboardInitialStorage({
      hostUserId: input.hostUserId,
      joinCode: input.sessionId,
      roundId: input.roundId,
      prompt: input.prompt,
      productMode: true,
    });
    const root = new LiveObject(initial);
    const plain = toPlainLson(root) as PlainLsonObject;
    await liveblocks.initializeStorageDocument(id, plain).catch(() => undefined);
  }

  return { strategy, controlRoomId: ctrl, boardRoomIds };
}

export async function ensureStudentBoardRoom(input: {
  sessionId: string;
  roundId: string;
  hostUserId: string;
  studentId: string;
  prompt: { title: string; instructions: string };
}): Promise<string | null> {
  if (getWhiteboardRoomStrategy() !== "per_board_rooms") return null;
  const result = await provisionLargeClassRooms({
    sessionId: input.sessionId,
    roundId: input.roundId,
    hostUserId: input.hostUserId,
    scopes: [{ type: "student", studentId: input.studentId }],
    prompt: input.prompt,
  });
  return result.boardRoomIds[0] ?? null;
}
