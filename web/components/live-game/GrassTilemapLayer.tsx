"use client";

import { memo } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import { LIVE_GAME_GROUND_COLOR } from "@/lib/live-game/tiles/grass-tile-pack";

type Props = {
  className?: string;
};

export const GrassTilemapLayer = memo(GrassTilemapLayerInner);

function GrassTilemapLayerInner({ className }: Props) {
  return (
    <div
      className={clsx("absolute inset-0 overflow-hidden", className)}
      style={{ backgroundColor: LIVE_GAME_GROUND_COLOR }}
      aria-hidden
    >
      <Image
        src="/assets/live-game/english-craft-ground-v1.webp"
        alt=""
        fill
        className="object-fill"
        sizes="100vw"
        unoptimized
        draggable={false}
      />
    </div>
  );
}
