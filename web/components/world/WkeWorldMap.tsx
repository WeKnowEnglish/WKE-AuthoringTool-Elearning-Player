"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { detectWebGL, prefersReducedMotion } from "./detect-webgl";
import { overviewCameraDistance } from "./globe-config";
import type { GlobeFocus } from "./look-at-hub";
import { placeOnLandmass } from "./place-on-land";
import { aimForSelection, areaDistanceForSelection } from "./world-aim";
import { worldCta } from "./world-cta";
import { writeLastHubId } from "./world-session";
import {
  HOME_NAV,
  homeSpotLabel,
  landmassById,
  selectionFromLandmass,
  type HomeSpotId,
  type WorldSelection,
} from "./world-landmasses";

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
};

function homeBlurb(studentName: string | null, classTitle: string | null): string {
  const hello = studentName ? `Hi, ${studentName}.` : "This is your world.";
  if (classTitle) return `${hello} ${classTitle} is your class.`;
  return `${hello} Class, stories, and games start from here.`;
}

function withIdentity(
  selection: WorldSelection,
  studentName: string | null,
  classTitle: string | null,
): WorldSelection {
  if (selection.zone !== "home" || selection.spot === "school" || selection.spot === "pet") return selection;
  return { ...selection, blurb: homeBlurb(studentName, classTitle) };
}

export function WkeWorldMap({ studentKey, studentName, classTitle }: WkeWorldMapProps) {
  const [selection, setSelection] = useState<WorldSelection | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [focusedSpot, setFocusedSpot] = useState<HomeSpotId | null>(null);
  const [focus, setFocus] = useState<GlobeFocus | null>(null);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const restoredRef = useRef(false);

  const aimLandmass = useCallback((id: string, distance: number) => {
    const landmass = landmassById(id);
    if (!landmass) return null;
    const pose = placeOnLandmass(landmass, landmass.focusX ?? 0, landmass.focusZ ?? 0);
    setFocus({
      token: Date.now(),
      lat: pose.lat,
      lon: pose.lon,
      distance,
      snap: prefersReducedMotion(),
    });
    return landmass;
  }, []);

  const showOverview = useCallback(() => {
    setFocusedId(null);
    setFocusedSpot(null);
    setSelection(null);
    aimLandmass("home", overviewCameraDistance(window.innerWidth));
  }, [aimLandmass]);

  const openPlace = useCallback(
    (next: WorldSelection) => {
      const id = next.landmassId;
      const arriving = focusedId !== id;
      const identified = withIdentity(next, studentName, classTitle);
      const pose = aimForSelection(identified);
      setSelection(identified);
      setFocusedId(id);
      setFocusedSpot(identified.spot ?? null);
      writeLastHubId(id, studentKey);
      setFocus({
        token: Date.now(),
        lat: pose.lat,
        lon: pose.lon,
        distance: areaDistanceForSelection(identified, window.innerWidth, arriving),
        snap: prefersReducedMotion(),
      });
    },
    [classTitle, focusedId, studentKey, studentName],
  );

  const focusSpot = useCallback(
    (spot: HomeSpotId) => {
      const next = selectionFromLandmass("home", spot);
      if (next) openPlace(next);
    },
    [openPlace],
  );

  useEffect(() => {
    setWebgl(detectWebGL());
  }, []);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    showOverview();
  }, [showOverview]);

  const onGlobeSelect = useCallback(
    (next: WorldSelection | null) => {
      if (!next) {
        showOverview();
        return;
      }
      openPlace(next);
    },
    [openPlace, showOverview],
  );

  const cta = selection ? worldCta(selection, true) : null;
  const place = focusedId ? landmassById(focusedId) : null;
  const atPlace = Boolean(place);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0b1220]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-white/90">
            {selection
              ? `At ${selection.label}`
              : focusedSpot
                ? `At ${homeSpotLabel(focusedSpot)}`
                : place
                  ? `At ${place.label}`
                  : "Whole map"}
          </p>
          <p className="text-xs text-white/55">
            {atPlace
              ? "Tap a building to walk there. Spin to look around."
              : studentName
                ? `Hi, ${studentName}. Tap a place to go there.`
                : "Tap a place to go there. Spin left or right to look around."}
          </p>
          <ol className="mt-2 flex flex-wrap gap-1.5">
            <li>
              <button
                type="button"
                aria-pressed={!focusedId}
                className={`pointer-events-auto rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  !focusedId ? "bg-sky-400 text-slate-900" : "bg-white/12 text-white/85 hover:bg-white/20"
                }`}
                onClick={showOverview}
              >
                Whole map
              </button>
            </li>
            {HOME_NAV.map((item) => {
              const active = focusedSpot === item.spot;
              return (
                <li key={item.spot}>
                  <button
                    type="button"
                    aria-pressed={active}
                    className={`pointer-events-auto rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      active ? "bg-sky-400 text-slate-900" : "bg-white/12 text-white/85 hover:bg-white/20"
                    }`}
                    onClick={() => focusSpot(item.spot)}
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

      {selection ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-4">
          <div className="pointer-events-auto w-full max-w-md rounded-xl bg-black/60 px-4 py-3 text-white shadow-lg backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{selection.label}</p>
                <p className="mt-1 text-xs text-white/70">{selection.blurb}</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => setSelection(null)}
              >
                Close
              </button>
            </div>
            {cta?.href ? (
              <Link
                href={cta.href}
                className="mt-3 inline-flex rounded-md bg-sky-400 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-sky-300"
              >
                {cta.label}
              </Link>
            ) : cta?.disabled ? (
              <p className="mt-3 text-xs font-semibold text-white/45">{cta.label}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {webgl === false ? (
        <WorldMapFallback focusedSpot={focusedSpot} onPick={focusSpot} />
      ) : (
        <WorldGlobe
          focus={focus}
          focusedLandmassId={focusedId}
          focusedSpot={focusedSpot}
          onSelect={onGlobeSelect}
        />
      )}
    </div>
  );
}

function WorldMapFallback({
  focusedSpot,
  onPick,
}: {
  focusedSpot: HomeSpotId | null;
  onPick: (spot: HomeSpotId) => void;
}) {
  return (
    <div className="flex h-full items-center justify-center px-4 pt-24 pb-28">
      <div className="grid w-full max-w-lg grid-cols-2 gap-3">
        {HOME_NAV.map((item) => {
          const active = focusedSpot === item.spot;
          return (
            <button
              key={item.spot}
              type="button"
              onClick={() => onPick(item.spot)}
              className={`rounded-2xl px-4 py-6 text-left ${
                active ? "bg-sky-400 text-slate-900" : "bg-white/10 text-white hover:bg-white/16"
              }`}
            >
              <p className="mt-1 text-lg font-bold">{item.shortLabel}</p>
              <p className="mt-1 text-xs opacity-75">{homeSpotLabel(item.spot)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
