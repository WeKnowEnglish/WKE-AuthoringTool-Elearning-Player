"use client";

import { memo, useEffect, useRef } from "react";
import { LiveGameMapCharacter } from "@/components/live-game/LiveGameMapCharacter";
import { interpolateToward } from "@/lib/live-game/engine/interpolation";
import {
  applyMapCharacterBox,
  computeMapCharacterBox,
} from "@/lib/live-game/engine/map-render";
import type { RemotePlayerState } from "@/lib/live-game/hooks/useRemotePlayers";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";

type Props = {
  map: LiveGameMapDef;
  players: RemotePlayerState[];
};

export function RemotePlayers({ map, players }: Props) {
  return (
    <>
      {players.map((player) => (
        <RemotePlayer
          key={player.connectionId}
          map={map}
          player={player}
        />
      ))}
    </>
  );
}

const RemotePlayer = memo(function RemotePlayer({
  map,
  player,
}: {
  map: LiveGameMapDef;
  player: RemotePlayerState;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef({ x: player.x, y: player.y });
  const targetRef = useRef({ x: player.x, y: player.y });

  useEffect(() => {
    targetRef.current = { x: player.x, y: player.y };
  }, [player.x, player.y]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const frame = (timestamp: number) => {
      const dtSec = Math.min(0.05, (timestamp - last) / 1000);
      last = timestamp;
      currentRef.current = interpolateToward(currentRef.current, targetRef.current, dtSec);
      applyMapCharacterBox(
        wrapperRef.current,
        computeMapCharacterBox(map, currentRef.current.x, currentRef.current.y, player.avatarId),
      );
      raf = requestAnimationFrame(frame);
    };

    applyMapCharacterBox(
      wrapperRef.current,
      computeMapCharacterBox(map, currentRef.current.x, currentRef.current.y, player.avatarId),
    );
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [map, player.avatarId]);

  return (
    <div ref={wrapperRef} className="pointer-events-none absolute z-30 will-change-[left,top]">
      <LiveGameMapCharacter
        map={map}
        x={0}
        y={0}
        avatarId={player.avatarId}
        direction={player.direction}
        isMoving={player.isMoving}
        label={player.name}
        imperativePosition
      />
    </div>
  );
});
