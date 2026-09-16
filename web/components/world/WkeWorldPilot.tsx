"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { detectWebGL, prefersReducedMotion } from "./detect-webgl";
import { overviewCameraDistance } from "./globe-config";
import type { GlobePick } from "./GlobeControls";
import type { GlobeFocus } from "./look-at-hub";
import { placeOnLandmass } from "./place-on-land";
import { unwrapAuthoredOffset } from "./sphere-wrap";
import { aimForSelection, areaDistanceForSelection } from "./world-aim";
import {
  HOME_NAV,
  hubForZone,
  landmassById,
  selectionFromLandmass,
  type HomeSpotId,
  type WorldSelection,
} from "./world-landmasses";
import { WorldPlacementPanel } from "./WorldPlacementPanel";
import { useWorldPlacements } from "./WorldPlacementContext";

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

const CampusStudio = dynamic(
  () => import("./CampusStudio").then((module) => ({ default: module.CampusStudio })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-white/80">
        <p className="text-sm font-semibold">Loading studio…</p>
      </div>
    ),
  },
);

export function WkeWorldPilot() {
  const { placements, editMode, setEditMode, selectedId, setSelectedId, updatePlacement } = useWorldPlacements();
  const [selection, setSelection] = useState<WorldSelection | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [focusedSpot, setFocusedSpot] = useState<HomeSpotId | null>(null);
  const [focus, setFocus] = useState<GlobeFocus | null>(null);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [studioSpot, setStudioSpot] = useState<HomeSpotId | null>(null);
  const bootedRef = useRef(false);

  const aimLandmass = useCallback((id: string, distance: number) => {
    const landmass = landmassById(id);
    if (!landmass) return;
    const pose = placeOnLandmass(landmass, landmass.focusX ?? 0, landmass.focusZ ?? 0);
    setFocus({
      token: Date.now(),
      lat: pose.lat,
      lon: pose.lon,
      distance,
      snap: prefersReducedMotion(),
    });
  }, []);

  const showOverview = useCallback(() => {
    setFocusedId(null);
    setFocusedSpot(null);
    setSelection(null);
    setSelectedId(null);
    aimLandmass("home", overviewCameraDistance(window.innerWidth));
  }, [aimLandmass, setSelectedId]);

  const openPlace = useCallback(
    (next: WorldSelection) => {
      const hub = hubForZone(next.zone);
      const id = hub?.id ?? next.landmassId;
      const arriving = focusedId !== id;
      const pose = aimForSelection(next, placements);
      setSelection(next);
      setFocusedId(id);
      setFocusedSpot(next.spot ?? null);
      setFocus({
        token: Date.now(),
        lat: pose.lat,
        lon: pose.lon,
        distance: areaDistanceForSelection(next, window.innerWidth, arriving),
        snap: prefersReducedMotion(),
      });
    },
    [focusedId, placements],
  );

  const focusLandmass = useCallback(
    (id: string) => {
      const next = id === "home" ? selectionFromLandmass(id, "cottage") : selectionFromLandmass(id);
      if (next) openPlace(next);
    },
    [openPlace],
  );

  useEffect(() => {
    setWebgl(detectWebGL());
  }, []);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
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

  const onEditPick = useCallback(
    (placementId: string | null) => {
      setSelectedId(placementId);
      if (!placementId) return;
      const placement = placements.find((item) => item.id === placementId);
      const landmass = placement ? landmassById(placement.landmassId) : undefined;
      if (!placement || !landmass) return;
      const next = selectionFromLandmass(landmass.id, placement.spot) ?? selectionFromLandmass(landmass.id);
      if (!next) return;
      const pose = placeOnLandmass(landmass, placement.localX, placement.localZ);
      setFocusedId(landmass.id);
      setFocusedSpot(placement.spot ?? null);
      setSelection(next);
      setFocus({
        token: Date.now(),
        lat: pose.lat,
        lon: pose.lon,
        distance: areaDistanceForSelection(next, window.innerWidth, focusedId !== landmass.id),
        snap: prefersReducedMotion(),
      });
    },
    [focusedId, placements, setSelectedId],
  );

  const onEditMove = useCallback(
    (pick: GlobePick) => {
      if (!selectedId) return;
      const placement = placements.find((item) => item.id === selectedId);
      const landmass = landmassById(pick.landmassId);
      if (!placement || !landmass || placement.landmassId !== pick.landmassId) return;
      const local = unwrapAuthoredOffset(
        landmass.lat,
        landmass.lon,
        pick.lat,
        pick.lon,
        landmass.yaw,
        landmass.unitsToRadians,
      );
      updatePlacement(selectedId, { localX: local.localX, localZ: local.localZ });
    },
    [placements, selectedId, updatePlacement],
  );

  const openStudio = useCallback((spot: HomeSpotId) => {
    setStudioSpot(spot);
    setEditMode(false);
  }, [setEditMode]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0b1220]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-white/90">WKE World · Pilot</p>
          <p className="text-xs text-white/55">
            {studioSpot
              ? "Studio. Turn the component and edit its file."
              : editMode
                ? "Edit mode. Drag a building to place it."
                : "Grass planet. Open a studio to edit House, School, or Pet."}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={!studioSpot}
              className={`pointer-events-auto rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                !studioSpot ? "bg-sky-400 text-slate-900" : "bg-white/12 text-white/85 hover:bg-white/20"
              }`}
              onClick={() => {
                setStudioSpot(null);
                if (!focusedId) showOverview();
              }}
            >
              Map
            </button>
            {HOME_NAV.map((item) => (
              <button
                key={item.spot}
                type="button"
                aria-pressed={studioSpot === item.spot}
                className={`pointer-events-auto rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  studioSpot === item.spot ? "bg-amber-300 text-slate-900" : "bg-white/12 text-white/85 hover:bg-white/20"
                }`}
                onClick={() => openStudio(item.spot)}
              >
                {item.shortLabel}
              </button>
            ))}
            {studioSpot ? null : (
              <>
                <button
                  type="button"
                  aria-pressed={editMode}
                  className={`pointer-events-auto rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    editMode ? "bg-amber-300 text-slate-900" : "bg-white/12 text-white/85 hover:bg-white/20"
                  }`}
                  onClick={() => {
                    const next = !editMode;
                    setEditMode(next);
                    if (next && !focusedId) focusLandmass("home");
                  }}
                >
                  Edit
                </button>
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
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/primary/world"
            className="pointer-events-auto rounded-md bg-white/12 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
          >
            Student map
          </Link>
          <Link
            href="/pilots"
            className="pointer-events-auto rounded-md bg-white/12 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
          >
            Back to pilots
          </Link>
        </div>
      </div>

      {studioSpot || !editMode ? null : (
        <div className="pointer-events-none absolute top-24 right-4 z-10">
          <WorldPlacementPanel onChoose={onEditPick} />
        </div>
      )}
      {studioSpot || editMode || !selection ? null : (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-4">
          <div className="pointer-events-auto rounded-xl bg-black/60 px-4 py-3 text-white">
            <p className="text-sm font-semibold">{selection.label}</p>
            <p className="mt-1 text-xs text-white/70">{selection.blurb}</p>
            {selection.spot === "cottage" || selection.spot === "school" ? (
              <Link
                href={`/pilots/world/play/${selection.spot}`}
                className="mt-3 inline-flex rounded-md bg-sky-400 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-sky-300"
              >
                Walk around
              </Link>
            ) : null}
          </div>
        </div>
      )}

      {webgl === false ? (
        <div className="flex h-full items-center justify-center text-white">
          <p className="text-sm">This editor needs WebGL.</p>
        </div>
      ) : studioSpot ? (
        <CampusStudio spot={studioSpot} />
      ) : (
        <WorldGlobe
          focus={focus}
          focusedLandmassId={focusedId}
          focusedSpot={focusedSpot}
          editMode={editMode}
          selectedPlacementId={selectedId}
          onSelect={onGlobeSelect}
          onEditPick={onEditPick}
          onEditMove={onEditMove}
        />
      )}
    </div>
  );
}
