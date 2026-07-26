"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import bakeryQuickCheck from "@/content/pilots/games-mc-quiz/bakery-quick-check.json";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { useStudioPackQuerySource } from "@/components/pilots/useStudioPackQuerySource";
import {
  parseGamesMcQuizLessonPlayerPack,
  type GamesMcQuizLessonPlayerPack,
} from "@/lib/games-mc-quiz/parse-games-pack";
import type { LessonScreenRow } from "@/lib/lesson/types";

const LessonPlayer = dynamic(
  () =>
    import("@/components/lesson/LessonPlayer").then((m) => ({
      default: m.LessonPlayer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border-2 border-kid-ink/20 bg-white px-6 py-10 text-center">
        <p className="text-lg font-extrabold text-kid-ink">Loading quiz…</p>
      </div>
    ),
  },
);

const BUILTIN_PACK = parseGamesMcQuizLessonPlayerPack(bakeryQuickCheck);

export function GamesMcQuizPilot() {
  const remote = useStudioPackQuerySource();
  const [pack, setPack] = useState<GamesMcQuizLessonPlayerPack>(BUILTIN_PACK);
  const [sourceName, setSourceName] = useState<string>(BUILTIN_PACK.activity_name);
  const [generation, setGeneration] = useState(0);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const appliedRemoteKeyRef = useRef<string | null>(null);

  const screens = useMemo((): LessonScreenRow[] => {
    return pack.screens.map((payload, index) => ({
      id: `screen-games-mc-${index}`,
      lesson_id: "pilot-games-mc-quiz",
      order_index: index,
      screen_type: "interaction",
      payload,
    }));
  }, [pack]);

  useEffect(() => {
    if (remote.notice && !remote.rawPack) {
      setImportNotice(remote.notice);
      return;
    }
    if (!remote.rawPack || !remote.sourceKind) return;
    const key = `${remote.sourceKind}:${remote.sourceName}`;
    if (appliedRemoteKeyRef.current === key) return;
    try {
      const next = parseGamesMcQuizLessonPlayerPack(remote.rawPack);
      appliedRemoteKeyRef.current = key;
      setPack(next);
      setSourceName(remote.sourceName || next.activity_name);
      setGeneration((n) => n + 1);
      setImportNotice(
        remote.sourceKind === "activity"
          ? `Loaded from My Activity Bank (${next.screens.length} question${
              next.screens.length === 1 ? "" : "s"
            }).`
          : `Loaded from Studio inbox (${next.screens.length} question${
              next.screens.length === 1 ? "" : "s"
            }).`,
      );
    } catch (error) {
      setImportNotice(error instanceof Error ? error.message : "Could not parse pack.");
    }
  }, [remote.notice, remote.rawPack, remote.sourceKind, remote.sourceName]);

  function loadBuiltin() {
    setPack(BUILTIN_PACK);
    setSourceName(BUILTIN_PACK.activity_name);
    setGeneration((n) => n + 1);
    setImportNotice(`Loaded ${BUILTIN_PACK.activity_name}.`);
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportNotice(null);
    try {
      const next = parseGamesMcQuizLessonPlayerPack(JSON.parse(await file.text()));
      setPack(next);
      setSourceName(file.name);
      setGeneration((n) => n + 1);
      setImportNotice(`Loaded ${file.name} (${next.screens.length} questions).`);
    } catch (error) {
      setImportNotice(error instanceof Error ? error.message : "Could not import file.");
    } finally {
      setImporting(false);
    }
  }

  const remoteLoading = remote.loading;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <KidPanel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-kid-ink">
              Quizzes · Multiple choice (pilot)
            </h1>
            <p className="mt-1 text-sm font-semibold text-kid-ink/80">
              Studio Quiz MCQ packs play as a sequence of Lesson Player mc_quiz screens.
            </p>
            <p className="mt-2 text-xs font-semibold text-kid-ink/60">
              Playing: {remoteLoading ? "Loading Studio pack…" : sourceName}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <KidButton type="button" variant="secondary" onClick={loadBuiltin}>
              Bakery quick check
            </KidButton>
            <KidButton
              type="button"
              variant="secondary"
              onClick={() => setGeneration((n) => n + 1)}
            >
              Reset quiz
            </KidButton>
          </div>
        </div>
      </KidPanel>

      <KidPanel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-kid-ink">Import Studio export</p>
            <p className="mt-1 text-xs font-semibold text-kid-ink/70">
              Drop a{" "}
              <code className="font-mono">.games-mc.lessonplayer.json</code> from EDU Studio, open
              an Activity Bank link (<code className="font-mono">?activity=</code>), or use Play
              from Studio.
            </p>
            {importNotice && (
              <p className="mt-2 text-xs font-bold text-kid-ink/80">{importNotice}</p>
            )}
          </div>
          <KidButton
            type="button"
            variant="secondary"
            disabled={importing || remoteLoading}
            onClick={() => fileRef.current?.click()}
          >
            {importing ? "Importing…" : "Choose file"}
          </KidButton>
        </div>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept=".json,application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImportFile(file);
            event.target.value = "";
          }}
        />
        <div
          className="mt-3 rounded-2xl border-2 border-dashed border-kid-ink/25 bg-white/60 px-4 py-6 text-center text-sm font-semibold text-kid-ink/70"
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (file) void handleImportFile(file);
          }}
        >
          Drop Lesson Player quiz pack JSON here
        </div>
      </KidPanel>

      <div className="min-h-[min(75dvh,640px)]">
        {remoteLoading ? (
          <div className="rounded-2xl border-2 border-kid-ink/20 bg-white px-6 py-10 text-center">
            <p className="text-lg font-extrabold text-kid-ink">Loading Studio pack…</p>
          </div>
        ) : (
          <LessonPlayer
            key={generation}
            lessonId="pilot-games-mc-quiz"
            lessonTitle={pack.activity_name}
            screens={screens}
            mode="preview"
          />
        )}
      </div>
    </div>
  );
}
