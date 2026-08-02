"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import bakeryTrueFalse from "@/content/pilots/games-true-false/bakery-true-false.json";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { useStudioPackQuerySource } from "@/components/pilots/useStudioPackQuerySource";
import {
  parseGamesTrueFalseLessonPlayerPack,
  type GamesTrueFalseLessonPlayerPack,
} from "@/lib/games-true-false/parse-games-pack";
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
        <p className="text-lg font-extrabold text-kid-ink">Loading true / false…</p>
      </div>
    ),
  },
);

const BUILTIN_PACK = parseGamesTrueFalseLessonPlayerPack(bakeryTrueFalse);

export function GamesTrueFalsePilot() {
  const remote = useStudioPackQuerySource();
  const [pack, setPack] = useState<GamesTrueFalseLessonPlayerPack>(BUILTIN_PACK);
  const [sourceName, setSourceName] = useState<string>(BUILTIN_PACK.activity_name);
  const [generation, setGeneration] = useState(0);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const appliedRemoteKeyRef = useRef<string | null>(null);

  const screens = useMemo((): LessonScreenRow[] => {
    return pack.screens.map((payload, index) => ({
      id: `screen-games-true-false-${index}`,
      lesson_id: "pilot-games-true-false",
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
      const next = parseGamesTrueFalseLessonPlayerPack(remote.rawPack);
      appliedRemoteKeyRef.current = key;
      setPack(next);
      setSourceName(remote.sourceName || next.activity_name);
      setGeneration((n) => n + 1);
      setImportNotice(
        remote.sourceKind === "activity"
          ? `Loaded from My Activity Bank (${next.screens.length} item${
              next.screens.length === 1 ? "" : "s"
            }).`
          : `Loaded from Studio inbox (${next.screens.length} item${
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
      const next = parseGamesTrueFalseLessonPlayerPack(JSON.parse(await file.text()));
      setPack(next);
      setSourceName(file.name);
      setGeneration((n) => n + 1);
      setImportNotice(`Loaded ${file.name} (${next.screens.length} items).`);
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
              Quizzes · True / false (pilot)
            </h1>
            <p className="mt-1 text-sm font-semibold text-kid-ink/80">
              Studio Quiz true/false packs play as Lesson Player true_false screens.
            </p>
            <p className="mt-2 text-xs font-semibold text-kid-ink/60">
              Playing: {remoteLoading ? "Loading Studio pack…" : sourceName}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <KidButton type="button" onClick={loadBuiltin}>
              Load bakery sample
            </KidButton>
            <KidButton
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
            >
              {importing ? "Importing…" : "Import pack"}
            </KidButton>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImportFile(file);
                event.target.value = "";
              }}
            />
          </div>
        </div>
        {importNotice ? (
          <p className="mt-3 text-sm font-semibold text-kid-ink/80">{importNotice}</p>
        ) : null}
      </KidPanel>

      <LessonPlayer
        key={`${generation}-${pack.quiz_group_id}`}
        lessonId={`pilot-games-true-false-${generation}`}
        lessonTitle={pack.activity_name}
        screens={screens}
        mode="preview"
      />
    </div>
  );
}
