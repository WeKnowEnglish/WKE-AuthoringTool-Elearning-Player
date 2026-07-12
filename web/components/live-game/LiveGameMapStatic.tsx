"use client";

import { memo, useMemo } from "react";
import { EnglishCraftMapLayer } from "@/components/live-game/EnglishCraftMapLayer";
import { EnglishCraftObjectsLayer } from "@/components/live-game/EnglishCraftObjectsLayer";
import type { LiveGameResourceNodeState } from "@/lib/live-game/liveblocks/config";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";

type Props = {
  map: LiveGameMapDef;
  resourceNodes: Record<string, LiveGameResourceNodeState>;
  bridgeCrafted: boolean;
  now: number;
};

function LiveGameMapStaticInner({ map, resourceNodes, bridgeCrafted, now }: Props) {
  return (
    <div className="relative h-full w-full">
      <EnglishCraftMapLayer map={map} fillParent />
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
  resourceNodes: Record<string, LiveGameResourceNodeState>,
  bridgeCrafted: boolean,
  now: number,
) {
  return useMemo(
    () => ({ map, resourceNodes, bridgeCrafted, now }),
    [bridgeCrafted, map, resourceNodes, now],
  );
}
