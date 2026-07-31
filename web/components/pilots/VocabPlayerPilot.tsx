"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { clsx } from "clsx";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { prefetchInteractionChunk } from "@/components/lesson/interactions/loaders";
import {
  compileVocabPlayerRun,
  type VocabPlayerCompiledRun,
} from "@/lib/pilots/compile-vocab-player-run";
import {
  listVocabPlayerHubSubtopics,
  listVocabPlayerTopThemes,
  type VocabPlayerHubId,
  type VocabPlayerThemeId,
  type VocabPlayerThemeOption,
} from "@/lib/pilots/vocab-player-pool";
import { prefetchImageUrls } from "@/lib/media/prefetch-image-urls";

type Phase = "lobby" | "warming" | "play" | "error";

async function warmRun(run: VocabPlayerCompiledRun): Promise<void> {
  prefetchInteractionChunk("flashcards");
  prefetchInteractionChunk("letter_mixup");
  prefetchInteractionChunk("line_match");
  prefetchInteractionChunk("mc_quiz");
  prefetchInteractionChunk("listen_and_choose");
  if (run.imageUrls.length > 0) {
    await prefetchImageUrls(run.imageUrls);
  }
  await new Promise((resolve) => setTimeout(resolve, 120));
}

function ThemeCard({
  theme,
  onSelect,
}: {
  theme: VocabPlayerThemeOption;
  onSelect: () => void;
}) {
  const disabled = !theme.quizReady;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={clsx(
        "flex flex-col overflow-hidden rounded-2xl border-2 text-left transition",
        disabled
          ? "cursor-not-allowed border-stone-200 bg-stone-50 opacity-70"
          : "border-kid-ink/20 bg-white hover:border-kid-ink hover:shadow-md active:scale-[0.99]",
      )}
    >
      {theme.coverImageUrl ? (
        <div className="relative aspect-[16/9] w-full bg-stone-100">
          <Image
            src={theme.coverImageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="280px"
            unoptimized={
              theme.coverImageUrl.includes("placehold.co") ||
              theme.coverImageUrl.includes("supabase.co")
            }
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-base font-extrabold text-kid-ink">{theme.label}</p>
        {theme.subtitle ? (
          <p className="text-xs font-semibold text-stone-500">{theme.subtitle}</p>
        ) : null}
        <p className="mt-auto pt-1 text-xs font-bold text-stone-600">
          {theme.quizReady
            ? `${theme.imageReadyCount} ready to play`
            : `Needs ${6 - theme.imageReadyCount} more picture${6 - theme.imageReadyCount === 1 ? "" : "s"}`}
        </p>
      </div>
    </button>
  );
}

export function VocabPlayerPilot() {
  const topThemes = useMemo(() => listVocabPlayerTopThemes(), []);
  const [phase, setPhase] = useState<Phase>("lobby");
  const [hubId, setHubId] = useState<VocabPlayerHubId | null>(null);
  const [themeId, setThemeId] = useState<VocabPlayerThemeId | null>(null);
  const [themeLabel, setThemeLabel] = useState("Vocabulary Player");
  const [run, setRun] = useState<VocabPlayerCompiledRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);

  const subtopics = useMemo(
    () => (hubId ? listVocabPlayerHubSubtopics(hubId) : []),
    [hubId],
  );
  const hubTheme = useMemo(
    () => (hubId ? topThemes.find((t) => t.id === `hub:${hubId}`) ?? null : null),
    [hubId, topThemes],
  );

  const startRun = useCallback(async (nextTheme: VocabPlayerThemeOption) => {
    if (!nextTheme.quizReady) return;
    setError(null);
    setThemeId(nextTheme.id);
    setThemeLabel(nextTheme.label);
    setPhase("warming");
    try {
      const next = compileVocabPlayerRun({ themeId: nextTheme.id });
      await warmRun(next);
      setRun(next);
      setGeneration((n) => n + 1);
      setPhase("play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start vocabulary run.");
      setPhase("error");
    }
  }, []);

  const replaySameTheme = useCallback(async () => {
    if (!themeId) {
      setPhase("lobby");
      return;
    }
    const fromTop = topThemes.find((t) => t.id === themeId);
    const fromHub = hubId
      ? listVocabPlayerHubSubtopics(hubId).find((t) => t.id === themeId)
      : undefined;
    const theme = fromTop ?? fromHub;
    if (!theme) {
      setPhase("lobby");
      return;
    }
    await startRun(theme);
  }, [hubId, startRun, themeId, topThemes]);

  const backToLobby = useCallback(() => {
    setPhase("lobby");
    setHubId(null);
    setRun(null);
    setError(null);
  }, []);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col px-3 py-2 sm:px-4 sm:py-3">
        {error ? (
          <p className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </p>
        ) : null}

        {phase === "lobby" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-2">
            <div className="shrink-0">
              <h1 className="text-2xl font-extrabold text-kid-ink">Vocabulary Player</h1>
              <p className="mt-1 text-sm font-semibold text-stone-500">
                Pick a theme. Quizzes only use words that already have pictures — keep adding art to unlock more.
              </p>
            </div>

            {hubId && hubTheme ? (
              <div className="flex min-h-0 flex-col gap-3">
                <button
                  type="button"
                  className="w-fit text-sm font-bold text-stone-600 underline"
                  onClick={() => setHubId(null)}
                >
                  ← All themes
                </button>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-extrabold text-kid-ink">{hubTheme.label}</h2>
                    <p className="text-xs font-semibold text-stone-500">{hubTheme.subtitle}</p>
                  </div>
                  {hubTheme.quizReady ? (
                    <button
                      type="button"
                      className="rounded-xl border-2 border-kid-ink bg-kid-cta px-4 py-2 text-sm font-extrabold text-kid-ink"
                      onClick={() => void startRun(hubTheme)}
                    >
                      Play all {hubTheme.label}
                    </button>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {subtopics.map((theme) => (
                    <ThemeCard
                      key={theme.id}
                      theme={theme}
                      onSelect={() => void startRun(theme)}
                    />
                  ))}
                </div>
                {subtopics.some((t) => !t.quizReady) ? (
                  <p className="text-xs font-semibold text-amber-800">
                    Gray cards need more pictures before they can start a quiz. Words stay on the list.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {topThemes.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    onSelect={() => {
                      if (theme.kind === "hub" && theme.hubId) {
                        setHubId(theme.hubId);
                        return;
                      }
                      void startRun(theme);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {phase === "warming" ? (
          <p className="m-auto text-sm text-stone-500">Getting ready…</p>
        ) : null}

        {phase === "error" ? (
          <div className="m-auto flex flex-col items-center gap-3">
            <button
              type="button"
              className="rounded-xl border-2 border-kid-ink bg-white px-4 py-2 text-sm font-bold"
              onClick={backToLobby}
            >
              Back to themes
            </button>
          </div>
        ) : null}

        {phase === "play" && run ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <LessonPlayer
              key={`${run.lessonId}-${generation}`}
              lessonId={run.lessonId}
              lessonTitle={themeLabel}
              screens={run.screens}
              mode="preview"
              previewAudience="published"
              previewFinishHref="/pilots"
              previewFinishLabel="Exit"
              onPreviewRestart={() => void replaySameTheme()}
              runSeed={run.seed}
              vocabPracticeWords={run.practiceWords}
              onVocabPlayAgain={() => void replaySameTheme()}
              onVocabFinish={backToLobby}
              vocabFinishLabel="Try another theme"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
