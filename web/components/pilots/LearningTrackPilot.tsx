"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { PracticeTrackPlayer } from "@/components/practice/PracticeTrackPlayer";
import { useStudioPackQuerySource } from "@/components/pilots/useStudioPackQuerySource";
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

function parseStartScreen(raw: string | null): number {
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

export function LearningTrackPilot() {
  const searchParams = useSearchParams();
  const embed = searchParams.get("embed") === "1";
  const startScreen = parseStartScreen(searchParams.get("start"));

  const remote = useStudioPackQuerySource();
  const [pack, setPack] = useState<LearningTrackLessonPlayerPack>(BUILTIN_PACK);
  const [sourceName, setSourceName] = useState<string>(BUILTIN_PACK.title);
  const [generation, setGeneration] = useState(0);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const appliedRemoteKeyRef = useRef<string | null>(null);

  const screens = useMemo((): LessonScreenRow[] => {
    return pack.screens.map((payload, index) => ({
      id: `screen-learning-track-${index}`,
      lesson_id: `pilot-learning-track-${pack.id}`,
      order_index: index,
      screen_type: "interaction",
      payload,
    }));
  }, [pack]);

  const initialScreenIndex = Math.min(
    startScreen,
    Math.max(0, screens.length - 1),
  );

  useEffect(() => {
    if (remote.notice && !remote.rawPack) {
      setImportNotice(remote.notice);
      return;
    }
    if (!remote.rawPack || !remote.sourceKind) return;
    const key = `${remote.sourceKind}:${remote.sourceName}`;
    if (appliedRemoteKeyRef.current === key) return;
    try {
      const next = parseLearningTrackLessonPlayerPack(remote.rawPack);
      appliedRemoteKeyRef.current = key;
      setPack(next);
      setSourceName(remote.sourceName || next.title);
      setGeneration((n) => n + 1);
      setImportNotice(
        remote.sourceKind === "activity"
          ? `Loaded from My Activity Bank (${next.screens.length} screens · ~${next.estimated_minutes} min).`
          : `Loaded from Studio inbox (${next.screens.length} screens · ~${next.estimated_minutes} min).`,
      );
    } catch (error) {
      setImportNotice(error instanceof Error ? error.message : "Could not parse pack.");
    }
  }, [remote.notice, remote.rawPack, remote.sourceKind, remote.sourceName]);

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

  const remoteLoading = remote.loading;
  const embedViewportRef = useRef<HTMLDivElement>(null);
  const embedContentRef = useRef<HTMLDivElement>(null);
  const [embedScale, setEmbedScale] = useState(1);
  const [embedSize, setEmbedSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!embed) return;
    const viewport = embedViewportRef.current;
    const content = embedContentRef.current;
    if (!viewport || !content) return;

    const fit = () => {
      // Natural layout size (CSS transform does not affect scrollWidth/Height).
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      const cw = Math.max(content.scrollWidth, content.offsetWidth, 1);
      const ch = Math.max(content.scrollHeight, content.offsetHeight, 1);
      const next = Math.min(vw / cw, vh / ch);
      setEmbedScale(Number.isFinite(next) && next > 0 ? next : 1);
      setEmbedSize({ width: cw, height: ch });
    };

    fit();
    const viewportObserver = new ResizeObserver(fit);
    viewportObserver.observe(viewport);
    const contentObserver = new ResizeObserver(fit);
    contentObserver.observe(content);
    window.addEventListener("resize", fit);
    const timers = [50, 200, 500, 1000].map((ms) => window.setTimeout(fit, ms));

    return () => {
      viewportObserver.disconnect();
      contentObserver.disconnect();
      window.removeEventListener("resize", fit);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [embed, generation, initialScreenIndex, remoteLoading, pack.id]);

  const player = remoteLoading ? (
    <div className="rounded-2xl border-2 border-kid-ink/20 bg-white px-6 py-10 text-center">
      <p className="text-lg font-extrabold text-kid-ink">Loading Studio track…</p>
    </div>
  ) : embed ? (
    <LessonPlayer
      key={`${generation}:${initialScreenIndex}`}
      lessonId={`pilot-learning-track-${pack.id}`}
      lessonTitle={pack.title}
      screens={screens}
      mode="preview"
      previewAudience="published"
      initialScreenIndex={initialScreenIndex}
      immersiveLayout
      embedNaturalHeight
    />
  ) : (
    <PracticeTrackPlayer
      key={`${generation}:${initialScreenIndex}`}
      pack={pack}
      lessonId={`pilot-learning-track-${pack.id}`}
      title={pack.title}
      mode="pilot"
      initialScreenIndex={initialScreenIndex}
    />
  );

  if (embed) {
    const frameW = embedSize.width * embedScale;
    const frameH = embedSize.height * embedScale;
    return (
      <div
        ref={embedViewportRef}
        className="flex h-dvh w-full items-center justify-center overflow-hidden bg-kid-surface-muted"
      >
        <div
          style={{
            width: frameW > 0 ? frameW : "100%",
            height: frameH > 0 ? frameH : "100%",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            ref={embedContentRef}
            className="w-full max-w-5xl px-2"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: embedSize.width > 0 ? embedSize.width : "100%",
              maxWidth: "64rem",
              transform: `scale(${embedScale})`,
              transformOrigin: "top left",
            }}
          >
            {player}
          </div>
        </div>
      </div>
    );
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
              Playing: {remoteLoading ? "Loading Studio pack…" : sourceName}
            </p>
            {!remoteLoading && (
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
              Drop a <code className="font-mono">.learning-track.lessonplayer.json</code>, open an
              Activity Bank link (<code className="font-mono">?activity=</code>), or use Play from
              Studio.
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
        {!remoteLoading && pack.beat_plan.length > 0 ? (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs font-semibold text-kid-ink/70">
            {pack.beat_plan.map((beat) => (
              <li key={beat.id}>
                {beat.label} · {beat.screenCount} screen{beat.screenCount === 1 ? "" : "s"}
              </li>
            ))}
          </ol>
        ) : null}
      </KidPanel>

      <div className="min-h-[min(75dvh,640px)]">{player}</div>
    </div>
  );
}
