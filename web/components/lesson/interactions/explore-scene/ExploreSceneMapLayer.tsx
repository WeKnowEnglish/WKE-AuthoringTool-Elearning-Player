"use client";

import Image from "next/image";
import { clsx } from "clsx";
import type { ExploreSceneDefinition } from "@/lib/explore/scenes/types";
import type { ExploreSceneRunState } from "@/lib/explore/explore-scene-engine";
import {
  EXPLORE_SCENE_PLAYER_H,
  EXPLORE_SCENE_PLAYER_W,
} from "@/lib/explore/explore-scene-engine";

const ZONE_TINT: Record<string, string> = {
  living_room: "bg-violet-400/10",
  kitchen: "bg-amber-400/10",
  bedroom: "bg-sky-400/10",
};

function pctX(x: number, mapW: number): string {
  return `${(x / mapW) * 100}%`;
}

function pctY(y: number, mapH: number): string {
  return `${(y / mapH) * 100}%`;
}

function pctW(w: number, mapW: number): string {
  return `${(w / mapW) * 100}%`;
}

function pctH(h: number, mapH: number): string {
  return `${(h / mapH) * 100}%`;
}

type Props = {
  scene: ExploreSceneDefinition;
  state: ExploreSceneRunState;
  className?: string;
};

export function ExploreSceneMapLayer({ scene, state, className }: Props) {
  const { widthPx, heightPx, backgroundUrl } = scene.map;

  return (
    <div
      className={clsx(
        "relative mx-auto w-full max-w-4xl overflow-hidden rounded-xl border-4 border-kid-ink bg-slate-900 shadow-md",
        className,
      )}
      style={{ aspectRatio: `${widthPx} / ${heightPx}` }}
    >
      <Image
        src={backgroundUrl}
        alt=""
        fill
        className="object-cover"
        sizes="(max-width: 896px) 100vw, 896px"
        unoptimized
        priority
      />

      {scene.map.doorways?.map((door) => (
        <div
          key={`${door.label}-${door.x}-${door.y}`}
          className="pointer-events-none absolute z-[5] -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-emerald-800 bg-emerald-100/95 px-2 py-0.5 text-center text-[10px] font-extrabold text-emerald-950 shadow-sm sm:text-xs"
          style={{
            left: pctX(door.x, widthPx),
            top: pctY(door.y, heightPx),
          }}
        >
          {door.label}
        </div>
      ))}

      {scene.zones.map((zone) => (
        <div
          key={zone.id}
          className={clsx(
            "pointer-events-none absolute border border-dashed border-white/30",
            ZONE_TINT[zone.id] ?? "bg-white/5",
          )}
          style={{
            left: pctX(zone.bounds.x, widthPx),
            top: pctY(zone.bounds.y, heightPx),
            width: pctW(zone.bounds.w, widthPx),
            height: pctH(zone.bounds.h, heightPx),
          }}
          aria-hidden
        />
      ))}

      {scene.wordPickups.map((p) => {
        if (state.collectedPickupIds.includes(p.pickupId)) return null;
        return (
          <div
            key={p.pickupId}
            className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-violet-900 bg-violet-300 text-xs font-extrabold text-violet-950 shadow"
            style={{
              left: pctX(p.x, widthPx),
              top: pctY(p.y, heightPx),
            }}
            title={p.objectLabel}
          >
            {p.objectLabel.charAt(0)}
          </div>
        );
      })}

      {scene.materialPickups.map((p) => {
        if (state.collectedPickupIds.includes(p.pickupId)) return null;
        return (
          <div
            key={p.pickupId}
            className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border-2 border-amber-900 bg-amber-200 text-lg shadow"
            style={{
              left: pctX(p.x, widthPx),
              top: pctY(p.y, heightPx),
            }}
            title={p.label}
          >
            {p.materialId === "pencil" ? "✏️" : "📄"}
          </div>
        );
      })}

      <div
        className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-orange-900 bg-orange-300 text-lg shadow"
        style={{
          left: pctX(scene.brother.x, widthPx),
          top: pctY(scene.brother.y, heightPx),
          width: pctW(40, widthPx),
          height: pctH(40, heightPx),
        }}
        title="Brother"
      >
        <span aria-hidden>👦</span>
      </div>

      <div
        className="absolute z-10 rounded-sm border-2 border-kid-ink bg-sky-400 shadow-md"
        style={{
          left: pctX(state.playerX, widthPx),
          top: pctY(state.playerY, heightPx),
          width: pctW(EXPLORE_SCENE_PLAYER_W, widthPx),
          height: pctH(EXPLORE_SCENE_PLAYER_H, heightPx),
        }}
      />
    </div>
  );
}
