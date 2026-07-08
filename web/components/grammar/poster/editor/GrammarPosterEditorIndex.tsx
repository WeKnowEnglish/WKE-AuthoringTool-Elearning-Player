"use client";

import Link from "next/link";
import { groupPublishedGrammarModulesByTopic } from "@/lib/grammar-builder/load-catalog";

export function GrammarPosterEditorIndex() {
  const groups = groupPublishedGrammarModulesByTopic();

  return (
    <div className="pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/grammar/pilot/layouts"
          className="rounded-lg border-2 border-kid-ink bg-kid-panel px-3 py-2 text-sm font-bold text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)] transition-transform active:scale-95"
        >
          ← Layout lab
        </Link>
        <span className="rounded-full border-2 border-kid-ink/30 bg-neutral-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-kid-ink/60">
          Poster editor (authors)
        </span>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-kid-ink/30 bg-white/50 p-4 sm:p-6">
        <h1 className="text-center text-xl font-extrabold uppercase tracking-wide text-kid-ink">
          Grammar poster editor
        </h1>
        <p className="mt-1 text-center text-sm font-semibold text-kid-ink/60">
          Fine-tune page layout, themes, and card titles. Export JSON when ready.
        </p>

        <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-6">
          {groups.map((group) => (
            <section key={group.groupId}>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-kid-ink/70">
                {group.label}
              </h2>
              <ul className="mt-2 flex flex-col gap-2">
                {group.modules.map((entry) => (
                  <li key={entry.slug}>
                    <Link
                      href={`/grammar/pilot/editor/${entry.slug}`}
                      className="flex items-center justify-between rounded-xl border-2 border-kid-ink/30 bg-white/70 px-4 py-3 text-sm font-semibold text-kid-ink transition-colors hover:bg-white"
                    >
                      <span>
                        {entry.thumbnailEmoji ? `${entry.thumbnailEmoji} ` : ""}
                        {entry.title}
                      </span>
                      <span className="font-mono text-xs text-kid-ink/50">{entry.difficulty}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
