"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { GrammarPosterInteractiveContent } from "@/components/grammar/poster/GrammarPosterInteractiveContent";
import { PrimaryChrome } from "@/components/primary/PrimaryChrome";
import { getGrammarCatalogEntry } from "@/lib/grammar-builder/load-catalog";
import {
  GrammarModuleLoadError,
  loadPosterModuleBySlug,
} from "@/lib/grammar-builder/load-poster-module-by-slug";

type Props = {
  slug: string;
  muted?: boolean;
  onClose: () => void;
};

/** Read-only grammar poster overlay on Primary (no full-page /grammar chrome). */
export function PrimaryGrammarPosterOverlay({
  slug,
  muted = false,
  onClose,
}: Props) {
  const entry = getGrammarCatalogEntry(slug);
  const title = entry?.title ?? "Grammar";

  const loaded = useMemo(() => {
    try {
      return { ok: true as const, view: loadPosterModuleBySlug(slug) };
    } catch (error) {
      const message =
        error instanceof GrammarModuleLoadError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not load this grammar poster.";
      return { ok: false as const, message };
    }
  }, [slug]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <PrimaryChrome
      className="fixed inset-0 z-[80] flex h-dvh flex-col bg-[var(--pl-bg)] text-[var(--pl-ink)]"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} grammar poster`}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--pl-border)] bg-white px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--pl-purple)]">
            Grammar
          </p>
          <h2 className="truncate text-base font-extrabold tracking-tight sm:text-lg">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-3 text-sm font-extrabold text-[var(--pl-ink)] transition hover:border-[var(--pl-purple)] hover:bg-white"
        >
          <X className="h-4 w-4" aria-hidden />
          Close
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3 sm:px-4 sm:py-4">
        <div className="mx-auto max-w-5xl">
          {loaded.ok ? (
            <GrammarPosterInteractiveContent
              view={loaded.view}
              interactionMode="play"
              muted={muted}
            />
          ) : (
            <div className="rounded-[1.75rem] border border-[var(--pl-border)] bg-white p-6 text-center shadow-sm">
              <p className="text-lg font-extrabold text-[var(--pl-ink)]">
                Couldn’t open this poster
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--pl-muted)]">
                {loaded.message}
              </p>
              <button
                type="button"
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--pl-teal)] px-4 text-sm font-extrabold text-white"
                onClick={onClose}
              >
                Back to Learn
              </button>
            </div>
          )}
        </div>
      </div>
    </PrimaryChrome>
  );
}
