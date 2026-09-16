"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { focusCameraDistance } from "@/components/world/globe-config";
import type { GlobeFocus } from "@/components/world/look-at-hub";
import { worldCta } from "@/components/world/world-cta";
import { readLastHubId, writeLastHubId } from "@/components/world/world-session";
import {
  WORLD_ZONES,
  hubForZone,
  landmassById,
  selectionFromLandmass,
  type WorldSelection,
  type WorldZoneId,
} from "@/components/world/world-landmasses";

const WorldGlobe = dynamic(
  () =>
    import("@/components/world/WorldGlobe").then((module) => ({
      default: module.WorldGlobe,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-white/80">
        <p className="text-sm font-semibold">Loading globe…</p>
      </div>
    ),
  },
);

type Props = {
  signedIn: boolean;
};

export function WkeWorldGlobePilot({ signedIn }: Props) {
  const [selection, setSelection] = useState<WorldSelection | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<GlobeFocus | null>(null);

  const focusLandmass = useCallback((id: string, showCard = true) => {
    const landmass = landmassById(id);
    const next = selectionFromLandmass(id);
    if (!landmass || !next) return;
    if (showCard) setSelection(next);
    setFocusedId(id);
    writeLastHubId(id);
    setFocus({
      token: Date.now(),
      lat: landmass.lat,
      lon: landmass.lon,
      distance: focusCameraDistance(window.innerWidth),
    });
  }, []);

  useEffect(() => {
    const last = readLastHubId();
    focusLandmass(last ?? "home", Boolean(last));
  }, [focusLandmass]);

  const onGlobeSelect = useCallback(
    (next: WorldSelection | null) => {
      if (!next) {
        setSelection(null);
        return;
      }
      focusLandmass(next.landmassId);
    },
    [focusLandmass],
  );

  const zones = useMemo(
    () => Object.values(WORLD_ZONES).sort((a, b) => a.journeyOrder - b.journeyOrder),
    [],
  );
  const cta = selection ? worldCta(selection, signedIn) : null;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0b1220]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-white/90">WKE World</p>
          <p className="text-xs text-white/55">Tap a stop. The globe turns to face it.</p>
          <ol className="mt-2 flex flex-wrap gap-1.5">
            {zones.map((zone) => {
              const hub = hubForZone(zone.id as WorldZoneId);
              const active = focusedId === hub?.id || selection?.zone === zone.id;
              return (
                <li key={zone.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    className={`pointer-events-auto rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      active ? "bg-sky-400 text-slate-900" : "bg-white/12 text-white/85 hover:bg-white/20"
                    }`}
                    onClick={() => {
                      if (hub) focusLandmass(hub.id);
                    }}
                  >
                    {zone.journeyOrder} {zone.shortLabel}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <Link
          href="/pilots"
          className="pointer-events-auto rounded-md bg-white/12 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
        >
          Back to pilots
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

      <WorldGlobe
        focus={focus}
        focusedLandmassId={focusedId}
        onSelect={onGlobeSelect}
      />
    </div>
  );
}
