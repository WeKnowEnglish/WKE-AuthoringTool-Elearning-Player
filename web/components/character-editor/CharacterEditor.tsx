"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { detectWebGL } from "@/components/world/detect-webgl";
import { DEFAULT_CHARACTER_CONFIG } from "@/lib/character/character-defaults";
import { randomCharacterConfig } from "@/lib/character/character-randomize";
import { loadCharacterConfig, saveCharacterConfig } from "@/lib/character/character-storage";
import type { CharacterCategory, CharacterConfig } from "@/lib/character/character-types";
import { PRIMARY_CHROME_CLASS, PRIMARY_CHROME_STYLE } from "@/lib/primary/primary-chrome";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";
import { CharacterCategoryTabs } from "./CharacterCategoryTabs";
import { CharacterFallback2D } from "./CharacterPreview";
import { CharacterControls } from "./CharacterControls";

const CharacterPreview = dynamic(
  () => import("./CharacterPreview").then((module) => ({ default: module.CharacterPreview })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm font-semibold text-[var(--pl-muted)]">
        Loading character…
      </div>
    ),
  },
);

export function CharacterEditor({ returnHref }: { returnHref?: string | null }) {
  const hydrated = useClientHydrated();
  const [config, setConfig] = useState<CharacterConfig>(DEFAULT_CHARACTER_CONFIG);
  const [category, setCategory] = useState<CharacterCategory>("hair");
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    const stored = loadCharacterConfig();
    if (stored) setConfig(stored);
    setWebgl(detectWebGL());
  }, [hydrated]);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 1600);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const controls = {
    config,
    category,
    saved,
    onCategoryChange: setCategory,
    onConfigChange: setConfig,
    onSave: () => {
      saveCharacterConfig(config);
      setSaved(true);
    },
    onReset: () => {
      setConfig(DEFAULT_CHARACTER_CONFIG);
      setSaved(false);
    },
    onRandomize: () => {
      setConfig(randomCharacterConfig());
      setSaved(false);
    },
  };

  return (
    <div className={`${PRIMARY_CHROME_CLASS} min-h-dvh bg-[var(--pl-bg)]`} style={PRIMARY_CHROME_STYLE}>
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-4 px-4 py-4 md:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--pl-purple)]">
              Character studio
            </p>
            <h1 className="text-2xl font-extrabold">Make your character</h1>
            <p className="text-sm text-[var(--pl-muted)]">
              Pick a face look, hair style, and clothes, then recolor. Hair, Face, and clothing tabs list every student option.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {returnHref ? (
              <Link
                href={returnHref}
                className="rounded-lg border-2 border-[var(--pl-border)] bg-amber-200 px-3 py-2 text-sm font-semibold text-[var(--pl-ink)]"
              >
                Back to house
              </Link>
            ) : null}
            <Link
              href={
                returnHref
                  ? `/primary/world/face?next=${encodeURIComponent(returnHref)}`
                  : "/pilots/character-kit"
              }
              className="rounded-lg border-2 border-[var(--pl-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--pl-ink)]"
            >
              Head kit
            </Link>
            {returnHref ? null : (
              <Link
                href="/pilots"
                className="rounded-lg border-2 border-[var(--pl-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--pl-ink)]"
              >
                Back to pilots
              </Link>
            )}
          </div>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[11rem_minmax(0,1fr)_22rem] lg:items-stretch">
          <aside className="hidden lg:block">
            <CharacterCategoryTabs value={category} onChange={setCategory} />
          </aside>
          <section className="min-h-[48svh] overflow-hidden rounded-2xl border-4 border-[var(--pl-ink)] bg-[#e8eefc] shadow-[4px_4px_0_0_#1e293b] lg:min-h-[36rem]">
            {webgl === false ? (
              <CharacterFallback2D config={config} />
            ) : (
              <CharacterPreview config={config} />
            )}
          </section>
          <aside className="flex min-h-0 flex-col gap-3">
            <div className="lg:hidden">
              <CharacterCategoryTabs value={category} onChange={setCategory} />
            </div>
            <CharacterControls {...controls} showTabs={false} />
          </aside>
        </div>
      </div>
    </div>
  );
}
