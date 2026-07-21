"use client";

import Link from "next/link";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GrammarError({ error, reset }: Props) {
  const isContentError =
    error.name === "GrammarModuleParseError" ||
    error.name === "GrammarMapError" ||
    error.name === "GrammarModuleLoadError";

  return (
    <div className="mx-auto max-w-lg rounded-2xl border-4 border-kid-ink bg-kid-panel p-6 text-center shadow-[6px_6px_0_0_var(--kid-shadow)]">
      <p className="text-sm font-bold uppercase tracking-wide text-kid-ink/60">Grammar poster</p>
      <h1 className="mt-2 text-2xl font-extrabold text-kid-ink">
        {isContentError ? "This poster needs a fix" : "Something went wrong"}
      </h1>
      <p className="mt-3 text-base font-semibold leading-relaxed text-kid-ink/80">
        {isContentError ?
          "We could not load the grammar poster. Please tell your teacher."
        : "Please try again or go back home."}
      </p>
      {process.env.NODE_ENV === "development" ? (
        <p className="mt-4 break-words rounded-lg border border-dashed border-kid-ink/30 bg-white/60 p-3 text-left text-xs text-kid-ink/70">
          {error.message}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border-2 border-kid-ink bg-white px-4 py-2 text-sm font-bold text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)] transition-transform active:scale-95"
        >
          Try again
        </button>
        <Link
          href="/primary"
          className="rounded-lg border-2 border-kid-ink bg-kid-panel px-4 py-2 text-sm font-bold text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)] transition-transform active:scale-95"
        >
          ← Back home
        </Link>
      </div>
    </div>
  );
}
