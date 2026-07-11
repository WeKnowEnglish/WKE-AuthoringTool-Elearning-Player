import {
  LIVE_GAME_CHARACTERS,
  LIVE_GAME_DEFAULT_AVATAR_ID,
  toLiveGameCharacterId,
  type LiveGameCharacterId,
} from "@/lib/live-game/characters/live-game-characters";

export function collectTakenLiveGameAvatarIds(
  entries: Iterable<{ id: string; avatarId: string }>,
  excludePlayerId?: string,
): Set<LiveGameCharacterId> {
  const taken = new Set<LiveGameCharacterId>();
  for (const entry of entries) {
    if (excludePlayerId && entry.id === excludePlayerId) continue;
    taken.add(toLiveGameCharacterId(entry.avatarId));
  }
  return taken;
}

export function isLiveGameAvatarTaken(
  takenIds: ReadonlySet<LiveGameCharacterId>,
  avatarId: LiveGameCharacterId,
): boolean {
  return takenIds.has(avatarId);
}

export function pickFirstAvailableLiveGameAvatarId(
  takenIds: ReadonlySet<LiveGameCharacterId>,
): LiveGameCharacterId {
  for (const character of LIVE_GAME_CHARACTERS) {
    if (!takenIds.has(character.id)) return character.id;
  }
  return LIVE_GAME_DEFAULT_AVATAR_ID;
}

export function resolveLiveGameAvatarForJoin(
  requestedAvatarId: string,
  takenIds: ReadonlySet<LiveGameCharacterId>,
): LiveGameCharacterId {
  const resolved = toLiveGameCharacterId(requestedAvatarId);
  if (!takenIds.has(resolved)) return resolved;
  return pickFirstAvailableLiveGameAvatarId(takenIds);
}
