"use client";

import { memo } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";
import type { LiveGameResourceNodeState } from "@/lib/live-game/liveblocks/config";
import { ENGLISH_CRAFT_ART } from "@/lib/live-game/modes/english-craft/english-craft-art";
import {
  ENGLISH_CRAFT_OBJECTS_Z_BASE,
  ENGLISH_CRAFT_STRUCTURES_V1,
  ENGLISH_CRAFT_WOOD_TREES_V1,
} from "@/lib/live-game/modes/english-craft/map-objects-v1";

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
  bridgeCrafted?: boolean;
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

export const EnglishCraftObjectsLayer = memo(EnglishCraftObjectsLayerInner);

function EnglishCraftObjectsLayerInner({
  map,
  resourceNodes,
  bridgeCrafted = false,
  now,
}: Props) {
  const treeDisplayPx = 84;
  const stumpDisplayPx = 60;

  return (
    <div className="pointer-events-none absolute inset-0">
      {ENGLISH_CRAFT_STRUCTURES_V1.map((structure) => {
        let src = ENGLISH_CRAFT_ART.workbench;
        if (structure.kind === "bridge") {
          src = bridgeCrafted ? ENGLISH_CRAFT_ART.bridgeBuilt : ENGLISH_CRAFT_ART.bridgeUnbuilt;
        } else if (structure.kind === "flag") {
          src = ENGLISH_CRAFT_ART.flag;
        } else if (structure.kind === "log_storage") {
          src = ENGLISH_CRAFT_ART.logStorage;
        }

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

      {ENGLISH_CRAFT_WOOD_TREES_V1.map((tree) => {
        const node = resourceNodes[tree.id];
        const onCooldown = isNodeOnCooldown(node, now);
        const displayWidthPx = onCooldown ? stumpDisplayPx : treeDisplayPx;

        return (
          <MapSprite
            key={tree.id}
            map={map}
            x={tree.x}
            y={tree.y}
            displayWidthPx={displayWidthPx}
            stackRow={tree.row}
            src={onCooldown ? ENGLISH_CRAFT_ART.stump : ENGLISH_CRAFT_ART.tree}
            alt={onCooldown ? "Tree stump" : tree.label}
            className={onCooldown ? "opacity-90" : undefined}
          />
        );
      })}
    </div>
  );
}
