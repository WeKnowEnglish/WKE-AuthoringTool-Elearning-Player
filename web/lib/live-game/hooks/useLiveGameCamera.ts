"use client";

import { useEffect, useState } from "react";
import type { MovementState } from "@/lib/live-game/engine/movement";
import {
  EXPLORE_SCENE_PLAYER_H,
  EXPLORE_SCENE_PLAYER_W,
} from "@/lib/live-game/engine/movement";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";

export type LiveGameCameraFrame = {
  tx: number;
  ty: number;
  displayW: number;
  displayH: number;
};

export function computeLiveGameCamera(
  map: LiveGameMapDef,
  position: MovementState,
  viewportW: number,
  viewportH: number,
  zoom: number,
): LiveGameCameraFrame {
  if (viewportW <= 0 || viewportH <= 0) {
    return { tx: 0, ty: 0, displayW: 0, displayH: 0 };
  }

  const aspect = map.widthPx / map.heightPx;
  const coverW = Math.max(viewportW, viewportH * aspect);
  const coverH = Math.max(viewportH, viewportW / aspect);
  const displayW = coverW * zoom;
  const displayH = coverH * zoom;

  const playerPx =
    ((position.x + EXPLORE_SCENE_PLAYER_W / 2) / map.widthPx) * coverW;
  const playerPy =
    ((position.y + EXPLORE_SCENE_PLAYER_H / 2) / map.heightPx) * coverH;

  let tx = viewportW / 2 - playerPx * zoom;
  let ty = viewportH / 2 - playerPy * zoom;
  tx = Math.min(0, Math.max(viewportW - displayW, tx));
  ty = Math.min(0, Math.max(viewportH - displayH, ty));

  return { tx, ty, displayW, displayH };
}

export function useViewportSize() {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const update = () => {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return size;
}

export function useLiveGameCamera(
  map: LiveGameMapDef,
  position: MovementState,
  zoom: number,
): LiveGameCameraFrame {
  const { w, h } = useViewportSize();
  return computeLiveGameCamera(map, position, w, h, zoom);
}
