"use client";

import { memo } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import type { LiveGameCraftedItems, LiveGameResourceNodeState, LiveGameResourcePool } from "@/lib/live-game/liveblocks/config";
import {
  ENGLISH_CRAFT_ART,
  resolveResourceNodeArt,
  resolveStorageArt,
  type EnglishCraftResourceType,
} from "@/lib/live-game/modes/english-craft/english-craft-art";
import {
  ENGLISH_CRAFT_DOCK_V1,
  ENGLISH_CRAFT_OBJECTS_Z_BASE,
  ENGLISH_CRAFT_RESOURCE_NODES_V1,
  ENGLISH_CRAFT_STRUCTURES_V1,
  type EnglishCraftStructureKind,
} from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { DEFAULT_LIVE_GAME_CRAFTED_ITEMS } from "@/lib/live-game/server/read-crafted-items";
import { EMPTY_LIVE_GAME_RESOURCE_POOL, resolveStorageFillLevel } from "@/lib/live-game/resource-pool";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";

function pctX(x: number, mapW: number): string {
  return `${(x / mapW) * 100}%`;
}

function pctY(y: number, mapH: number): string {
  return `${(y / mapH) * 100}%`;
}

function objectZIndex(stackRow: number): number {
  return ENGLISH_CRAFT_OBJECTS_Z_BASE + stackRow;
}

type Props = {
  map: LiveGameMapDef;
  resourceNodes: Record<string, LiveGameResourceNodeState>;
  resourcePool?: LiveGameResourcePool;
  craftedItems?: LiveGameCraftedItems;
  now?: number;
};

function isNodeOnCooldown(node: LiveGameResourceNodeState | undefined, now = Date.now()) {
  if (!node) return false;
  return node.cooldownEndsAt != null && node.cooldownEndsAt > now;
}

type MapSpriteProps = {
  map: LiveGameMapDef;
  x: number;
  y: number;
  displayWidthPx: number;
  stackRow: number;
  src: string;
  alt: string;
  className?: string;
};

function MapSprite({ map, x, y, displayWidthPx, stackRow, src, alt, className }: MapSpriteProps) {
  const { widthPx, heightPx } = map;
  const displayHeightPx = displayWidthPx;

  return (
    <div
      className={clsx("pointer-events-none absolute -translate-x-1/2", className)}
      style={{
        left: pctX(x, widthPx),
        top: pctY(y - displayHeightPx, heightPx),
        width: `${(displayWidthPx / widthPx) * 100}%`,
        height: `${(displayHeightPx / heightPx) * 100}%`,
        zIndex: objectZIndex(stackRow),
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain object-bottom"
        sizes={`${displayWidthPx}px`}
        draggable={false}
      />
    </div>
  );
}

function structureArt(
  kind: EnglishCraftStructureKind,
  crafted: LiveGameCraftedItems,
  resourceType: EnglishCraftResourceType | undefined,
  pool: LiveGameResourcePool,
): string | null {
  switch (kind) {
    case "bridge":
      return crafted.bridge ? ENGLISH_CRAFT_ART.bridgeBuilt : ENGLISH_CRAFT_ART.bridgeUnbuilt;
    case "flag":
      return ENGLISH_CRAFT_ART.flag;
    case "workbench":
      return crafted.benchBuilt ? ENGLISH_CRAFT_ART.workbench : ENGLISH_CRAFT_ART.workbenchRubble;
    case "dock":
      return null;
    case "log_storage":
      return resolveStorageArt("wood", resolveStorageFillLevel(pool.wood));
    case "stone_storage":
      return resolveStorageArt("stone", resolveStorageFillLevel(pool.stone));
    case "wheat_storage":
      return resolveStorageArt("wheat", resolveStorageFillLevel(pool.wheat));
    case "cotton_storage":
      return resolveStorageArt("cotton", resolveStorageFillLevel(pool.cotton));
    default:
      if (resourceType) {
        return resolveStorageArt(resourceType, resolveStorageFillLevel(pool[resourceType]));
      }
      return ENGLISH_CRAFT_ART.workbench;
  }
}

const NODE_DISPLAY_PX: Record<EnglishCraftResourceType, { available: number; depleted: number }> = {
  wood: { available: 84, depleted: 60 },
  stone: { available: 80, depleted: 64 },
  wheat: { available: 76, depleted: 60 },
  cotton: { available: 76, depleted: 60 },
};

export const EnglishCraftObjectsLayer = memo(EnglishCraftObjectsLayerInner);

function EnglishCraftObjectsLayerInner({
  map,
  resourceNodes,
  resourcePool = EMPTY_LIVE_GAME_RESOURCE_POOL,
  craftedItems = DEFAULT_LIVE_GAME_CRAFTED_ITEMS,
  now,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {ENGLISH_CRAFT_STRUCTURES_V1.map((structure) => {
        const src = structureArt(structure.kind, craftedItems, structure.resourceType, resourcePool);
        if (!src) return null;
        return (
          <MapSprite
            key={structure.id}
            map={map}
            x={structure.x}
            y={structure.y}
            displayWidthPx={structure.displayWidthPx}
            stackRow={structure.row}
            src={src}
            alt={structure.label}
          />
        );
      })}

      {craftedItems.boat ?
        <MapSprite
          key="boat-at-dock"
          map={map}
          x={ENGLISH_CRAFT_DOCK_V1.x}
          y={ENGLISH_CRAFT_DOCK_V1.y}
          displayWidthPx={ENGLISH_CRAFT_DOCK_V1.displayWidthPx}
          stackRow={ENGLISH_CRAFT_DOCK_V1.row}
          src={ENGLISH_CRAFT_ART.boat}
          alt="Escape boat"
        />
      : null}

      {ENGLISH_CRAFT_RESOURCE_NODES_V1.map((node) => {
        const nodeState = resourceNodes[node.id];
        const onCooldown = isNodeOnCooldown(nodeState, now);
        const sizes = NODE_DISPLAY_PX[node.resourceType];
        const displayWidthPx = onCooldown ? sizes.depleted : sizes.available;

        return (
          <MapSprite
            key={node.id}
            map={map}
            x={node.x}
            y={node.y}
            displayWidthPx={displayWidthPx}
            stackRow={node.row}
            src={resolveResourceNodeArt(node.resourceType, onCooldown)}
            alt={onCooldown ? `${node.label} (resting)` : node.label}
            className={onCooldown ? "opacity-90" : undefined}
          />
        );
      })}
    </div>
  );
}
