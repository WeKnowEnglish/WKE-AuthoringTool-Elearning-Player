"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import bakeryFlashcards from "@/content/pilots/games-flashcards/bakery-flashcards.json";
import hobbiesFlashcards from "@/content/pilots/games-flashcards/hobbies-flashcards.json";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  parseGamesFlashcardsLessonPlayerPack,
  type GamesFlashcardsLessonPlayerPack,
} from "@/lib/games-flashcards/parse-games-pack";
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
        <p className="text-lg font-extrabold text-kid-ink">Loading flashcards…</p>
      </div>
    ),
  },
);

const BUILTIN_FIXTURES = {
  hobbies: {
    label: "Our favorite hobbies",
    pack: parseGamesFlashcardsLessonPlayerPack(hobbiesFlashcards),
  },
  bakery: {
    label: "Bakery flashcards",
    pack: parseGamesFlashcardsLessonPlayerPack(bakeryFlashcards),
  },
} as const;

type BuiltinKey = keyof typeof BUILTIN_FIXTURES;

export function GamesFlashcardsPilot() {
  const searchParams = useSearchParams();
  const inboxId = searchParams.get("inbox")?.trim() || null;

  const [pack, setPack] = useState<GamesFlashcardsLessonPlayerPack>(
    BUILTIN_FIXTURES.hobbies.pack,
  );
  const [sourceName, setSourceName] = useState(BUILTIN_FIXTURES.hobbies.label);
  const [generation, setGeneration] = useState(0);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [inboxLoading, setInboxLoading] = useState(Boolean(inboxId));
  const fileRef = useRef<HTMLInputElement>(null);
  const loadedInboxRef = useRef<string | null>(null);

  const screens = useMemo((): LessonScreenRow[] => {
    return pack.screens.map((payload, index) => ({
      id: `screen-games-flashcards-${index}`,
      lesson_id: "pilot-games-flashcards",
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
        const next = parseGamesFlashcardsLessonPlayerPack(payload.pack);
        setPack(next);
        setSourceName(payload.filename?.trim() || next.activity_name);
        setGeneration((n) => n + 1);
        const cardCount = next.screens.reduce((sum, screen) => sum + screen.cards.length, 0);
        setImportNotice(
          `Loaded from Studio inbox (${cardCount} card${cardCount === 1 ? "" : "s"}).`,
        );
      } catch (error) {
        setImportNotice(error instanceof Error ? error.message : "Inbox load failed.");
      } finally {
        setInboxLoading(false);
      }
    })();
  }, [inboxId]);

  function loadBuiltin(key: BuiltinKey) {
    const fixture = BUILTIN_FIXTURES[key];
    setPack(fixture.pack);
    setSourceName(fixture.label);
    setGeneration((n) => n + 1);
    setImportNotice(`Loaded ${fixture.label}.`);
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportNotice(null);
    try {
      const next = parseGamesFlashcardsLessonPlayerPack(JSON.parse(await file.text()));
      setPack(next);
      setSourceName(file.name);
      setGeneration((n) => n + 1);
      const cardCount = next.screens.reduce((sum, screen) => sum + screen.cards.length, 0);
      setImportNotice(`Loaded ${file.name} (${cardCount} cards).`);
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
              Quizzes · Flashcards (pilot)
            </h1>
            <p className="mt-1 text-sm font-semibold text-kid-ink/80">
              Studio Quiz flashcard decks play as Lesson Player flashcards screens.
            </p>
            <p className="mt-2 text-xs font-semibold text-kid-ink/60">
              Playing: {inboxLoading ? "Loading Studio pack…" : sourceName}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <KidButton type="button" variant="secondary" onClick={() => loadBuiltin("hobbies")}>
              Our favorite hobbies
            </KidButton>
            <KidButton type="button" variant="secondary" onClick={() => loadBuiltin("bakery")}>
              Bakery
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
            <p className="text-sm font-extrabold text-kid-ink">Import Studio export</p>
            <p className="mt-1 text-xs font-semibold text-kid-ink/70">
              Drop a{" "}
              <code className="font-mono">.games-flashcards.lessonplayer.json</code> from EDU
              Studio Quiz, or use <strong>Play in Lesson Player</strong> from Studio (inbox
              handoff).
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
          Drop Lesson Player flashcards pack JSON here
        </div>
      </KidPanel>

      <div className="min-h-[min(75dvh,640px)]">
        {inboxLoading ? (
          <div className="rounded-2xl border-2 border-kid-ink/20 bg-white px-6 py-10 text-center">
            <p className="text-lg font-extrabold text-kid-ink">Loading Studio pack…</p>
          </div>
        ) : (
          <LessonPlayer
            key={generation}
            lessonId="pilot-games-flashcards"
            lessonTitle={pack.activity_name}
            screens={screens}
            mode="preview"
          />
        )}
      </div>
    </div>
  );
}
