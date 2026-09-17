"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { detectWebGL } from "@/components/world/detect-webgl";
import { KidButton } from "@/components/kid-ui/KidButton";
import { DEFAULT_CHARACTER_KIT } from "@/lib/character/kit/kit-defaults";
import { NO_REGION_HIGHLIGHTS, type RegionHighlightFlags } from "@/lib/character/kit/highlight-regions";
import { HEAD_PLATE_LABEL } from "@/lib/character/kit/head-plates";
import { downloadKitJson } from "@/lib/character/kit/kit-download";
import { exportKitGroupToGlb } from "@/lib/character/kit/kit-export-glb";
import { normalizeCharacterKit } from "@/lib/character/kit/kit-normalize";
import { loadCharacterKit, saveCharacterKit } from "@/lib/character/kit/kit-storage";
import { HEAD_PLATE_VIEWS, type CharacterKitDocument, type HeadPlateView } from "@/lib/character/kit/kit-types";
import type { Vec3 } from "@/lib/character/character-types";
import {
  createSculptStroke,
  DEFAULT_SCULPT_BRUSH,
  MAX_SCULPT_STROKES,
  type SculptBrush,
} from "@/lib/character/kit/sculpt-strokes";
import { PRIMARY_CHROME_CLASS, PRIMARY_CHROME_STYLE } from "@/lib/primary/primary-chrome";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";
import { CharacterKitFallback2D } from "./CharacterKitPreview";
import { CharacterKitForm } from "./CharacterKitForm";
import { CharacterKitJsonPanel } from "./CharacterKitJsonPanel";

const CharacterKitPreview = dynamic(
  () => import("./CharacterKitPreview").then((module) => ({ default: module.CharacterKitPreview })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm font-semibold text-[var(--pl-muted)]">
        Loading kit…
      </div>
    ),
  },
);

