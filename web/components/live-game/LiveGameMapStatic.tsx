"use client";

import { memo, useMemo } from "react";
import { EnglishCraftMapLayer } from "@/components/live-game/EnglishCraftMapLayer";
import { EnglishCraftObjectsLayer } from "@/components/live-game/EnglishCraftObjectsLayer";
import type { LiveGameResourceNodeState } from "@/lib/live-game/liveblocks/config";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";

type Props = {
  map: LiveGameMapDef;
  bouncingTiles: Record<string, number>;
  resourceNodes: Record<string, LiveGameResourceNodeState>;
  bridgeCrafted: boolean;
  now: number;
};

function LiveGameMapStaticInner({ map, bouncingTiles, resourceNodes, bridgeCrafted, now }: Props) {
  return (
    <div className="relative h-full w-full">
      <EnglishCraftMapLayer map={map} fillParent bouncingTiles={bouncingTiles} />
      <EnglishCraftObjectsLayer
        map={map}
        resourceNodes={resourceNodes}
        bridgeCrafted={bridgeCrafted}
        now={now}
      />
    </div>
  );
}

export const LiveGameMapStatic = memo(LiveGameMapStaticInner);

export function useLiveGameMapStaticProps(
  map: LiveGameMapDef,
  bouncingTiles: Record<string, number>,
  resourceNodes: Record<string, LiveGameResourceNodeState>,
  bridgeCrafted: boolean,
  now: number,
) {
  return useMemo(
    () => ({ map, bouncingTiles, resourceNodes, bridgeCrafted, now }),
    [bridgeCrafted, map, bouncingTiles, resourceNodes, now],
  );
}
