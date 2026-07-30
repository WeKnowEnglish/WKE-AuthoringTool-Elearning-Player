"use client";

import { useCallback, useEffect, useState } from "react";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { prefetchInteractionChunk } from "@/components/lesson/interactions/loaders";
import {
  compileVocabPlayerRun,
  type VocabPlayerCompiledRun,
} from "@/lib/pilots/compile-vocab-player-run";
import { prefetchImageUrls } from "@/lib/media/prefetch-image-urls";

type Phase = "warming" | "play" | "error";

async function warmRun(run: VocabPlayerCompiledRun): Promise<void> {
  prefetchInteractionChunk("flashcards");
  prefetchInteractionChunk("letter_mixup");
  prefetchInteractionChunk("line_match");
  prefetchInteractionChunk("mc_quiz");
  prefetchInteractionChunk("listen_and_choose");
  if (run.imageUrls.length > 0) {
    await prefetchImageUrls(run.imageUrls);
  }
  // Give webpack a beat to finish chunk fetches started above.
  await new Promise((resolve) => setTimeout(resolve, 120));
}

export function VocabPlayerPilot() {
  const [phase, setPhase] = useState<Phase>("warming");
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
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void startRun();
  }, [startRun]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col px-3 py-2 sm:px-4 sm:py-3">
        {error ? (
          <p className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </p>
        ) : null}

        {phase === "warming" ? (
          <p className="m-auto text-sm text-stone-500">Getting ready…</p>
        ) : null}

        {phase === "play" && run ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <LessonPlayer
              key={`${run.lessonId}-${generation}`}
              lessonId={run.lessonId}
              lessonTitle="Vocabulary Player"
              screens={run.screens}
              mode="preview"
              previewAudience="published"
              previewFinishHref="/pilots"
              previewFinishLabel="Exit"
              onPreviewRestart={() => void startRun()}
              runSeed={run.seed}
              vocabPracticeWords={run.practiceWords}
              onVocabPlayAgain={() => void startRun()}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
