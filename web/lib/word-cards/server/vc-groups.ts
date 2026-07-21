import "server-only";

import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import type { AssignWordCardsGroupsInput } from "@/lib/word-cards/group-membership";

/** Read VC session groupSet for word-cards launch auto-assign. */
export async function getVcSessionGroupsForWordCards(
  roomId: string,
): Promise<AssignWordCardsGroupsInput["groups"]> {
  const liveblocks = getLiveblocksServerClient();
  try {
    const storage = await liveblocks.getStorageDocument(roomId, "json");
    const runtime =
      (storage as { data?: { runtime?: Record<string, unknown> } })?.data?.runtime ??
      (storage as { runtime?: Record<string, unknown> }).runtime;
    const groupSet = runtime?.groupSet as
      | {
          groups?: {
            id?: string;
            name?: string;
            memberIds?: string[];
            leaderId?: string | null;
          }[];
        }
      | undefined;
    if (!groupSet?.groups?.length) return [];
    return groupSet.groups
      .filter((g) => g.id && Array.isArray(g.memberIds) && g.memberIds.length > 0)
      .map((g) => ({
        id: g.id as string,
        name: (g.name as string) || (g.id as string),
        memberIds: [...(g.memberIds as string[])],
        leaderId: (g.leaderId as string | null) ?? null,
      }));
  } catch {
    return [];
  }
}
