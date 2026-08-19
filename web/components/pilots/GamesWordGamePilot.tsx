"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { useStudioPackQuerySource } from "@/components/pilots/useStudioPackQuerySource";
import type { GamesWordGameFormat } from "@/lib/activity-builder/games/types-word-games";
import {
  parseGamesWordGameLessonPlayerPack,
  type GamesWordGameLessonPlayerPack,
} from "@/lib/games-word-games/parse-games-pack";
import type { LessonScreenRow } from "@/lib/lesson/types";

const LessonPlayer = dynamic(
  () => import("@/components/lesson/LessonPlayer").then((module) => ({ default: module.LessonPlayer })),
  { ssr: false },
);

const FORMAT_LABEL: Record<GamesWordGameFormat, string> = {
  wordsearch: "Word search",
  crossword: "Crossword",
  memory: "Memory",
};

function samplePack(format: GamesWordGameFormat): GamesWordGameLessonPlayerPack {
  const common = {
    type: "interaction" as const,
    subtype: format,
    prompt:
      format === "wordsearch"
        ? "Find every word in the grid."
        : format === "crossword"
          ? "Use the clues to complete the crossword."
          : "Match each word to its picture.",
    quiz_group_id: `sample-${format}`,
    quiz_group_title: `Sample ${FORMAT_LABEL[format]}`,
    quiz_group_order: 0,
  };
  const screen =
    format === "wordsearch"
      ? { ...common, subtype: "wordsearch" as const, grid_size: 10, allow_backwards: false, words: [
          { id: "apple", word: "apple" }, { id: "banana", word: "banana" }, { id: "orange", word: "orange" },
        ] }
      : format === "crossword"
        ? { ...common, subtype: "crossword" as const, entries: [
            { id: "apple", answer: "apple", clue: "A round fruit that may be red or green." },
            { id: "banana", answer: "banana", clue: "A long yellow fruit." },
            { id: "orange", answer: "orange", clue: "A citrus fruit and a color." },
          ] }
        : { ...common, subtype: "memory" as const, pairs: [
            { id: "painting", word: "painting", text: "painting", text_kind: "word" as const, image_url: "/pilots/games-flashcards/hobbies/01-painting.webp", image_fit: "contain" as const },
            { id: "drawing", word: "drawing", text: "drawing", text_kind: "word" as const, image_url: "/pilots/games-flashcards/hobbies/02-drawing.webp", image_fit: "contain" as const },
            { id: "singing", word: "singing", text: "singing", text_kind: "word" as const, image_url: "/pilots/games-flashcards/hobbies/03-singing.webp", image_fit: "contain" as const },
          ] };
  return parseGamesWordGameLessonPlayerPack({
    version: 1,
    kind: "lessonplayer-games-pack",
    format,
    quiz_group_id: `sample-${format}`,
    quiz_group_title: `Sample ${FORMAT_LABEL[format]}`,
    activity_name: `Sample ${FORMAT_LABEL[format]}`,
    screens: [screen],
  }, format);
}

export function GamesWordGamePilot({ format }: { format: GamesWordGameFormat }) {
  const remote = useStudioPackQuerySource();
  const resolved = useMemo(() => {
    const fallback = samplePack(format);
    if (!remote.rawPack || !remote.sourceKind) {
      return { pack: fallback, notice: remote.notice };
    }
    try {
      const pack = parseGamesWordGameLessonPlayerPack(remote.rawPack, format);
      return { pack, notice: `Loaded ${pack.activity_name} from Activity Bank.` };
    } catch (error) {
      return {
        pack: fallback,
        notice: error instanceof Error ? error.message : "Could not load activity.",
      };
    }
  }, [format, remote.notice, remote.rawPack, remote.sourceKind]);
  const { pack, notice } = resolved;

  const screens = useMemo<LessonScreenRow[]>(() => pack.screens.map((payload, index) => ({
    id: `pilot-${format}-${index}`,
    lesson_id: `pilot-${format}`,
    order_index: index,
    screen_type: "interaction",
    payload,
  })), [format, pack.screens]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <KidPanel>
        <h1 className="text-2xl font-extrabold text-kid-ink">Quizzes · {FORMAT_LABEL[format]}</h1>
        <p className="mt-1 text-sm font-semibold text-kid-ink/70">
          {remote.loading ? "Loading Activity Bank preview…" : `Playing: ${pack.activity_name}`}
        </p>
        {notice ? <p className="mt-2 text-xs font-bold text-kid-ink/70">{notice}</p> : null}
      </KidPanel>
      {remote.loading ? (
        <KidPanel><p className="text-center font-extrabold text-kid-ink">Loading activity…</p></KidPanel>
      ) : (
        <div className="min-h-[min(78dvh,680px)]">
          <LessonPlayer lessonId={`pilot-${format}`} lessonTitle={pack.activity_name} screens={screens} mode="preview" />
        </div>
      )}
    </div>
  );
}
