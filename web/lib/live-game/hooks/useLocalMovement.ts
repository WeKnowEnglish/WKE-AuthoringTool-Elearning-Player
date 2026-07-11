"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useUpdateMyPresence } from "@liveblocks/react/suspense";
import type { LiveGamePresence, LiveGameDirection } from "@/lib/live-game/liveblocks/config";
import { LIVE_GAME_DEFAULT_AVATAR_ID } from "@/lib/live-game/characters/boy-character";
import {
  createMovementState,
  directionFromAxes,
  readKeyboardAxes,
  tickMovement,
  type MovementState,
} from "@/lib/live-game/engine/movement";
import {
  applyCameraFrame,
  applyLocalPlayerFrame,
} from "@/lib/live-game/engine/map-render";
import { computeLiveGameCamera } from "@/lib/live-game/hooks/useLiveGameCamera";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";

/** React state + grass stepping sample rate (~12 Hz). */
export const LIVE_GAME_STATE_COMMIT_MS = 80;
/** Liveblocks presence send rate (~12 Hz). */
export const LIVE_GAME_PRESENCE_INTERVAL_MS = 80;

type Options = {
  map: LiveGameMapDef;
  spawnIndex: number;
  enabled?: boolean;
  avatarId?: string;
  zoom: number;
  viewportW: number;
  viewportH: number;
  cameraRef: RefObject<HTMLDivElement | null>;
  localPlayerRef: RefObject<HTMLDivElement | null>;
};

export function useLocalMovement({
  map,
  spawnIndex,
  enabled = true,
  avatarId = LIVE_GAME_DEFAULT_AVATAR_ID,
  zoom,
  viewportW,
  viewportH,
  cameraRef,
  localPlayerRef,
}: Options) {
  const updatePresence = useUpdateMyPresence();
  const positionRef = useRef<MovementState>(createMovementState(map, spawnIndex));
  const facingRef = useRef<LiveGameDirection>("right");
  const isMovingRef = useRef(false);
  const keysRef = useRef<Set<string>>(new Set());
  const touchAxisRef = useRef({ axisX: 0, axisY: 0 });
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const lastStateCommitRef = useRef(0);
  const lastPresenceRef = useRef(0);
  const lastFacingStateRef = useRef<LiveGameDirection>("right");
  const lastMovingStateRef = useRef(false);

  const [sampledPosition, setSampledPosition] = useState<MovementState>(() =>
    createMovementState(map, spawnIndex),
  );
  const [facing, setFacing] = useState<LiveGameDirection>("right");
  const [isMoving, setIsMoving] = useState(false);

  const applyVisuals = useCallback(() => {
    const position = positionRef.current;
    const frame = computeLiveGameCamera(map, position, viewportW, viewportH, zoom);
    applyCameraFrame(cameraRef.current, frame);
    applyLocalPlayerFrame(localPlayerRef.current, map, position, avatarId);
  }, [avatarId, cameraRef, localPlayerRef, map, viewportH, viewportW, zoom]);

  const commitReactState = useCallback(
    (position: MovementState, nextFacing: LiveGameDirection, moving: boolean, force = false) => {
      const now = performance.now();
      const facingChanged = nextFacing !== lastFacingStateRef.current;
      const movingChanged = moving !== lastMovingStateRef.current;
      const due = now - lastStateCommitRef.current >= LIVE_GAME_STATE_COMMIT_MS;

      if (!force && !facingChanged && !movingChanged && !due) return;

      lastStateCommitRef.current = now;
      lastFacingStateRef.current = nextFacing;
      lastMovingStateRef.current = moving;
      setSampledPosition({ x: position.x, y: position.y });
      setFacing(nextFacing);
      setIsMoving(moving);
    },
    [],
  );

  const sendPresence = useCallback(
    (presence: LiveGamePresence, force = false) => {
      const now = performance.now();
      if (!force && now - lastPresenceRef.current < LIVE_GAME_PRESENCE_INTERVAL_MS) return;
      lastPresenceRef.current = now;
      updatePresence(presence as never);
    },
    [updatePresence],
  );

  useEffect(() => {
    const initial = createMovementState(map, spawnIndex);
    positionRef.current = initial;
    facingRef.current = "right";
    isMovingRef.current = false;
    commitReactState(initial, "right", false, true);
    applyVisuals();
  }, [applyVisuals, commitReactState, map.id, spawnIndex]);

  useEffect(() => {
    applyVisuals();
  }, [applyVisuals, viewportW, viewportH, zoom]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "a" ||
        e.key === "d" ||
        e.key === "w" ||
        e.key === "s" ||
        e.key === "A" ||
        e.key === "D" ||
        e.key === "W" ||
        e.key === "S"
      ) {
        e.preventDefault();
        keysRef.current.add(e.key);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [enabled]);

  const setTouchAxis = useCallback((axisX: number, axisY: number) => {
    touchAxisRef.current = { axisX, axisY };
  }, []);

  useEffect(() => {
    if (!enabled) {
      const current = positionRef.current;
      sendPresence(
        {
          x: current.x,
          y: current.y,
          direction: facingRef.current,
          isMoving: false,
          animation: "idle",
          avatarId,
        },
        true,
      );
      isMovingRef.current = false;
      commitReactState(current, facingRef.current, false, true);
      return;
    }

    const tick = (ts: number) => {
      const last = lastTsRef.current;
      lastTsRef.current = ts;
      const dtSec = last == null ? 0 : Math.min(0.05, (ts - last) / 1000);

      const keyboard = readKeyboardAxes(keysRef.current);
      const touch = touchAxisRef.current;
      const axisX = keyboard.axisX !== 0 ? keyboard.axisX : touch.axisX;
      const axisY = keyboard.axisY !== 0 ? keyboard.axisY : touch.axisY;

      if (dtSec > 0 && (axisX !== 0 || axisY !== 0)) {
        const next = tickMovement(map, positionRef.current, { axisX, axisY, dtSec });
        positionRef.current = next;

        const direction = directionFromAxes(axisX, axisY);
        const wasMoving = isMovingRef.current;
        facingRef.current = direction;
        isMovingRef.current = true;

        applyVisuals();
        commitReactState(next, direction, true, !wasMoving);
        sendPresence({
          x: next.x,
          y: next.y,
          direction,
          isMoving: true,
          animation: "walk",
          avatarId,
        });
      } else if (dtSec > 0) {
        const wasMoving = isMovingRef.current;
        if (wasMoving) {
          isMovingRef.current = false;
          const current = positionRef.current;
          commitReactState(current, facingRef.current, false, true);
          sendPresence(
            {
              x: current.x,
              y: current.y,
              direction: facingRef.current,
              isMoving: false,
              animation: "idle",
              avatarId,
            },
            true,
          );
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [
    applyVisuals,
    avatarId,
    commitReactState,
    enabled,
    map,
    sendPresence,
  ]);

  const getPosition = useCallback(() => positionRef.current, []);

  return {
    getPosition,
    sampledPosition,
    setTouchAxis,
    facing,
    isMoving,
  };
}
