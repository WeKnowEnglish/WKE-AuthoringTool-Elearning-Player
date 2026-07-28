"use client";

import Link from "next/link";
import {
  grammarTeacherEditorSlugPath,
} from "@/lib/grammar-builder/editor/grammar-editor-paths";
import {
  getCanonicalGrammarPosterVariation,
  groupGrammarPosterVariationsByTopic,
} from "@/lib/grammar-builder/editor/grammar-poster-variations";

export function GrammarPosterEditorIndex() {
  const canonical = getCanonicalGrammarPosterVariation();
  const groups = groupGrammarPosterVariationsByTopic();

  return (
    <div className="pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/grammar"
          className="rounded-lg border-2 border-kid-ink bg-kid-panel px-3 py-2 text-sm font-bold text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)] transition-transform active:scale-95"
        >
          ← Student posters
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/grammar/pilot/layouts"
            className="rounded-lg border-2 border-kid-ink/30 bg-white px-3 py-2 text-sm font-semibold text-kid-ink/70"
          >
            Layout type gallery
          </Link>
          <span className="rounded-full border-2 border-kid-ink/30 bg-neutral-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-kid-ink/60">
            Grammar Poster Editor
          </span>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-kid-ink/30 bg-white/50 p-4 sm:p-6">
        <h1 className="text-center text-xl font-extrabold uppercase tracking-wide text-kid-ink">
          Grammar Poster Editor
        </h1>
        <p className="mt-1 text-center text-sm font-semibold text-kid-ink/60">
          One editor for all grammar posters. Start from the canonical There is / There are
          shell, or open another template variation.
        </p>

        <section className="mx-auto mt-8 max-w-2xl rounded-2xl border-2 border-kid-ink bg-white p-4 shadow-[4px_4px_0_0_var(--kid-shadow)] sm:p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/50">
            Canonical Grammar Poster
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-kid-ink">
            {canonical.thumbnailEmoji ? `${canonical.thumbnailEmoji} ` : ""}
            {canonical.title}
          </h2>
          <p className="mt-1 text-sm font-semibold text-kid-ink/65">
            {canonical.description ||
              "Default authoring shell until further Grammar Poster development."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={grammarTeacherEditorSlugPath(canonical.slug)}
              className="rounded-lg border-2 border-kid-ink bg-kid-cta px-4 py-2 text-sm font-extrabold text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)] transition-transform active:scale-95"
            >
              Open Grammar Poster
            </Link>
            <Link
              href={`/grammar/${canonical.slug}`}
              className="rounded-lg border-2 border-kid-ink/30 bg-white px-4 py-2 text-sm font-semibold text-kid-ink/70"
            >
              Student view
            </Link>
          </div>
        </section>

        <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-6">
          <div>
            <h2 className="text-center text-sm font-extrabold uppercase tracking-wide text-kid-ink/70">
              Template variations
            </h2>
            <p className="mt-1 text-center text-xs font-semibold text-kid-ink/50">
              Existing posters stay intact — open any variation in this same editor.
            </p>
          </div>

          {groups.map((group) => (
            <section key={group.groupId}>
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-kid-ink/70">
                {group.label}
              </h3>
              <ul className="mt-2 flex flex-col gap-2">
                {group.variations.map((entry) => (
                  <li key={entry.slug}>
                    <Link
                      href={grammarTeacherEditorSlugPath(entry.slug)}
                      className="flex items-center justify-between gap-3 rounded-xl border-2 border-kid-ink/30 bg-white/70 px-4 py-3 text-sm font-semibold text-kid-ink transition-colors hover:bg-white"
                    >
                      <span className="min-w-0">
                        <span className="block truncate">
                          {entry.thumbnailEmoji ? `${entry.thumbnailEmoji} ` : ""}
                          {entry.title}
                          {entry.canonical ?
                            <span className="ml-2 rounded-full border border-kid-ink/25 bg-kid-panel px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-kid-ink/55">
                              Canonical
                            </span>
                          : null}
                        </span>
                        {entry.description ?
                          <span className="mt-0.5 block truncate text-xs font-medium text-kid-ink/45">
                            {entry.description}
                          </span>
                        : null}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-kid-ink/50">
                        {entry.difficulty ?? "—"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs font-semibold text-kid-ink/40">
          Layout type gallery stays at{" "}
          <Link href="/grammar/pilot/layouts" className="underline underline-offset-2">
            /grammar/pilot/layouts
          </Link>{" "}
          for card-body demos. Student hub collapse into one variation-driven player is deferred.
        </p>
      </div>
    </div>
  );
}
