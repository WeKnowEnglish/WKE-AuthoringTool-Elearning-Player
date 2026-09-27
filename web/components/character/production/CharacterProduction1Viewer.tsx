"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { detectWebGL } from "@/components/world/detect-webgl";
import { KidButton } from "@/components/kid-ui/KidButton";
import { exportKitGroupToGlb } from "@/lib/character/kit/kit-export-glb";
import { downloadKitJson, downloadTextFile } from "@/lib/character/kit/kit-download";
import {
  CHARACTER_PRODUCTION_1_CONFIG,
  CHARACTER_PRODUCTION_1_KIT,
  CHARACTER_PRODUCTION_1_NAME,
} from "@/lib/character/production/character-production-1";
import { PRIMARY_CHROME_CLASS, PRIMARY_CHROME_STYLE } from "@/lib/primary/primary-chrome";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";
import { CharacterFallback2D } from "@/components/character-editor/CharacterPreview";

const CharacterProduction1Preview = dynamic(
  () => import("./CharacterProduction1Preview").then((module) => ({ default: module.CharacterProduction1Preview })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[32rem] h-full items-center justify-center text-sm font-semibold text-[var(--pl-muted)]">
        Loading production character…
      </div>
    ),
  },
);

export function CharacterProduction1Viewer() {
  const hydrated = useClientHydrated();
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const groupRef = useRef<Group>(null);

  useEffect(() => {
    if (!hydrated) return;
    setWebgl(detectWebGL());
  }, [hydrated]);

  return (
    <div className={`${PRIMARY_CHROME_CLASS} min-h-dvh bg-[var(--pl-bg)]`} style={PRIMARY_CHROME_STYLE}>
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-4 px-4 py-4 md:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--pl-purple)]">
              Production lock
            </p>
            <h1 className="text-2xl font-extrabold">{CHARACTER_PRODUCTION_1_NAME}</h1>
            <p className="max-w-xl text-sm text-[var(--pl-muted)]">
              Vinyl toy kid built only with the current kit lathe and rounded body parts. No
              reference photo. Spin the figure, then download the locked kit JSON or a full-body GLB.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/pilots/character-kit"
              className="rounded-lg border-2 border-[var(--pl-border)] bg-white px-3 py-2 text-sm font-semibold"
            >
              Head kit
            </Link>
            <Link
              href="/pilots"
              className="rounded-lg border-2 border-[var(--pl-border)] bg-white px-3 py-2 text-sm font-semibold"
            >
              Back to pilots
            </Link>
          </div>
        </header>

        <section className="relative min-h-[32rem] flex-1 overflow-hidden rounded-2xl border-4 border-[var(--pl-ink)] bg-[#e8eefc] shadow-[4px_4px_0_0_#1e293b] md:min-h-[40rem]">
          {webgl === false ? (
            <CharacterFallback2D config={CHARACTER_PRODUCTION_1_CONFIG} />
          ) : (
            <CharacterProduction1Preview groupRef={groupRef} />
          )}
        </section>

        <div className="flex flex-wrap gap-2 pb-6">
          <KidButton
            className="min-w-0 flex-1 px-4 text-base sm:flex-none"
            onClick={() => downloadKitJson(CHARACTER_PRODUCTION_1_KIT)}
          >
            Download kit JSON
          </KidButton>
          <KidButton
            variant="secondary"
            className="min-w-0 flex-1 px-4 text-base sm:flex-none"
            onClick={() =>
              downloadTextFile(
                "character-production-1.config.json",
                `${JSON.stringify(CHARACTER_PRODUCTION_1_CONFIG, null, 2)}\n`,
              )
            }
          >
            Download body JSON
          </KidButton>
          <KidButton
            variant="secondary"
            className="min-w-0 flex-1 px-4 text-base sm:flex-none"
            onClick={async () => {
              if (!groupRef.current) {
                setExportError("Preview is not ready to export.");
                return;
              }
              try {
                await exportKitGroupToGlb(groupRef.current, "character-production-1.glb");
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
      </div>
    </div>
  );
}
