"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";
import { useMemo } from "react";

/**
 * Newest tab (latest presence connection for same user) is the active editor.
 * Older tabs become read-only.
 */
export function useWhiteboardActiveTab(): {
  isActiveTab: boolean;
  otherTabCount: number;
} {
  const self = useSelf();
  const others = useOthers();

  return useMemo(() => {
    const selfId = self?.id;
    const selfInstance =
      (self?.presence as { clientInstanceId?: string } | undefined)?.clientInstanceId ??
      "unknown";
    if (!selfId) return { isActiveTab: true, otherTabCount: 0 };

    const sameUser = others.filter((o) => o.id === selfId);
    const instances = [
      selfInstance,
      ...sameUser.map(
        (o) =>
          (o.presence as { clientInstanceId?: string } | undefined)?.clientInstanceId ??
          o.connectionId.toString(),
      ),
    ];
    // Lexicographic max approximates "newest" UUID / timestamp-ish ids; connectionId fallback for others.
    const newest = [...instances].sort().at(-1);
    const otherTabCount = sameUser.length;
    return {
      isActiveTab: newest === selfInstance || otherTabCount === 0,
      otherTabCount,
    };
  }, [self, others]);
}