export function CharacterKitEditor({ returnHref }: { returnHref?: string | null }) {
  const hydrated = useClientHydrated();
  const [kit, setKit] = useState<CharacterKitDocument>(DEFAULT_CHARACTER_KIT);
  const [showHair, setShowHair] = useState(false);
  const [showPolygons, setShowPolygons] = useState(false);
  const [highlights, setHighlights] = useState<RegionHighlightFlags>(NO_REGION_HIGHLIGHTS);
  const [plateView, setPlateView] = useState<HeadPlateView>("front");
  const [showGhost, setShowGhost] = useState(false);
  const [ghostWireframe, setGhostWireframe] = useState(false);
  const [brush, setBrush] = useState<SculptBrush>(DEFAULT_SCULPT_BRUSH);
  const [lastHit, setLastHit] = useState<Vec3 | null>(null);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const groupRef = useRef<Group>(null);

  useEffect(() => {
    if (!hydrated) return;
    const stored = loadCharacterKit();
    if (stored) setKit(stored);
    setWebgl(detectWebGL());
  }, [hydrated]);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 1600);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const apply = (next: CharacterKitDocument) => {
    setKit(normalizeCharacterKit(next));
    setExportError(null);
  };

  const stamp = (origin: Vec3, normal: Vec3) => {
    setLastHit(origin);
    setKit((current) => {
      const strokes = current.sculpts ?? [];
      if (strokes.length >= MAX_SCULPT_STROKES) return current;
      return normalizeCharacterKit({
        ...current,
        sculpts: [...strokes, createSculptStroke({ ...brush, origin, normal })],
      });
    });
    setExportError(null);
  };

  const patchSculpts = (sculpts: CharacterKitDocument["sculpts"]) => {
    apply({ ...kit, sculpts });
  };

  return (
    <div
      className={`${PRIMARY_CHROME_CLASS} min-h-dvh bg-[var(--pl-bg)] md:h-dvh md:overflow-hidden`}
      style={PRIMARY_CHROME_STYLE}
    >
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-4 px-4 py-4 md:h-full md:min-h-0 md:px-6">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--pl-purple)]">
              Level 1 kit
            </p>
            <h1 className="text-2xl font-extrabold">Head kit authoring</h1>
            <p className="text-sm text-[var(--pl-muted)]">
              Design a vinyl toy skull: lock a view, click the mesh to stamp inflate / pinch / flatten.
              The seed ghost is vibe only. Students keep using the character editor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {returnHref ? (
              <Link
                href={returnHref}
                className="rounded-lg border-2 border-[var(--pl-border)] bg-amber-200 px-3 py-2 text-sm font-semibold"
              >
                Back to house
              </Link>
            ) : null}
            <Link
              href={
                returnHref
                  ? `/primary/world/outfit?next=${encodeURIComponent(returnHref)}`
                  : "/pilots/character-editor"
              }
              className="rounded-lg border-2 border-[var(--pl-border)] bg-white px-3 py-2 text-sm font-semibold"
            >
              Student editor
            </Link>
            {returnHref ? null : (
              <Link
                href="/pilots"
                className="rounded-lg border-2 border-[var(--pl-border)] bg-white px-3 py-2 text-sm font-semibold"
              >
                Back to pilots
              </Link>
            )}
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_22rem] md:overflow-hidden lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="relative min-h-[28rem] overflow-hidden rounded-2xl border-4 border-[var(--pl-ink)] bg-[#e8eefc] shadow-[4px_4px_0_0_#1e293b] md:sticky md:top-4 md:z-[1] md:h-full md:min-h-0 md:self-start">
            {webgl === false ? (
              <CharacterKitFallback2D kit={kit} />
            ) : (
              <CharacterKitPreview
                kit={kit}
                groupRef={groupRef}
                showHair={showHair}
                showPolygons={showPolygons}
                highlights={highlights}
                plateView={plateView}
                showGhost={showGhost}
                ghostWireframe={ghostWireframe}
                stampRadius={brush.radius}
                lastHit={lastHit}
                onStamp={stamp}
              />
            )}
            <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-2">
              {HEAD_PLATE_VIEWS.map((view) => (
                <button
                  key={view}
                  type="button"
                  className={`pointer-events-auto rounded-lg border-2 px-3 py-1 text-sm font-bold ${
                    plateView === view
                      ? "border-[var(--pl-ink)] bg-[var(--pl-yellow)]"
                      : "border-[var(--pl-border)] bg-white"
                  }`}
                  onClick={() => setPlateView(view)}
                >
                  {HEAD_PLATE_LABEL[view]}
                </button>
              ))}
            </div>
          </section>

          <aside className="flex min-h-0 flex-col gap-3 md:h-full md:overflow-hidden">
            <div className="flex shrink-0 flex-wrap gap-2">
              <KidButton
                className="min-w-0 flex-1 px-4 text-base"
                onClick={() => {
                  saveCharacterKit(kit);
                  setSaved(true);
                }}
              >
                {saved ? "Saved" : "Save kit"}
              </KidButton>
              <KidButton
                variant="secondary"
                className="min-w-0 flex-1 px-4 text-base"
                onClick={() => {
                  apply(DEFAULT_CHARACTER_KIT);
                  setSaved(false);
                }}
              >
                Reset
              </KidButton>
              <KidButton
                variant="secondary"
                className="min-w-0 flex-1 px-4 text-base"
                onClick={() => downloadKitJson(kit)}
              >
                Download JSON
              </KidButton>
              <KidButton
                variant="secondary"
                className="min-w-0 flex-1 px-4 text-base"
                onClick={async () => {
                  if (!groupRef.current) {
                    setExportError("Preview is not ready to export.");
                    return;
                  }
                  try {
                    await exportKitGroupToGlb(groupRef.current, `${kit.id || "kit"}.glb`);
                    setExportError(null);
                  } catch {
                    setExportError("Could not export GLB from this preview.");
                  }
                }}
              >
                Export GLB
              </KidButton>
            </div>
            {exportError ? <p className="text-xs font-semibold text-red-700">{exportError}</p> : null}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-6">
              <CharacterKitForm
                kit={kit}
                onChange={apply}
                showHair={showHair}
                onShowHairChange={setShowHair}
                showPolygons={showPolygons}
                onShowPolygonsChange={setShowPolygons}
                highlights={highlights}
                onHighlightsChange={setHighlights}
                plateView={plateView}
                onPlateViewChange={setPlateView}
                showGhost={showGhost}
                onShowGhostChange={setShowGhost}
                ghostWireframe={ghostWireframe}
                onGhostWireframeChange={setGhostWireframe}
                brush={brush}
                onBrushChange={setBrush}
                onUndoSculpt={() => {
                  patchSculpts((kit.sculpts ?? []).slice(0, -1));
                  setLastHit(null);
                }}
                onClearSculpts={() => {
                  patchSculpts([]);
                  setLastHit(null);
                }}
                onDeleteSculpt={(id) => patchSculpts((kit.sculpts ?? []).filter((stroke) => stroke.id !== id))}
              />
              <CharacterKitJsonPanel kit={kit} onApply={apply} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
