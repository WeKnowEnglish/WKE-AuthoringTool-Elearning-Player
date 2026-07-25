"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import hobbiesActivity from "@/content/pilots/explore-hotspots/hobbies-listening-hotspots.wkeactivity.json";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  importLessonPlayerHotspotPack,
  revokeImportedObjectUrls,
  wkeActivityToLessonScreen,
} from "@/lib/wke-activity";
import type { WkeActivityV2 } from "@/lib/wke-activity/types";

const LessonPlayer = dynamic(
  () =>
    import("@/components/lesson/LessonPlayer").then((m) => ({
      default: m.LessonPlayer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border-2 border-kid-ink/20 bg-white px-6 py-10 text-center">
        <p className="text-lg font-extrabold text-kid-ink">Loading activity…</p>
      </div>
    ),
  },
);

type LoadedActivity = {
  document: WkeActivityV2;
  sourceLabel: string;
  objectUrls: string[];
};

const DEFAULT_ACTIVITY: LoadedActivity = {
  document: hobbiesActivity as WkeActivityV2,
  sourceLabel: "Built-in hobbies fixture",
  objectUrls: [],
};

export function ExploreHotspotsPilot() {
  const [generation, setGeneration] = useState(0);
  const [loaded, setLoaded] = useState<LoadedActivity>(DEFAULT_ACTIVITY);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    objectUrlsRef.current = loaded.objectUrls;
  }, [loaded.objectUrls]);

  useEffect(() => {
    return () => {
      revokeImportedObjectUrls(objectUrlsRef.current);
    };
  }, []);

  const lessonId = `activity-${loaded.document.id}`;
  const screens = useMemo(
    () => [wkeActivityToLessonScreen(loaded.document, lessonId)],
    [loaded.document, lessonId],
  );

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportNotice(null);
    try {
      const imported = await importLessonPlayerHotspotPack(file);
      revokeImportedObjectUrls(objectUrlsRef.current);
      setLoaded({
        document: imported.document,
        sourceLabel: imported.sourceName,
        objectUrls: imported.objectUrls,
      });
      setGeneration((n) => n + 1);
      setImportNotice(`Loaded ${imported.sourceName}.`);
    } catch (error) {
      setImportNotice(error instanceof Error ? error.message : "Could not import pack.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      <KidPanel>
        <h1 className="text-2xl font-extrabold text-kid-ink">
          Explore hotspots (pilot)
        </h1>
        <p className="mt-1 text-sm font-semibold text-kid-ink/80">
          Studio student view from a{" "}
          <code className="font-mono text-xs">.wkeactivity</code> export. Drop a
          Lesson Player pack from EDU Studio to try a new activity.
        </p>
        <p className="mt-2 text-xs font-semibold text-kid-ink/70">
          Source: {loaded.sourceLabel}
        </p>
      </KidPanel>

      <KidPanel className="border-dashed border-sky-700/40 bg-sky-50/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-kid-ink">Import Studio pack</p>
            <p className="mt-1 text-xs font-semibold text-kid-ink/70">
              Accepts <code className="font-mono">.lessonplayer.zip</code> or{" "}
              <code className="font-mono">.wkeactivity.json</code>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <KidButton
              type="button"
              variant="secondary"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
            >
              {importing ? "Importing…" : "Choose file"}
            </KidButton>
            <KidButton
              type="button"
              variant="secondary"
              onClick={() => {
                revokeImportedObjectUrls(objectUrlsRef.current);
                setLoaded(DEFAULT_ACTIVITY);
                setGeneration((n) => n + 1);
                setImportNotice("Restored built-in hobbies fixture.");
              }}
            >
              Reset fixture
            </KidButton>
          </div>
        </div>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept=".json,.zip,.wkeactivity.json,application/json,application/zip"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImportFile(file);
            event.target.value = "";
          }}
        />
        <div
          className="mt-3 rounded-xl border-2 border-dashed border-sky-600/40 bg-white/80 px-4 py-6 text-center text-sm font-semibold text-kid-ink/70"
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
          Drop export pack here
        </div>
        {importNotice ? (
          <p className="mt-2 text-sm font-bold text-sky-900">{importNotice}</p>
        ) : null}
      </KidPanel>

      <div className="min-h-[min(75dvh,640px)]">
        <LessonPlayer
          key={generation}
          lessonId={lessonId}
          lessonTitle={loaded.document.name}
          screens={screens}
          mode="preview"
        />
      </div>

      <div className="flex justify-center">
        <KidButton
          type="button"
          variant="secondary"
          onClick={() => setGeneration((n) => n + 1)}
        >
          Remount player
        </KidButton>
      </div>
    </div>
  );
}
