"use client";

import { LiveGameMapCharacter } from "@/components/live-game/LiveGameMapCharacter";
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
        <LiveGameMapCharacter
          key={player.connectionId}
          map={map}
          x={player.x}
          y={player.y}
          avatarId={player.avatarId}
          direction={player.direction}
          isMoving={player.isMoving}
          label={player.name}
        />
      ))}
    </>
  );
}
