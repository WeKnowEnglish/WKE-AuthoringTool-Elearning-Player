"use client";

import { archiveTeacherPackFlashcardSetFromForm } from "@/lib/actions/pack-flashcards";

type Props = {
  setId: string;
  title: string;
};

export function PackFlashcardSetListRowActions({ setId, title }: Props) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
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
  );
}
