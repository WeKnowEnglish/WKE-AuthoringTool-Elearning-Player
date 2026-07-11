import {
  EXPLORE_SCENE_PLAYER_H,
  EXPLORE_SCENE_PLAYER_W,
} from "@/lib/live-game/engine/movement";
import type { MovementState } from "@/lib/live-game/engine/movement";
import {
  liveGameCharacterDisplayHeightPx,
  resolveLiveGameCharacter,
} from "@/lib/live-game/characters/live-game-characters";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";
import type { LiveGameCameraFrame } from "@/lib/live-game/hooks/useLiveGameCamera";

export type MapCharacterBox = {
  left: string;
  top: string;
  width: string;
  height: string;
};

export function computeMapCharacterBox(
  map: LiveGameMapDef,
  x: number,
  y: number,
  avatarId?: string | null,
): MapCharacterBox {
  const character = resolveLiveGameCharacter(avatarId);
  const displayW = character.displayWidthPx;
  const displayH = liveGameCharacterDisplayHeightPx(displayW, character);
  const footX = x + EXPLORE_SCENE_PLAYER_W / 2;
  const footY = y + EXPLORE_SCENE_PLAYER_H;

  return {
    left: `${((footX - displayW / 2) / map.widthPx) * 100}%`,
    top: `${((footY - displayH) / map.heightPx) * 100}%`,
    width: `${(displayW / map.widthPx) * 100}%`,
    height: `${(displayH / map.heightPx) * 100}%`,
  };
}

export function applyMapCharacterBox(el: HTMLElement | null, box: MapCharacterBox): void {
  if (!el) return;
  el.style.left = box.left;
  el.style.top = box.top;
  el.style.width = box.width;
  el.style.height = box.height;
}

export function applyCameraFrame(el: HTMLElement | null, frame: LiveGameCameraFrame): void {
  if (!el) return;
  el.style.width = `${frame.displayW}px`;
  el.style.height = `${frame.displayH}px`;
  el.style.transform = `translate(${frame.tx}px, ${frame.ty}px)`;
}

export function applyLocalPlayerFrame(
  el: HTMLElement | null,
  map: LiveGameMapDef,
  position: MovementState,
  avatarId?: string | null,
): void {
  applyMapCharacterBox(el, computeMapCharacterBox(map, position.x, position.y, avatarId));
}
