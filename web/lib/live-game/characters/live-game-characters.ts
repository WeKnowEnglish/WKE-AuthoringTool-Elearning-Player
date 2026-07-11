/** Live Game player sprites — Characters Live Games pack (1254×1254). */

const CHARACTER_ASSET_BASE = "/assets/Characters%20Live%20Games";

export type LiveGameCharacterId =
  | "boy-1"
  | "boy-2"
  | "boy-3"
  | "boy-4"
  | "boy-5"
  | "girl-1"
  | "girl-2"
  | "girl-3"
  | "girl-4"
  | "girl-5";

export type LiveGameCharacterDef = {
  id: LiveGameCharacterId;
  label: string;
  group: "boy" | "girl";
  src: string;
  nativeWidthPx: number;
  nativeHeightPx: number;
  /** Logical map width — ~1 grass tile. */
  displayWidthPx: number;
};

function characterSrc(filename: string): string {
  return `${CHARACTER_ASSET_BASE}/${encodeURIComponent(filename)}`;
}

const NATIVE_SIZE_PX = 1254;
const DISPLAY_WIDTH_PX = 80;

function defineCharacter(
  id: LiveGameCharacterId,
  label: string,
  group: "boy" | "girl",
  filename: string,
): LiveGameCharacterDef {
  return {
    id,
    label,
    group,
    src: characterSrc(filename),
    nativeWidthPx: NATIVE_SIZE_PX,
    nativeHeightPx: NATIVE_SIZE_PX,
    displayWidthPx: DISPLAY_WIDTH_PX,
  };
}

export const LIVE_GAME_CHARACTERS = [
  defineCharacter("boy-1", "Boy 1", "boy", "boy 1.png"),
  defineCharacter("boy-2", "Boy 2", "boy", "boy 2.png"),
  defineCharacter("boy-3", "Boy 3", "boy", "boy 3.png"),
  defineCharacter("boy-4", "Boy 4", "boy", "boy 4.png"),
  defineCharacter("boy-5", "Boy 5", "boy", "boy 5.png"),
  defineCharacter("girl-1", "Girl 1", "girl", "girl 1.png"),
  defineCharacter("girl-2", "Girl 2", "girl", "girl 2.png"),
  defineCharacter("girl-3", "Girl 3", "girl", "girl 3.png"),
  defineCharacter("girl-4", "Girl 4", "girl", "girl 4.png"),
  defineCharacter("girl-5", "Girl 5", "girl", "girl 5.png"),
] as const satisfies readonly LiveGameCharacterDef[];

export const LIVE_GAME_DEFAULT_AVATAR_ID: LiveGameCharacterId = "boy-1";

const CHARACTER_BY_ID = Object.fromEntries(
  LIVE_GAME_CHARACTERS.map((character) => [character.id, character]),
) as Record<LiveGameCharacterId, LiveGameCharacterDef>;

const LEGACY_AVATAR_IDS: Record<string, LiveGameCharacterId> = {
  boy: "boy-1",
  default: "boy-1",
  student: "boy-1",
  teacher: "boy-1",
};

export function isLiveGameCharacterId(value: string): value is LiveGameCharacterId {
  return value in CHARACTER_BY_ID;
}

export function resolveLiveGameCharacter(avatarId?: string | null): LiveGameCharacterDef {
  if (!avatarId) return CHARACTER_BY_ID[LIVE_GAME_DEFAULT_AVATAR_ID];
  if (isLiveGameCharacterId(avatarId)) return CHARACTER_BY_ID[avatarId];
  const legacy = LEGACY_AVATAR_IDS[avatarId];
  if (legacy) return CHARACTER_BY_ID[legacy];
  return CHARACTER_BY_ID[LIVE_GAME_DEFAULT_AVATAR_ID];
}

export function liveGameCharacterDisplayHeightPx(
  displayWidthPx: number,
  character: Pick<LiveGameCharacterDef, "nativeWidthPx" | "nativeHeightPx"> = CHARACTER_BY_ID[
    LIVE_GAME_DEFAULT_AVATAR_ID
  ],
): number {
  return Math.round(displayWidthPx * (character.nativeHeightPx / character.nativeWidthPx));
}
