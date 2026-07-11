"use client";

import { LiveGameMapCharacter } from "@/components/live-game/LiveGameMapCharacter";
import { LIVE_GAME_DEFAULT_AVATAR_ID } from "@/lib/live-game/characters/boy-character";
import type { LiveGameDirection } from "@/lib/live-game/liveblocks/config";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";
import type { RefObject } from "react";

type Props = {
  map: LiveGameMapDef;
  displayName: string;
  avatarId?: string;
  facing?: LiveGameDirection;
  isMoving?: boolean;
  wrapperRef: RefObject<HTMLDivElement | null>;
};

export function LocalPlayer({
  map,
  displayName,
  avatarId = LIVE_GAME_DEFAULT_AVATAR_ID,
  facing = "right",
  isMoving = false,
  wrapperRef,
}: Props) {
  return (
    <div
      ref={wrapperRef}
      className="pointer-events-none absolute z-30 drop-shadow-[0_0_6px_rgba(255,255,255,0.85)]"
    >
      <LiveGameMapCharacter
        map={map}
        x={0}
        y={0}
        avatarId={avatarId}
        direction={facing}
        isMoving={isMoving}
        label={displayName}
        isLocal
        imperativePosition
      />
    </div>
  );
}
