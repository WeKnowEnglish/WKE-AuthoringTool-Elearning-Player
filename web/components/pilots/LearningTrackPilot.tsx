"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { buildHobbiesDay1BuiltinTrackPack } from "@/lib/learning-tracks/build-hobbies-day-1-builtin";
import {
  parseLearningTrackLessonPlayerPack,
  type LearningTrackLessonPlayerPack,
} from "@/lib/learning-tracks/parse-track-pack";
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
        <p className="text-lg font-extrabold text-kid-ink">Loading learning track…</p>
      </div>
    ),
  },
);

const BUILTIN_PACK = buildHobbiesDay1BuiltinTrackPack();

export function LearningTrackPilot() {
  const searchParams = useSearchParams();
  const inboxId = searchParams.get("inbox")?.trim() || null;

  const [pack, setPack] = useState<LearningTrackLessonPlayerPack>(BUILTIN_PACK);
  const [sourceName, setSourceName] = useState(BUILTIN_PACK.title);
  const [generation, setGeneration] = useState(0);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [inboxLoading, setInboxLoading] = useState(Boolean(inboxId));
  const fileRef = useRef<HTMLInputElement>(null);
  const loadedInboxRef = useRef<string | null>(null);

  const screens = useMemo((): LessonScreenRow[] => {
    return pack.screens.map((payload, index) => ({
      id: `screen-learning-track-${index}`,
      lesson_id: `pilot-learning-track-${pack.id}`,
      order_index: index,
      screen_type: "interaction",
      payload,
    }));
  }, [pack]);

  useEffect(() => {
    if (!inboxId) {
      setInboxLoading(false);
      return;
    }
    if (loadedInboxRef.current === inboxId) return;
    loadedInboxRef.current = inboxId;
    setInboxLoading(true);
    setImportNotice(null);
    void (async () => {
      try {
        const response = await fetch(`/api/dev/studio-pack-inbox/${encodeURIComponent(inboxId)}`);
        const payload = (await response.json()) as {
          error?: string;
          pack?: unknown;
          filename?: string | null;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Could not load Studio inbox pack.");
        }
        const next = parseLearningTrackLessonPlayerPack(payload.pack);
        setPack(next);
        setSourceName(payload.filename?.trim() || next.title);
        setGeneration((n) => n + 1);
        setImportNotice(
          `Loaded from Studio inbox (${next.screens.length} screens · ~${next.estimated_minutes} min).`,
        );
      } catch (error) {
        setImportNotice(error instanceof Error ? error.message : "Inbox load failed.");
      } finally {
        setInboxLoading(false);
      }
    })();
  }, [inboxId]);

  function loadBuiltin() {
    setPack(BUILTIN_PACK);
    setSourceName(BUILTIN_PACK.title);
    setGeneration((n) => n + 1);
    setImportNotice(`Loaded builtin ${BUILTIN_PACK.title}.`);
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportNotice(null);
    try {
      const next = parseLearningTrackLessonPlayerPack(JSON.parse(await file.text()));
      setPack(next);
      setSourceName(file.name);
      setGeneration((n) => n + 1);
      setImportNotice(`Loaded ${file.name} (${next.screens.length} screens).`);
    } catch (error) {
      setImportNotice(error instanceof Error ? error.message : "Could not import file.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <KidPanel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-kid-ink">Learning track (pilot)</h1>
            <p className="mt-1 text-sm font-semibold text-kid-ink/80">
              Studio-compiled self-study sessions play as a single Lesson Player sequence.
            </p>
            <p className="mt-2 text-xs font-semibold text-kid-ink/60">
              Playing: {inboxLoading ? "Loading Studio pack…" : sourceName}
            </p>
            {!inboxLoading && (
              <p className="mt-1 text-xs font-semibold text-kid-ink/50">
                {pack.screens.length} screens · ~{pack.estimated_minutes} min · {pack.pack_title}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <KidButton type="button" variant="secondary" onClick={loadBuiltin}>
              Hobbies Day 1 (builtin)
            </KidButton>
            <KidButton
              type="button"
              variant="secondary"
              onClick={() => setGeneration((n) => n + 1)}
            >
              Reset
            </KidButton>
          </div>
        </div>
      </KidPanel>

      <KidPanel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-kid-ink">Import Studio track</p>
            <p className="mt-1 text-xs font-semibold text-kid-ink/70">
              Drop a <code className="font-mono">.learning-track.lessonplayer.json</code>, or use{" "}
              <strong>Play in Lesson Player</strong> from Studio.
            </p>
            {importNotice && (
              <p className="mt-2 text-xs font-bold text-kid-ink/80">{importNotice}</p>
            )}
          </div>
          <KidButton
            type="button"
            variant="secondary"
            disabled={importing || inboxLoading}
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
        {!inboxLoading && pack.beat_plan.length > 0 ? (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs font-semibold text-kid-ink/70">
            {pack.beat_plan.map((beat) => (
              <li key={beat.id}>
                {beat.label} · {beat.screenCount} screen{beat.screenCount === 1 ? "" : "s"}
              </li>
            ))}
          </ol>
        ) : null}
      </KidPanel>

      <div className="min-h-[min(75dvh,640px)]">
        {inboxLoading ? (
          <div className="rounded-2xl border-2 border-kid-ink/20 bg-white px-6 py-10 text-center">
            <p className="text-lg font-extrabold text-kid-ink">Loading Studio track…</p>
          </div>
        ) : (
          <LessonPlayer
            key={generation}
            lessonId={`pilot-learning-track-${pack.id}`}
            lessonTitle={pack.title}
            screens={screens}
            mode="preview"
          />
        )}
      </div>
    </div>
  );
}
