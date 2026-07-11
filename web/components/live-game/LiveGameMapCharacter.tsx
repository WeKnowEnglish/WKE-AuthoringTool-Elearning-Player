"use client";

import Image from "next/image";
import { clsx } from "clsx";
import {
  EXPLORE_SCENE_PLAYER_H,
  EXPLORE_SCENE_PLAYER_W,
} from "@/lib/live-game/engine/movement";
import {
  liveGameCharacterDisplayHeightPx,
  resolveLiveGameCharacter,
} from "@/lib/live-game/characters/live-game-characters";
import type { LiveGameDirection } from "@/lib/live-game/liveblocks/config";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";

function pctX(x: number, mapW: number): string {
  return `${(x / mapW) * 100}%`;
}

function pctY(y: number, mapH: number): string {
  return `${(y / mapH) * 100}%`;
}

function pctW(w: number, mapW: number): string {
  return `${(w / mapW) * 100}%`;
}

function pctH(h: number, mapH: number): string {
  return `${(h / mapH) * 100}%`;
}

type Props = {
  map: LiveGameMapDef;
  x: number;
  y: number;
  avatarId?: string | null;
  direction?: LiveGameDirection;
  isMoving?: boolean;
  label?: string;
  isLocal?: boolean;
  /** Parent wrapper handles absolute map positioning (60fps ref updates). */
  imperativePosition?: boolean;
};

export function LiveGameMapCharacter({
  map,
  x,
  y,
  avatarId,
  direction = "right",
  isMoving = false,
  label,
  isLocal,
  imperativePosition = false,
}: Props) {
  const { widthPx, heightPx } = map;
  const character = resolveLiveGameCharacter(avatarId);
  const displayW = character.displayWidthPx;
  const displayH = liveGameCharacterDisplayHeightPx(displayW, character);
  const footX = x + EXPLORE_SCENE_PLAYER_W / 2;
  const footY = y + EXPLORE_SCENE_PLAYER_H;
  const faceLeft = direction === "left";

  const positionStyle =
    imperativePosition ?
      { width: "100%", height: "100%" }
    : {
        left: pctX(footX - displayW / 2, widthPx),
        top: pctY(footY - displayH, heightPx),
        width: pctW(displayW, widthPx),
        height: pctH(displayH, heightPx),
      };

  return (
    <div
      className={clsx(
        imperativePosition ? "relative h-full w-full" : "pointer-events-none absolute z-30",
        !imperativePosition && isLocal && "drop-shadow-[0_0_6px_rgba(255,255,255,0.85)]",
      )}
      style={positionStyle}
      title={label}
    >
      <div
        className="relative h-full w-full"
        style={{
          transform: faceLeft ? "scaleX(-1)" : undefined,
          transformOrigin: "bottom center",
        }}
      >
        <div className={clsx("relative h-full w-full", isMoving && "live-game-character-walk")}>
          <Image
            src={character.src}
            alt={label ?? "Player"}
            fill
            className="object-contain object-bottom"
            sizes={`${displayW}px`}
            unoptimized
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
