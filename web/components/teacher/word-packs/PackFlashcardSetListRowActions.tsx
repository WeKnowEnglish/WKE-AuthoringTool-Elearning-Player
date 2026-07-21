"use client";

import { useState } from "react";
import { AssignPackFlashcardHomeworkOverlay } from "@/components/teacher/word-packs/AssignPackFlashcardHomeworkOverlay";
import { archiveTeacherPackFlashcardSetFromForm } from "@/lib/actions/pack-flashcards";

type ClassOption = {
  id: string;
  title: string;
};

type Props = {
  setId: string;
  title: string;
  cardCount: number;
  packId: string | null;
  packClassId: string | null;
  classes: readonly ClassOption[];
};

export function PackFlashcardSetListRowActions({
  setId,
  title,
  cardCount,
  packId,
  packClassId,
  classes,
}: Props) {
  const [assignOpen, setAssignOpen] = useState(false);

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAssignOpen(true)}
          disabled={cardCount < 1}
          title={cardCount < 1 ? "Set has no cards" : undefined}
          className="rounded bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          Assign
        </button>
        <form
          action={archiveTeacherPackFlashcardSetFromForm}
          onSubmit={(event) => {
            if (!window.confirm(`Archive “${title}”?`)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="set_id" value={setId} />
          <button
            type="submit"
            className="text-xs font-semibold text-red-700 underline hover:text-red-900"
          >
            Archive
          </button>
        </form>
      </div>
      <AssignPackFlashcardHomeworkOverlay
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        setId={setId}
        setTitle={title}
        cardCount={cardCount}
        packId={packId}
        packClassId={packClassId}
        classes={classes}
      />
    </>
  );
}
