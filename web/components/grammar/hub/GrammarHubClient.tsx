"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GrammarCatalogEntry } from "@/lib/grammar-builder/catalog-schema";
import { groupPublishedGrammarModulesByTopic } from "@/lib/grammar-builder/load-catalog";
import { GrammarPosterOverlay } from "@/components/grammar/GrammarPosterOverlay";
import { KidButton } from "@/components/kid-ui/KidButton";
import { playSfx } from "@/lib/audio/sfx";
import { useAudioMuted } from "@/lib/audio/use-audio-muted";
import { readCompletedGrammarPosterSlugs } from "@/lib/grammar-templates/grammar-completion-status";
import { completeStudyCareIfPending } from "@/lib/pet";
import { newSessionSeed } from "@/lib/student-hub/session-seed";
import { subscribePracticeEvents } from "@/lib/student-session";

type Props = {
  modules: GrammarCatalogEntry[];
  onEconomyChange?: () => void;
};

export function GrammarHubClient({ modules, onEconomyChange }: Props) {
  const { muted } = useAudioMuted();
  const groups = groupPublishedGrammarModulesByTopic();
  const [practiceSlug, setPracticeSlug] = useState<string | null>(null);
  const [sessionSeed, setSessionSeed] = useState<string | null>(null);
  const [completedSlugs, setCompletedSlugs] = useState<Set<string>>(
    () => readCompletedGrammarPosterSlugs(),
  );

  useEffect(() => {
    return subscribePracticeEvents(() => {
      setCompletedSlugs(readCompletedGrammarPosterSlugs());
    });
  }, []);

  function openPractice(slug: string) {
    playSfx("tap", muted);
    setPracticeSlug(slug);
    setSessionSeed(newSessionSeed());
  }

  function closePractice() {
    setPracticeSlug(null);
    setSessionSeed(null);
  }

  return (
    <>
      <div className="mx-auto w-full max-w-3xl pb-4">
        <div className="mb-4">
          <Link
            href="/home?room=learn"
            className="rounded-lg border-2 border-kid-ink bg-kid-panel px-3 py-2 text-sm font-bold text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)] transition-transform active:scale-95"
          >
            ← Back to Learn
          </Link>
        </div>

        <div className="mb-6 space-y-2 text-center">
          <h1 className="text-2xl font-extrabold text-kid-ink md:text-3xl">Grammar</h1>
          <p className="text-base font-semibold text-kid-ink/85">
            Read a poster or start a practice run to earn rewards.
          </p>
        </div>

        {modules.length === 0 ? (
          <p className="rounded-2xl border-4 border-kid-ink bg-kid-panel p-6 text-center text-base font-semibold text-kid-ink/80">
            Grammar topics are coming soon.
          </p>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.groupId} aria-labelledby={`grammar-group-${group.groupId}`}>
                <h2
                  id={`grammar-group-${group.groupId}`}
                  className="mb-3 text-sm font-extrabold uppercase tracking-wide text-kid-ink/70"
                >
                  {group.label}
                </h2>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {group.modules.map((entry) => (
                    <li key={entry.slug}>
                      <div className="flex h-full flex-col rounded-2xl border-4 border-kid-ink bg-kid-panel p-4 shadow-[3px_3px_0_0_var(--kid-shadow)]">
                        <div className="flex items-start gap-3">
                          <span className="text-4xl leading-none" aria-hidden>
                            {entry.thumbnailEmoji ?? "📘"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-lg font-bold leading-snug text-kid-ink">{entry.title}</p>
                            {entry.description ? (
                              <p className="mt-1 text-sm font-semibold text-kid-ink/75">
                                {entry.description}
                              </p>
                            ) : null}
                            {entry.difficulty ? (
                              <p className="mt-2 text-xs font-extrabold uppercase tracking-wide text-kid-ink/60">
                                {entry.difficulty}
                              </p>
                            ) : null}
                            {completedSlugs.has(entry.slug) ? (
                              <p className="mt-2 inline-flex rounded-full border-2 border-emerald-700/40 bg-emerald-100 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-emerald-900">
                                Completed
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Link
                            href={`/grammar/${entry.slug}`}
                            className="inline-flex min-h-10 items-center justify-center rounded-xl border-2 border-kid-ink bg-white px-3 text-sm font-bold text-kid-ink transition-transform active:scale-95"
                            onClick={() => playSfx("tap", muted)}
                          >
                            Read
                          </Link>
                          <KidButton
                            type="button"
                            className="!min-h-10 w-full text-sm"
                            onClick={() => openPractice(entry.slug)}
                          >
                            Practice
                          </KidButton>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {practiceSlug && sessionSeed ?
        <GrammarPosterOverlay
          slug={practiceSlug}
          sessionSeed={sessionSeed}
          muted={muted}
          onEconomyChange={onEconomyChange}
          onActivityComplete={() => {
            completeStudyCareIfPending();
            onEconomyChange?.();
          }}
          onClose={closePractice}
        />
      : null}
    </>
  );
}
