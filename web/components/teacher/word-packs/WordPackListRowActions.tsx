"use client";

import Link from "next/link";
import { useState } from "react";
import { MakePackFlashcardsOverlay } from "@/components/teacher/word-packs/MakePackFlashcardsOverlay";
import { MakePackQuizOverlay } from "@/components/teacher/word-packs/MakePackQuizOverlay";
import {
  archiveTeacherWordPackFromForm,
  duplicateTeacherWordPackFromForm,
} from "@/lib/actions/teacher-word-packs";

type Props = {
  packId: string;
  title: string;
  wordIds: readonly string[];
};

export function WordPackListRowActions({ packId, title, wordIds }: Props) {
  const [quizOpen, setQuizOpen] = useState(false);
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setQuizOpen(true)}
          className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
        >
          Make a quiz
        </button>
        <button
          type="button"
          onClick={() => setFlashcardsOpen(true)}
          className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
        >
          Make flashcards
        </button>
        <form action={duplicateTeacherWordPackFromForm}>
          <input type="hidden" name="pack_id" value={packId} />
          <button
            type="submit"
            className="text-xs font-semibold text-neutral-600 underline hover:text-neutral-900"
          >
            Duplicate
          </button>
        </form>
        <form
          action={archiveTeacherWordPackFromForm}
          onSubmit={(event) => {
            if (!window.confirm(`Archive “${title}”?`)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="pack_id" value={packId} />
          <button type="submit" className="text-xs font-semibold text-red-700 underline hover:text-red-900">
            Archive
          </button>
        </form>
        <Link
          href={`/teacher/word-packs/${packId}`}
          className="rounded bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-neutral-800"
        >
          Open
        </Link>
      </div>
      <MakePackQuizOverlay
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
        packId={packId}
        packTitle={title}
        wordIds={wordIds}
      />
      <MakePackFlashcardsOverlay
        open={flashcardsOpen}
        onClose={() => setFlashcardsOpen(false)}
        packId={packId}
        packTitle={title}
        wordIds={wordIds}
      />
    </>
  );
}
