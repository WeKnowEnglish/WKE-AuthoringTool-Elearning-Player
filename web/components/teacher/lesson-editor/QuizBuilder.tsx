"use client";

import { useMemo, useState } from "react";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import {
  addQuestionToQuiz,
  removeFromQuiz,
} from "@/lib/actions/teacher";
import type { LessonScreenRow } from "@/lib/data/catalog";
import {
  QUIZ_SUBTYPE_LABELS,
  QUIZ_SUBTYPES,
} from "@/lib/lesson-activity-taxonomy";
import { screenOutlineLabel } from "@/lib/lesson-screen-outline";
import { getInteractionSubtype } from "@/lib/lesson-schemas";
import { ScreenEditorCard } from "@/components/teacher/lesson-editor/ScreenEditorCard";
import { FitScaledLessonPreview } from "@/components/teacher/lesson-editor/FitScaledLessonPreview";
import { useTeacherEditorHeader } from "@/components/teacher/TeacherEditorHeaderContext";

type Props = {
  lessonId: string;
  moduleId: string;
  moduleSlug: string;
  lessonSlug: string;
  lessonTitle: string;
  quizGroupId: string;
  groupScreens: LessonScreenRow[];
  liveScreens: LessonScreenRow[];
  bumpScreenPayload: (screenId: string, payload: unknown) => void;
};

export function QuizBuilder({
  lessonId,
  moduleId,
  moduleSlug,
  lessonSlug,
  lessonTitle,
  quizGroupId,
  groupScreens,
  liveScreens,
  bumpScreenPayload,
}: Props) {
  const { notifyScreenSaved } = useTeacherEditorHeader();
  const ordered = useMemo(
    () =>
      [...groupScreens].sort((a, b) => {
        const ao = (a.payload as { quiz_group_order?: number }).quiz_group_order ?? 0;
        const bo = (b.payload as { quiz_group_order?: number }).quiz_group_order ?? 0;
        return ao - bo;
      }),
    [groupScreens],
  );

  const [pickedId, setPickedId] = useState<string | null>(null);
  const effectiveId = useMemo(() => {
    const first = ordered[0]?.id ?? "";
    if (pickedId != null && ordered.some((s) => s.id === pickedId)) return pickedId;
    return first;
  }, [ordered, pickedId]);

  const selected = ordered.find((s) => s.id === effectiveId) ?? ordered[0];
  const previewIndex = selected
    ? liveScreens.findIndex((s) => s.id === selected.id)
    : 0;

  const groupTitle =
    (ordered[0]?.payload as { quiz_group_title?: string })?.quiz_group_title?.trim() ??
    "Quiz";

  return (
    <div className="flex min-h-[min(85vh,780px)] flex-col gap-4 lg:flex-row lg:items-stretch">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col space-y-2 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3">
        <h3 className="shrink-0 text-sm font-bold text-neutral-900">Live preview</h3>
        <p className="shrink-0 text-xs text-neutral-600">
          Full lesson navigation; selected question is the starting screen.
        </p>
        <div className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded border border-neutral-300 bg-white">
          <FitScaledLessonPreview
            measureKey={`${effectiveId}-${previewIndex}`}
            className="p-2"
          >
            {liveScreens.length > 0 && previewIndex >= 0 ? (
              <LessonPlayer
                key={`${effectiveId}-${previewIndex}`}
                mode="preview"
                lessonId={lessonId}
                lessonTitle={lessonTitle}
                screens={liveScreens}
                initialScreenIndex={previewIndex}
              />
            ) : (
              <p className="text-sm text-neutral-600">No screens.</p>
            )}
          </FitScaledLessonPreview>
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-col gap-3 lg:w-[380px] lg:shrink-0">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">Question bank</h3>
          <p className="text-xs text-neutral-600">
            {groupTitle} · {ordered.length} question{ordered.length === 1 ? "" : "s"}
          </p>
        </div>
        <form
          className="flex flex-wrap items-end gap-2 rounded border border-neutral-200 bg-white p-2"
          action={addQuestionToQuiz.bind(null, lessonId, moduleId)}
        >
          <input type="hidden" name="quiz_group_id" value={quizGroupId} />
          <label className="min-w-[160px] flex-1 text-xs font-medium text-neutral-700">
            Add question type
            <select
              name="subtype"
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
              defaultValue="mc_quiz"
            >
              {QUIZ_SUBTYPES.map((st) => (
                <option key={st} value={st}>
                  {QUIZ_SUBTYPE_LABELS[st]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
          >
            Add
          </button>
        </form>
        <ul className="max-h-52 space-y-1 overflow-y-auto rounded border border-neutral-200 bg-white p-1">
          {ordered.map((s) => {
            const sub = getInteractionSubtype(s.payload) ?? "?";
            const label = screenOutlineLabel(s, liveScreens);
            const active = s.id === effectiveId;
            return (
              <li key={s.id}>
                <div className="flex items-stretch gap-1">
                  <button
                    type="button"
                    onClick={() => setPickedId(s.id)}
                    className={
                      active ?
                        "min-w-0 flex-1 rounded border border-sky-600 bg-sky-50 px-2 py-1.5 text-left text-xs font-semibold text-sky-950"
                      : "min-w-0 flex-1 rounded border border-transparent px-2 py-1.5 text-left text-xs hover:bg-neutral-50"
                    }
                  >
                    <span className="font-mono text-[10px] text-neutral-500">{sub}</span>
                    <span className="line-clamp-2 block">{label}</span>
                  </button>
                  <form
                    action={removeFromQuiz.bind(null, s.id, lessonId, moduleId)}
                    className="shrink-0"
                  >
                    <button
                      type="submit"
                      className="h-full rounded border border-red-200 bg-red-50 px-2 text-[10px] font-semibold text-red-800 hover:bg-red-100"
                      title="Remove from quiz (screen stays in lesson)"
                    >
                      Out
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-visible rounded-lg border border-neutral-200 bg-white p-0 shadow-sm">
          {selected ? (
            <ScreenEditorCard
              key={selected.id}
              screen={selected}
              index={liveScreens.findIndex((x) => x.id === selected.id)}
              lessonId={lessonId}
              moduleId={moduleId}
              isSelected
              onSelect={() => setPickedId(selected.id)}
              bumpScreenPayload={bumpScreenPayload}
              showInlineSaveToolbar
              onPersistSuccess={notifyScreenSaved}
            />
          ) : (
            <p className="p-4 text-sm text-neutral-600">No questions in this quiz.</p>
          )}
        </div>
        <p className="text-[11px] text-neutral-500">
          Student URL when published:{" "}
          <code className="break-all rounded bg-neutral-100 px-1">
            /learn/{moduleSlug}/{lessonSlug}
          </code>
        </p>
      </div>
    </div>
  );
}
