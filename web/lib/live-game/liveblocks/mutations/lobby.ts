"use client";

import { LiveObject } from "@liveblocks/client";
import { useMutation } from "@liveblocks/react/suspense";
import type { LiveGameAuthRole } from "@/lib/live-game/liveblocks/auth-policy";
import type {
  LiveGameLobbyNotice,
  LiveGameLobbyPlayer,
  LiveGameRoundEndReason,
  LiveGameSessionState,
} from "@/lib/live-game/liveblocks/config";
import { toLiveGameCharacterId, type LiveGameCharacterId } from "@/lib/live-game/characters/live-game-characters";
import {
  collectTakenLiveGameAvatarIds,
  isLiveGameAvatarTaken,
  resolveLiveGameAvatarForJoin,
} from "@/lib/live-game/characters/avatar-availability";
import {
  isUnlimitedEnglishCraftDuration,
  normalizeEnglishCraftDurationMinutes,
  type EnglishCraftSessionDuration,
} from "@/lib/live-game/modes/english-craft/config";
import {
  resetEnglishCraftGameplayState,
  resetEnglishCraftVictoryFields,
} from "@/lib/live-game/liveblocks/gameplay-reset";
import { canUseUnlimitedLiveGameDuration } from "@/lib/live-game/premium";
import { asLiveGameMutatorRoot } from "@/lib/live-game/server/mutator";

type LiveGamePlayersMap = {
  forEach: (callback: (player: { get: (key: "avatarId") => unknown }, id: string) => void) => void;
};

function readTakenAvatarsFromPlayersMap(
  players: LiveGamePlayersMap,
  excludePlayerId?: string,
): Set<LiveGameCharacterId> {
  const entries: { id: string; avatarId: string }[] = [];
  players.forEach((player, id) => {
    entries.push({ id, avatarId: player.get("avatarId") as string });
  });
  return collectTakenLiveGameAvatarIds(entries, excludePlayerId);
}

export function useJoinLiveGameLobbyMutation() {
  return useMutation(
    (
      { storage, self },
      input: {
        name: string;
        color: string;
        role: LiveGameAuthRole;
        avatarId: string;
      },
    ) => {
      const players = storage.get("players");
      if (!players) return;
      if (players.get(self.id)) return;

      const taken = readTakenAvatarsFromPlayersMap(players as unknown as LiveGamePlayersMap);
      const avatarId = resolveLiveGameAvatarForJoin(input.avatarId, taken);

      players.set(
        self.id,
        new LiveObject({
          name: input.name,
          color: input.color,
          role: input.role,
          isReady: input.role === "host",
          joinedAt: Date.now(),
          avatarId,
        }),
      );
    },
    [],
  );
}

export function useUpdateLiveGameAvatarMutation() {
  return useMutation(({ storage, self }, avatarId: string) => {
    const session = storage.get("session" as never) as LiveObject<LiveGameSessionState> | undefined;
    if (!session || session.get("phase") !== "lobby") return;

    const players = storage.get("players");
    if (!players) return;

    const player = players.get(self.id) as LiveObject<LiveGameLobbyPlayer> | undefined;
    if (!player) return;

    const resolved = toLiveGameCharacterId(avatarId);
    const taken = readTakenAvatarsFromPlayersMap(players as unknown as LiveGamePlayersMap, self.id);
    if (isLiveGameAvatarTaken(taken, resolved)) return;

    player.set("avatarId", resolved);
  }, []);
}

export function useUpdateSessionDurationMutation() {
  return useMutation(({ storage, self }, durationMinutes: EnglishCraftSessionDuration) => {
    const session = storage.get("session" as never) as LiveObject<LiveGameSessionState> | undefined;
    if (!session || session.get("phase") !== "lobby") return;

    const players = storage.get("players");
    const player = players?.get(self.id) as LiveObject<LiveGameLobbyPlayer> | undefined;
    if (player?.get("role") !== "host") return;

    if (isUnlimitedEnglishCraftDuration(durationMinutes)) {
      const hostUserId = session.get("hostUserId");
      if (!canUseUnlimitedLiveGameDuration(hostUserId)) return;
      session.set("durationMinutes", null);
      return;
    }

    session.set("durationMinutes", normalizeEnglishCraftDurationMinutes(durationMinutes));
  }, []);
}

function resetWorldForNewRound(storage: ReturnType<typeof asLiveGameMutatorRoot>) {
  resetEnglishCraftGameplayState(storage);
}

function applyReturnToLobbyState(
  session: LiveObject<LiveGameSessionState>,
  storage: ReturnType<typeof asLiveGameMutatorRoot>,
  lobbyNotice: LiveGameLobbyNotice | null = null,
) {
  session.set("phase", "lobby");
  session.set("endsAt", null);
  session.set("endedAt", null);
  session.set("endReason", null);
  session.set("lobbyNotice", lobbyNotice);
  resetEnglishCraftVictoryFields(session);
  resetWorldForNewRound(storage);
}

function resolvePlayingEndsAt(durationMinutes: number | null): number | null {
  if (durationMinutes == null) return null;
  return Date.now() + durationMinutes * 60 * 1000;
}

export function useStartLiveGameMutation() {
  return useMutation(({ storage }) => {
    const session = storage.get("session" as never) as LiveObject<LiveGameSessionState> | undefined;
    if (!session) return;
    const durationMinutes = session.get("durationMinutes");
    session.set("phase", "playing");
    session.set("lobbyNotice", null);
    session.set("endsAt", resolvePlayingEndsAt(durationMinutes));
    resetEnglishCraftVictoryFields(session);
    resetWorldForNewRound(asLiveGameMutatorRoot(storage as never));
  }, []);
}

export function useReturnToLobbyMutation() {
  return useMutation(({ storage }) => {
    const session = storage.get("session" as never) as LiveObject<LiveGameSessionState> | undefined;
    if (!session) return;
    applyReturnToLobbyState(session, asLiveGameMutatorRoot(storage as never), null);
  }, []);
}

export function useEndRoundAndReturnToLobbyMutation() {
  return useMutation(({ storage, self }, reason: LiveGameRoundEndReason) => {
    const session = storage.get("session" as never) as LiveObject<LiveGameSessionState> | undefined;
    if (!session || session.get("phase") !== "playing") return;

    if (reason === "host_ended_early") {
      const players = storage.get("players");
      const player = players?.get(self.id) as LiveObject<LiveGameLobbyPlayer> | undefined;
      if (player?.get("role") !== "host") return;
    }

    applyReturnToLobbyState(session, asLiveGameMutatorRoot(storage as never), {
      reason,
      at: Date.now(),
    });
  }, []);
}

export function useCloseLiveGameLobbyMutation() {
  return useMutation(({ storage, self }) => {
    const session = storage.get("session" as never) as LiveObject<LiveGameSessionState> | undefined;
    if (!session || session.get("phase") !== "lobby") return;

    const players = storage.get("players");
    const player = players?.get(self.id) as LiveObject<LiveGameLobbyPlayer> | undefined;
    if (player?.get("role") !== "host") return;

    session.set("phase", "ended");
    session.set("endsAt", null);
    session.set("endedAt", Date.now());
    session.set("endReason", "host_closed");
    session.set("lobbyNotice", null);
  }, []);
}
