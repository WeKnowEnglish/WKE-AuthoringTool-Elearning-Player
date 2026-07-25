"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import bakeryListenChoose from "@/content/pilots/games-listen-choose/bakery-listen-choose.json";
import hobbiesListenChoose from "@/content/pilots/games-listen-choose/hobbies-listen-choose.json";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  importGamesListenAndChoosePack,
  revokeImportedObjectUrls,
} from "@/lib/games-listen-choose/import-games-pack";
import {
  parseGamesListenAndChooseLessonPlayerPack,
  type GamesListenAndChooseLessonPlayerPack,
} from "@/lib/games-listen-choose/parse-games-pack";
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
        <p className="text-lg font-extrabold text-kid-ink">Loading activity…</p>
      </div>
    ),
  },
);

const BUILTIN_FIXTURES = {
  hobbies: {
    label: "Listen and Choose Hobbies",
    pack: parseGamesListenAndChooseLessonPlayerPack(hobbiesListenChoose),
  },
  bakery: {
    label: "Bakery (placeholder)",
    pack: parseGamesListenAndChooseLessonPlayerPack(bakeryListenChoose),
  },
} as const;

type BuiltinKey = keyof typeof BUILTIN_FIXTURES;

export function GamesListenAndChoosePilot() {
  const [builtinKey, setBuiltinKey] = useState<BuiltinKey>("hobbies");
  const [pack, setPack] = useState<GamesListenAndChooseLessonPlayerPack>(
    BUILTIN_FIXTURES.hobbies.pack,
  );
  const [sourceName, setSourceName] = useState(BUILTIN_FIXTURES.hobbies.label);
  const [generation, setGeneration] = useState(0);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      revokeImportedObjectUrls(objectUrlsRef.current);
    };
  }, []);

  const screens = useMemo((): LessonScreenRow[] => {
    return pack.screens.map((payload, index) => ({
      id: `screen-games-listen-${index}`,
      lesson_id: "pilot-games-listen-choose",
      order_index: index,
      screen_type: "interaction",
      payload,
    }));
  }, [pack]);

  function loadBuiltin(key: BuiltinKey) {
    const fixture = BUILTIN_FIXTURES[key];
    revokeImportedObjectUrls(objectUrlsRef.current);
    objectUrlsRef.current = [];
    setBuiltinKey(key);
    setPack(fixture.pack);
    setSourceName(fixture.label);
    setGeneration((n) => n + 1);
    setImportNotice(`Loaded ${fixture.label}.`);
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportNotice(null);
    try {
      const imported = await importGamesListenAndChoosePack(file);
      revokeImportedObjectUrls(objectUrlsRef.current);
      objectUrlsRef.current = imported.objectUrls;
      setPack(imported.pack);
      setSourceName(file.name);
      setGeneration((n) => n + 1);
      setImportNotice(
        `Loaded ${file.name} (${imported.pack.screens.length} items${
          imported.mode === "zip" ? ", zip assets" : ""
        }).`,
      );
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
            <h1 className="text-2xl font-extrabold text-kid-ink">
              Quizzes · Listen and choose (pilot)
            </h1>
            <p className="mt-1 text-sm font-semibold text-kid-ink/80">
              Short dialog (TTS or audio) with Listen / Replay, then pick 1 of 3 pictures.
            </p>
            <p className="mt-2 text-xs font-semibold text-kid-ink/60">
              Playing: {sourceName}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(BUILTIN_FIXTURES) as BuiltinKey[]).map((key) => (
              <KidButton
                key={key}
                type="button"
                variant={
                  builtinKey === key && sourceName === BUILTIN_FIXTURES[key].label
                    ? "primary"
                    : "secondary"
                }
                onClick={() => loadBuiltin(key)}
              >
                {BUILTIN_FIXTURES[key].label}
              </KidButton>
            ))}
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
            <p className="text-sm font-extrabold text-kid-ink">Import Studio export</p>
            <p className="mt-1 text-xs font-semibold text-kid-ink/70">
              Accepts{" "}
              <code className="font-mono">.games-listen.lessonplayer.zip</code> or{" "}
              <code className="font-mono">.games-listen.lessonplayer.json</code>.
            </p>
            {importNotice && (
              <p className="mt-2 text-xs font-bold text-kid-ink/80">{importNotice}</p>
            )}
          </div>
          <KidButton
            type="button"
            variant="secondary"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
          >
            {importing ? "Importing…" : "Choose file"}
          </KidButton>
        </div>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept=".json,.zip,.lessonplayer.zip,application/json,application/zip"
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
          Drop Lesson Player games pack JSON or zip here
        </div>
      </KidPanel>

      <div className="min-h-[min(75dvh,640px)]">
        <LessonPlayer
          key={generation}
          lessonId="pilot-games-listen-choose"
          lessonTitle={pack.activity_name}
          screens={screens}
          mode="preview"
        />
      </div>
    </div>
  );
}
