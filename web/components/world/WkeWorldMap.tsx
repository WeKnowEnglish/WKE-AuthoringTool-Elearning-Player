"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { detectWebGL } from "./detect-webgl";
import { MovePad } from "./play/MovePad";
import {
  HOME_NAV,
  homeSpotLabel,
  selectionFromLandmass,
  type HomeSpotId,
} from "./world-landmasses";
import { enterHref, enterLabel } from "@/lib/world/globe-walk";

const WorldGlobe = dynamic(
  () => import("./WorldGlobe").then((module) => ({ default: module.WorldGlobe })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-white/80">
        <p className="text-sm font-semibold">Loading map…</p>
      </div>
    ),
  },
);

export type WkeWorldMapProps = {
  studentKey: string;
  studentName: string | null;
  classTitle: string | null;
  spawnSpot?: HomeSpotId | null;
};

export function WkeWorldMap({ studentName, classTitle, spawnSpot = null }: WkeWorldMapProps) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [stick, setStick] = useState({ x: 0, z: 0 });
  const [nearSpot, setNearSpot] = useState<HomeSpotId | null>(null);
  const [jumpSpot, setJumpSpot] = useState<HomeSpotId | null>(spawnSpot);
  const [spawnKey, setSpawnKey] = useState(0);

  useEffect(() => {
    setWebgl(detectWebGL());
  }, []);

  const jumpTo = useCallback((spot: HomeSpotId) => {
    setJumpSpot(spot);
    setNearSpot(spot);
    setSpawnKey((key) => key + 1);
  }, []);

  const hello = studentName ? `Hi, ${studentName}.` : "This is your world.";
  const welcome = classTitle ? `${hello} ${classTitle} is your class.` : hello;
  const near = nearSpot ? selectionFromLandmass("home", nearSpot) : null;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0b1220]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-white/90">
            {nearSpot ? `At ${homeSpotLabel(nearSpot)}` : "Your world"}
          </p>
          <p className="text-xs text-white/55">
            {nearSpot
              ? "Walk up and go inside."
              : `${welcome} Walk to your house, school, or pet.`}
          </p>
          <ol className="mt-2 flex flex-wrap gap-1.5">
            {HOME_NAV.map((item) => {
              const active = jumpSpot === item.spot && nearSpot === item.spot;
              return (
                <li key={item.spot}>
                  <button
                    type="button"
                    aria-pressed={active}
                    className={`pointer-events-auto rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      active ? "bg-sky-400 text-slate-900" : "bg-white/12 text-white/85 hover:bg-white/20"
                    }`}
                    onClick={() => jumpTo(item.spot)}
                  >
                    {item.shortLabel}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <Link
          href="/primary"
          className="pointer-events-auto rounded-md bg-white/12 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
        >
          Back to class
        </Link>
      </div>

      {near && nearSpot ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-md rounded-xl bg-black/60 px-4 py-3 text-white shadow-lg backdrop-blur-sm">
            <p className="text-sm font-semibold">{near.label}</p>
            <p className="mt-1 text-xs text-white/70">{near.blurb}</p>
            <Link
              href={enterHref(nearSpot)}
              className="mt-3 inline-flex rounded-md bg-sky-400 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-sky-300"
            >
              {enterLabel(nearSpot)}
            </Link>
          </div>
        </div>
      ) : null}

      {webgl === false ? (
        <WorldMapFallback onPick={jumpTo} />
      ) : (
        <WorldGlobe
          walkMode
          spawnSpot={jumpSpot}
          spawnKey={spawnKey}
          stick={stick}
          focusedSpot={nearSpot}
          onNearSpot={setNearSpot}
        />
      )}

      {webgl === false ? null : <MovePad onChange={setStick} hintClassName="text-white/80" />}
    </div>
  );
}

function WorldMapFallback({ onPick }: { onPick: (spot: HomeSpotId) => void }) {
  return (
    <div className="flex h-full items-center justify-center px-4 pt-24 pb-28">
      <div className="grid w-full max-w-lg grid-cols-2 gap-3">
        {HOME_NAV.map((item) => (
          <Link
            key={item.spot}
            href={enterHref(item.spot)}
            onClick={() => onPick(item.spot)}
            className="rounded-2xl bg-white/10 px-4 py-6 text-left text-white hover:bg-white/16"
          >
            <p className="mt-1 text-lg font-bold">{item.shortLabel}</p>
            <p className="mt-1 text-xs opacity-75">{homeSpotLabel(item.spot)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
