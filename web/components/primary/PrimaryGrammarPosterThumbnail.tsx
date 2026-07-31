"use client";

import { useEffect, useRef, useState } from "react";
import { GrammarPosterInteractiveContent } from "@/components/grammar/poster/GrammarPosterInteractiveContent";
import {
  GrammarModuleLoadError,
  loadPosterModuleBySlug,
} from "@/lib/grammar-builder/load-poster-module-by-slug";
import type { PosterModuleView } from "@/lib/grammar-builder/map-poster-module";

type Props = {
  slug: string;
  emoji?: string;
};

/** Scaled live poster preview for Primary Learn grammar cards. */
export function PrimaryGrammarPosterThumbnail({ slug, emoji = "📘" }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<PosterModuleView | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || view || failed) return;
    try {
      setView(loadPosterModuleBySlug(slug));
    } catch (error) {
      if (!(error instanceof GrammarModuleLoadError)) {
        console.warn("Grammar thumbnail load failed", slug, error);
      }
      setFailed(true);
    }
  }, [visible, slug, view, failed]);

  return (
    <div
      ref={hostRef}
      className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--pl-bg)]"
    >
      {view ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="origin-top-left scale-[0.28] w-[357%]">
            <div className="bg-white p-2">
              <GrammarPosterInteractiveContent
                view={view}
                interactionMode="off"
                muted
              />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/90 to-transparent" />
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[var(--pl-purple-soft)] text-5xl">
          <span aria-hidden>{emoji}</span>
        </div>
      )}
    </div>
  );
}
