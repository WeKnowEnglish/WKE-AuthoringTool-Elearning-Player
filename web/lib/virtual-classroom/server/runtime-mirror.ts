import "server-only";

import type { ClassroomRuntimePatch } from "@/lib/classroom-realtime/types";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";

type RuntimeNode = {
  set: (key: string, value: unknown) => void;
};

/** Copies an already committed provider-neutral patch into the legacy room. */
export async function mirrorVcRuntimePatchToLiveblocks(input: {
  roomId: string;
  patch: ClassroomRuntimePatch;
}): Promise<boolean> {
  try {
    const liveblocks = getLiveblocksServerClient();
    await liveblocks.mutateStorage(input.roomId, ({ root }) => {
      const runtime = (root as { get: (key: string) => RuntimeNode }).get("runtime");
      for (const [key, value] of Object.entries(input.patch)) {
        if (key !== "tools") runtime.set(key, value);
      }
      for (const [key, value] of Object.entries(input.patch.tools ?? {})) {
        runtime.set(key, value);
      }
    });
    try {
      await liveblocks.broadcastEvent(input.roomId, {
        type: "TOOLS_UPDATED",
        command: "SUPABASE_AUTHORITY_MIRROR",
      });
    } catch {
      // Storage is the compatibility source; the wake-up event is best-effort.
    }
    return true;
  } catch {
    return false;
  }
}
