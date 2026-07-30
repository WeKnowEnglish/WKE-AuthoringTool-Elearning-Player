"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { prefetchInteractionChunk } from "@/components/lesson/interactions/loaders";
import {
  compileVocabPlayerRun,
  type VocabPlayerCompiledRun,
} from "@/lib/pilots/compile-vocab-player-run";
import { vocabPlayerPoolSize } from "@/lib/pilots/vocab-player-pool";
import { prefetchImageUrls } from "@/lib/media/prefetch-image-urls";

type Phase = "lobby" | "warming" | "play";

async function warmRun(run: VocabPlayerCompiledRun): Promise<void> {
  prefetchInteractionChunk("flashcards");
  prefetchInteractionChunk("letter_mixup");
  prefetchInteractionChunk("drag_match");
  prefetchInteractionChunk("mc_quiz");
  prefetchInteractionChunk("listen_and_choose");
  if (run.imageUrls.length > 0) {
    await prefetchImageUrls(run.imageUrls);
  }
  // Give webpack a beat to finish chunk fetches started above.
  await new Promise((resolve) => setTimeout(resolve, 120));
}

export function VocabPlayerPilot() {
  const poolSize = useMemo(() => vocabPlayerPoolSize(), []);
  const [phase, setPhase] = useState<Phase>("lobby");
  const [run, setRun] = useState<VocabPlayerCompiledRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);

  const startRun = useCallback(async () => {
    setError(null);
    setPhase("warming");
    try {
      const next = compileVocabPlayerRun();
      await warmRun(next);
      setRun(next);
      setGeneration((n) => n + 1);
      setPhase("play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start vocabulary run.");
      setPhase("lobby");
    }
  }, []);

  const backToLobby = useCallback(() => {
    setPhase("lobby");
    setRun(null);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
          <Link href="/pilots" className="underline-offset-2 hover:underline">
            Pilots
          </Link>
          {" · "}
          Vocabulary player
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          Primary vocab loop
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
          Each run samples <span className="font-medium text-stone-800">6 words</span> from a{" "}
          {poolSize}-word pool, then freezes the full quiz spine before play — flashcards, letter
          scramble, one 6-pair drag match, MCQ, and listen-and-choose — with interaction chunks and
          images warmed so phases do not hitch.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      ) : null}

      {phase === "lobby" ? (
        <KidPanel className="space-y-4 border-2 border-kid-ink/15 bg-gradient-to-b from-emerald-50/80 to-white">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
              Recipe
            </p>
            <ol className="mt-2 grid gap-1.5 text-sm text-stone-700 sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-bold text-white">
                  1
                </span>
                Flashcards
                <span className="text-[11px] text-stone-500">(6 cards)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-bold text-white">
                  2
                </span>
                Letter scramble
                <span className="text-[11px] text-stone-500">(×6)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-bold text-white">
                  3
                </span>
                Drag match
                <span className="text-[11px] text-stone-500">(1×6 pairs)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-bold text-white">
                  4
                </span>
                Multiple choice
                <span className="text-[11px] text-stone-500">(×6)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-bold text-white">
                  5
                </span>
                Listen and choose
                <span className="text-[11px] text-stone-500">(×6)</span>
              </li>
            </ol>
          </div>
          <p className="text-sm text-stone-600">
            Rewards use the shared student practice session (gold) via{" "}
            <code className="rounded bg-stone-100 px-1 text-[11px]">vocab-player-*</code> lesson ids.
          </p>
          <KidButton type="button" onClick={() => void startRun()}>
            Start a new run
          </KidButton>
        </KidPanel>
      ) : null}

      {phase === "warming" ? (
        <KidPanel className="border-2 border-dashed border-kid-ink/25 bg-white px-6 py-10 text-center">
          <p className="text-lg font-extrabold text-kid-ink">Getting ready…</p>
          <p className="mt-2 text-sm text-neutral-500">
            Compiling 6 words and warming quiz modes + pictures.
          </p>
        </KidPanel>
      ) : null}

      {phase === "play" && run ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="font-semibold text-stone-900">
                Today&apos;s words:{" "}
                <span className="font-normal text-stone-700">
                  {run.entries.map((e) => e.word).join(" · ")}
                </span>
              </p>
              <p className="text-[11px] text-stone-500">
                {run.screens.length} screens · seed {run.seed}
              </p>
            </div>
            <button
              type="button"
              onClick={backToLobby}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              New run
            </button>
          </div>
          <LessonPlayer
            key={`${run.lessonId}-${generation}`}
            lessonId={run.lessonId}
            screens={run.screens}
            mode="student"
            runSeed={run.seed}
            vocabPracticeWords={run.practiceWords}
          />
        </div>
      ) : null}
    </div>
  );
}
