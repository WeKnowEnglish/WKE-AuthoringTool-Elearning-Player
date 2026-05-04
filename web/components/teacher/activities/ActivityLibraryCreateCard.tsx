"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createActivityLibraryFromQuizPreview,
  type CreateQuizGeneratorState,
} from "@/lib/actions/teacher";
import { ActivityLibraryTableImport } from "@/components/teacher/activities/ActivityLibraryTableImport";
import { buildGenerateQuizOptions } from "@/lib/quiz-generator-options";
import { generateQuiz } from "@/lib/quiz-builder-brain";
import type { CefrLevel, QuizSession } from "@/types/quiz-builder-brain";
import type { QuizPreviewSaveBundle } from "@/lib/quiz-preview-bundle";
import { clsx } from "clsx";

const tabBtn =
  "flex-1 border-b-2 px-3 py-2.5 text-center text-sm font-semibold transition-colors sm:px-4";

const PREVIEW_QUESTION_CAP = 5;

const TYPE_LABEL: Record<string, string> = {
  mcq: "Multiple choice",
  fill_blank: "Fill in the blank",
  letter_scramble: "Letter scramble",
};

export function ActivityLibraryCreateCard() {
  const [tab, setTab] = useState<"quiz" | "spreadsheet">("quiz");
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<QuizSession | null>(null);
  const [bundle, setBundle] = useState<QuizPreviewSaveBundle | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [saveState, saveAction, savePending] = useActionState<
    CreateQuizGeneratorState,
    FormData
  >(createActivityLibraryFromQuizPreview, { status: "idle" });

  useEffect(() => {
    if (saveState.status === "success") {
      setPreview(null);
      setBundle(null);
      setPreviewError(null);
      formRef.current?.reset();
    }
  }, [saveState.status]);

  const handlePreview = () => {
    setPreviewError(null);
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const title = `${fd.get("title") ?? ""}`.trim();
    if (!title) {
      setPreviewError("Enter a title before preview.");
      setPreview(null);
      setBundle(null);
      return;
    }
    const preset = `${fd.get("preset") ?? "quick"}`.trim();
    const topicPractice = `${fd.get("topic_practice") ?? "food"}`.trim();
    const levelRaw = `${fd.get("level") ?? "A1"}`.trim();
    const questionCount = Math.min(20, Math.max(5, Number(fd.get("question_count") ?? 10)));

    if (levelRaw !== "A1" && levelRaw !== "A2") {
      setPreviewError("Level must be A1 or A2.");
      setPreview(null);
      setBundle(null);
      return;
    }
    if (preset !== "quick" && preset !== "topic") {
      setPreviewError("Invalid mode.");
      setPreview(null);
      setBundle(null);
      return;
    }

    const baseOpts = buildGenerateQuizOptions({
      preset: preset as "quick" | "topic",
      topicPractice,
      level: levelRaw as CefrLevel,
      questionCount,
    });

    let session: QuizSession;
    try {
      session = generateQuiz(baseOpts);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Could not generate quiz.");
      setPreview(null);
      setBundle(null);
      return;
    }

    if (session.questions.length === 0) {
      setPreviewError("No questions were generated. Try A1 or another topic.");
      setPreview(null);
      setBundle(null);
      return;
    }

    const alignedOptions = {
      ...baseOpts,
      questionCount: session.questions.length,
    };

    setPreview(session);
    setBundle({
      title,
      options: alignedOptions,
      quizSession: session,
    });
  };

  const previewSlice = preview?.questions.slice(0, PREVIEW_QUESTION_CAP) ?? [];

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="flex border-b border-neutral-200 bg-neutral-50/80">
        <button
          type="button"
          className={clsx(
            tabBtn,
            tab === "quiz" ? "border-sky-600 text-sky-900" : "border-transparent text-neutral-600 hover:text-neutral-900",
          )}
          onClick={() => setTab("quiz")}
        >
          Quiz generator
        </button>
        <button
          type="button"
          className={clsx(
            tabBtn,
            tab === "spreadsheet" ?
              "border-sky-600 text-sky-900"
            : "border-transparent text-neutral-600 hover:text-neutral-900",
          )}
          onClick={() => setTab("spreadsheet")}
        >
          Spreadsheet import
        </button>
      </div>

      {tab === "quiz" ?
        <div className="p-4">
          <h2 className="text-sm font-bold text-neutral-900">Generate activity</h2>
          <p className="mt-1 text-xs text-neutral-600">
            Preview runs on your device. Save sends the same quiz to the library (no re-roll on the
            server).
          </p>

          {saveState.status === "error" && saveState.message ?
            <p className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-sm text-red-800">
              {saveState.message}
            </p>
          : null}
          {saveState.status === "success" && saveState.message ?
            <p className="mt-2 rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-sm text-emerald-900">
              {saveState.message}
            </p>
          : null}
          {previewError ?
            <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-sm text-amber-950">
              {previewError}
            </p>
          : null}

          <form ref={formRef} action={saveAction} className="mt-3 grid gap-3">
            <label className="text-sm font-medium text-neutral-800">
              Title
              <input
                name="title"
                required
                placeholder="e.g. Food review — Week 3"
                className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                onChange={() => {
                  setPreview(null);
                  setBundle(null);
                }}
              />
            </label>

            <fieldset className="grid gap-2 rounded border border-neutral-200 p-3">
              <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Mode
              </legend>
              <label className="flex cursor-pointer gap-2 text-sm">
                <input
                  type="radio"
                  name="preset"
                  value="quick"
                  defaultChecked
                  className="mt-0.5"
                  onChange={() => {
                    setPreview(null);
                    setBundle(null);
                  }}
                />
                <span>
                  <span className="font-semibold text-neutral-900">Quick Play</span>
                  <span className="mt-0.5 block text-xs text-neutral-600">
                    Random topic from food, body parts, school, or daily life — fast mix.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer gap-2 text-sm">
                <input
                  type="radio"
                  name="preset"
                  value="topic"
                  className="mt-0.5"
                  onChange={() => {
                    setPreview(null);
                    setBundle(null);
                  }}
                />
                <span>
                  <span className="font-semibold text-neutral-900">Topic Practice</span>
                  <span className="mt-0.5 block text-xs text-neutral-600">
                    You choose the topic; mixed question types.
                  </span>
                </span>
              </label>
            </fieldset>

            <label className="text-sm font-medium text-neutral-800">
              Topic (Topic Practice)
              <select
                name="topic_practice"
                className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                defaultValue="food"
                onChange={() => {
                  setPreview(null);
                  setBundle(null);
                }}
              >
                <option value="body_parts">Body parts</option>
                <option value="food">Food</option>
                <option value="daily_life">Verbs (daily life)</option>
                <option value="school">School (verbs)</option>
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-neutral-800">
                Level
                <select
                  name="level"
                  className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                  defaultValue="A1"
                  onChange={() => {
                    setPreview(null);
                    setBundle(null);
                  }}
                >
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                </select>
              </label>
              <label className="text-sm font-medium text-neutral-800">
                Question count
                <select
                  name="question_count"
                  className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                  defaultValue="10"
                  onChange={() => {
                    setPreview(null);
                    setBundle(null);
                  }}
                >
                  {[5, 6, 7, 8, 9, 10, 12, 15].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePreview}
                className="rounded border border-sky-600 bg-white px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50"
              >
                Preview
              </button>
            </div>

            {previewSlice.length > 0 ?
              <div className="rounded border border-neutral-200 bg-neutral-50/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Sample (up to {PREVIEW_QUESTION_CAP} of {preview?.questions.length ?? 0})
                </p>
                <ul className="mt-2 space-y-3">
                  {previewSlice.map((q, i) => (
                    <li key={q.id} className="text-sm text-neutral-900">
                      <span className="text-xs font-medium text-neutral-500">
                        {i + 1}. {TYPE_LABEL[q.type] ?? q.type}
                      </span>
                      <p className="mt-0.5 whitespace-pre-wrap">{q.prompt}</p>
                      {q.type === "mcq" && q.options.length > 0 ?
                        <p className="mt-1 text-xs text-neutral-600">
                          Options: {q.options.join(" · ")}
                        </p>
                      : null}
                    </li>
                  ))}
                </ul>
              </div>
            : null}

            <input
              type="hidden"
              name="quiz_preview_bundle"
              value={bundle ? JSON.stringify(bundle) : ""}
              readOnly
            />

            <div>
              <button
                type="submit"
                disabled={savePending || !bundle}
                className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savePending ? "Saving…" : "Save to library"}
              </button>
              {!bundle ?
                <p className="mt-1 text-xs text-neutral-500">Preview first, then save the same quiz.</p>
              : null}
            </div>
          </form>
        </div>
      : <div className="bg-sky-50/50 p-4">
          <ActivityLibraryTableImport embedded />
        </div>
      }
    </div>
  );
}
