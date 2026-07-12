"use client";

import { memo, useMemo } from "react";
import { EnglishCraftMapLayer } from "@/components/live-game/EnglishCraftMapLayer";
import { EnglishCraftObjectsLayer } from "@/components/live-game/EnglishCraftObjectsLayer";
import type { LiveGameCraftedItems, LiveGameResourceNodeState, LiveGameResourcePool } from "@/lib/live-game/liveblocks/config";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";
import { DEFAULT_LIVE_GAME_CRAFTED_ITEMS } from "@/lib/live-game/server/read-crafted-items";
import { EMPTY_LIVE_GAME_RESOURCE_POOL } from "@/lib/live-game/resource-pool";

type Props = {
  map: LiveGameMapDef;
  resourceNodes: Record<string, LiveGameResourceNodeState>;
  resourcePool?: LiveGameResourcePool;
  craftedItems: LiveGameCraftedItems;
  now: number;
};

function LiveGameMapStaticInner({ map, resourceNodes, resourcePool, craftedItems, now }: Props) {
  return (
    <div className="relative h-full w-full">
      <EnglishCraftMapLayer map={map} fillParent />
      <EnglishCraftObjectsLayer
        map={map}
        resourceNodes={resourceNodes}
        resourcePool={resourcePool}
        craftedItems={craftedItems}
        now={now}
      />
    </div>
  );
}

export const LiveGameMapStatic = memo(LiveGameMapStaticInner);

export function useLiveGameMapStaticProps(
  map: LiveGameMapDef,
  resourceNodes: Record<string, LiveGameResourceNodeState>,
  craftedItems: LiveGameCraftedItems,
  now: number,
  resourcePool: LiveGameResourcePool = EMPTY_LIVE_GAME_RESOURCE_POOL,
) {
  return useMemo(
    () => ({ map, resourceNodes, resourcePool, craftedItems, now }),
    [craftedItems, map, now, resourceNodes, resourcePool],
  );
}

export { DEFAULT_LIVE_GAME_CRAFTED_ITEMS };
