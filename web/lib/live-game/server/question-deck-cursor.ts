import "server-only";

import { LiveMap } from "@liveblocks/client";
import type { LiveGameQuestionBank } from "@/lib/live-game/question-banks/types";
import { liveGameQuestionDeckCursorKey } from "@/lib/live-game/question-deck";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import {
  asLiveGameMutatorRoot,
  readMutatorNumber,
  type LiveGameMutatorNode,
} from "@/lib/live-game/server/mutator";

export function readQuestionDeckCursor(
  cursors: Record<string, number> | null | undefined,
  playerId: string,
  bank: LiveGameQuestionBank,
): number {
  return Math.max(0, Math.floor(cursors?.[liveGameQuestionDeckCursorKey(playerId, bank)] ?? 0));
}

export async function advanceQuestionDeckCursor(input: {
  roomId: string;
  playerId: string;
  bank: LiveGameQuestionBank;
  cursor: number;
}): Promise<void> {
  const key = liveGameQuestionDeckCursorKey(input.playerId, input.bank);
  await getLiveblocksServerClient().mutateStorage(input.roomId, ({ root }) => {
    const storage = asLiveGameMutatorRoot(
      root as unknown as { get: (key: string) => unknown },
    );
    let cursors = storage.get("questionDeckCursors");
    if (!cursors) {
      cursors = new LiveMap<string, number>() as unknown as LiveGameMutatorNode;
      storage.set("questionDeckCursors", cursors);
    }
    const current = readMutatorNumber(cursors.get(key));
    cursors.set(key, Math.max(current, input.cursor + 1));
  });
}
