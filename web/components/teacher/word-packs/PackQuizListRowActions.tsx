"use client";

import { useState } from "react";
import { archiveTeacherPackQuizFromForm } from "@/lib/actions/pack-quiz";
import { AssignPackQuizHomeworkOverlay } from "@/components/teacher/word-packs/AssignPackQuizHomeworkOverlay";
import { PackQuizEditorOverlay } from "@/components/teacher/word-packs/PackQuizEditorOverlay";
import { SavedPackQuizPreviewOverlay } from "@/components/teacher/word-packs/SavedPackQuizPreviewOverlay";
import type { PackQuizFormat } from "@/lib/vocabulary/pack-quiz";

type ClassOption = {
  id: string;
  title: string;
};

type Props = {
  quizId: string;
  title: string;
  questionCount: number;
  format: PackQuizFormat;
  packId: string | null;
  packClassId: string | null;
  classes: readonly ClassOption[];
};

export function PackQuizListRowActions({
  quizId,
  title,
  questionCount,
  format,
  packId,
  packClassId,
  classes,
}: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="rounded bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-neutral-800"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={() => setAssignOpen(true)}
          disabled={questionCount < 1}
          title={questionCount < 1 ? "Quiz has no questions" : undefined}
          className="rounded bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          Assign
        </button>
        <form
          action={archiveTeacherPackQuizFromForm}
          onSubmit={(event) => {
            if (!window.confirm(`Archive “${title}”?`)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="quiz_id" value={quizId} />
          <button type="submit" className="text-xs font-semibold text-red-700 underline hover:text-red-900">
            Archive
          </button>
        </form>
      </div>
      <PackQuizEditorOverlay
        open={editOpen}
        onClose={() => setEditOpen(false)}
        quizId={quizId}
        quizTitle={title}
      />
      <SavedPackQuizPreviewOverlay
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        quizId={quizId}
        quizTitle={title}
      />
      <AssignPackQuizHomeworkOverlay
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        quizId={quizId}
        quizTitle={title}
        questionCount={questionCount}
        format={format}
        packId={packId}
        packClassId={packClassId}
        classes={classes}
      />
    </>
  );
}
