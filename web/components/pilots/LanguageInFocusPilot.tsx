"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import hobbiesLanguageInFocus from "@/content/pilots/language-in-focus/hobbies-like-ing.json";
import playgroundCanCant from "@/content/pilots/language-in-focus/playground-can-cant.json";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { languageInFocusPayloadSchema } from "@/lib/lesson-schemas";
import type { LanguageInFocusPayload } from "@/lib/lesson-schemas";
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
    label: "Hobbies · like + -ing",
    payload: languageInFocusPayloadSchema.parse(hobbiesLanguageInFocus),
  },
  canCant: {
    label: "Playground · can / can't",
    payload: languageInFocusPayloadSchema.parse(playgroundCanCant),
  },
} as const;

type BuiltinKey = keyof typeof BUILTIN_FIXTURES;

function parseImportedPayload(raw: unknown): LanguageInFocusPayload {
  if (
    raw &&
    typeof raw === "object" &&
    "interaction" in raw &&
    (raw as { interaction?: { type?: string } }).interaction?.type === "language-in-focus"
  ) {
    throw new Error(
      "This looks like a Studio authoring document. Export for Lesson Player first, then drop the .lessonplayer.json file.",
    );
  }
  return languageInFocusPayloadSchema.parse(raw);
}

export function LanguageInFocusPilot() {
  const [builtinKey, setBuiltinKey] = useState<BuiltinKey>("hobbies");
  const [payload, setPayload] = useState<LanguageInFocusPayload>(
    BUILTIN_FIXTURES.hobbies.payload,
  );
  const [sourceName, setSourceName] = useState<string>(BUILTIN_FIXTURES.hobbies.label);
  const [generation, setGeneration] = useState(0);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const screens = useMemo((): LessonScreenRow[] => {
    return [
      {
        id: "screen-language-in-focus-pilot",
        lesson_id: "pilot-language-in-focus",
        order_index: 0,
        screen_type: "interaction",
        payload,
      },
    ];
  }, [payload]);

  function loadBuiltin(key: BuiltinKey) {
    const fixture = BUILTIN_FIXTURES[key];
    setBuiltinKey(key);
    setPayload(fixture.payload);
    setSourceName(fixture.label);
    setGeneration((n) => n + 1);
    setImportNotice(`Loaded ${fixture.label}.`);
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportNotice(null);
    try {
      const text = await file.text();
      const next = parseImportedPayload(JSON.parse(text));
      setPayload(next);
      setSourceName(file.name);
      setGeneration((n) => n + 1);
      setImportNotice(`Loaded ${file.name}.`);
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
              Language in focus (pilot)
            </h1>
            <p className="mt-1 text-sm font-semibold text-kid-ink/80">
              Preset-driven listen → rebuild → remix. Switch patterns below, or import a
              Studio export.
            </p>
            <p className="mt-2 text-xs font-semibold text-kid-ink/60">
              Playing: {sourceName}
            </p>
          </div>
          <KidButton
            type="button"
            variant="secondary"
            onClick={() => setGeneration((n) => n + 1)}
          >
            Reset activity
          </KidButton>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(BUILTIN_FIXTURES) as BuiltinKey[]).map((key) => (
            <KidButton
              key={key}
              type="button"
              variant={builtinKey === key && sourceName === BUILTIN_FIXTURES[key].label ? "primary" : "secondary"}
              onClick={() => loadBuiltin(key)}
            >
              {BUILTIN_FIXTURES[key].label}
            </KidButton>
          ))}
        </div>
      </KidPanel>

      <KidPanel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-kid-ink">Import Studio export</p>
            <p className="mt-1 text-xs font-semibold text-kid-ink/70">
              Drop a{" "}
              <code className="font-mono">.language-in-focus.lessonplayer.json</code> from
              EDU Studio.
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
          Drop Lesson Player JSON here
        </div>
      </KidPanel>

      <div className="min-h-[min(75dvh,640px)]">
        <LessonPlayer
          key={generation}
          lessonId="pilot-language-in-focus"
          lessonTitle={payload.activity_name ?? "Language in focus"}
          screens={screens}
          mode="preview"
        />
      </div>
    </div>
  );
}
