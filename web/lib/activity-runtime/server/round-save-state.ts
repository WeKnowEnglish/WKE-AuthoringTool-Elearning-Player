import "server-only";

import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";

/** Clear only after durable metadata and any completion navigation are confirmed. */
export async function confirmRoundStateSaved(roomId: string): Promise<void> {
  await getLiveblocksServerClient().mutateStorage(roomId, ({ root }) => {
    const runtime = root.get("runtime") as { set: (key: string, value: unknown) => void };
    runtime.set("roundSavePending", false);
  });
}
