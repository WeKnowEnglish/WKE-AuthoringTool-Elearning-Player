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
  now: number;
};

function LiveGameMapStaticInner({ map, bouncingTiles, resourceNodes, now }: Props) {
  return (
    <div className="relative h-full w-full">
      <EnglishCraftMapLayer map={map} fillParent bouncingTiles={bouncingTiles} />
      <EnglishCraftObjectsLayer map={map} resourceNodes={resourceNodes} now={now} />
    </div>
  );
}

export const LiveGameMapStatic = memo(LiveGameMapStaticInner);

export function useLiveGameMapStaticProps(
  map: LiveGameMapDef,
  bouncingTiles: Record<string, number>,
  resourceNodes: Record<string, LiveGameResourceNodeState>,
  now: number,
) {
  return useMemo(
    () => ({ map, bouncingTiles, resourceNodes, now }),
    [map, bouncingTiles, resourceNodes, now],
  );
}
