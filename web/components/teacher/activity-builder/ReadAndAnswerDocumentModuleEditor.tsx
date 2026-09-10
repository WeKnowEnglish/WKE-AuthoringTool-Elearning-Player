"use client";

import { Plus, Trash2 } from "lucide-react";
import type { HomeworkCollectionDocumentModulePart } from "@/lib/homework-collections";
import { documentModuleValidationIssues } from "@/lib/homework-collections/document-module";
import { createBlankReadAndAnswerQuestion } from "@/lib/read-and-answer/blank";
import {
  asReadAndAnswerDraft,
  cloneReadAndAnswerDocumentForAuthoring,
} from "@/lib/read-and-answer/draft";
import { createSampleReadAndAnswerDocument } from "@/lib/read-and-answer/sample";
import {
  READ_AND_ANSWER_MAX_QUESTIONS,
  READ_AND_ANSWER_MIN_PASSAGE_CHARS,
  READ_AND_ANSWER_MIN_QUESTIONS,
  type ReadAndAnswerDocument,
  type ReadAndAnswerQuestion,
} from "@/lib/read-and-answer/types";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";

type Props = {
  part: HomeworkCollectionDocumentModulePart;
  onChange: (part: HomeworkCollectionDocumentModulePart) => void;
  /** Activity Bank workspace owns title/instructions here; Track Builder setup already has them. */
  showIdentityFields?: boolean;
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-semibold";

function duplicateQuestion(question: ReadAndAnswerQuestion): ReadAndAnswerQuestion {
  const options = question.options.map((option) => ({
    ...option,
    id: crypto.randomUUID(),
  }));
  const correctIndex = Math.max(
    0,
    question.options.findIndex((option) => option.id === question.correctOptionId),
  );
  return {
    ...question,
    id: crypto.randomUUID(),
    options,
    correctOptionId: options[correctIndex]?.id ?? options[0]?.id ?? "",
  };
}

export function ReadAndAnswerDocumentModuleEditor({
  part,
  onChange,
  showIdentityFields = false,
}: Props) {
  const document = asReadAndAnswerDraft(part.document);
  const issues = documentModuleValidationIssues(part);
  const [questionIndex, setQuestionIndex] = useAuthoringItemIndex(
    document.questions.length,
    `${part.id}-questions`,
  );
  const question = document.questions[questionIndex];
  const passageLength = document.passage.text.trim().length;

  const commit = (
    next: ReadAndAnswerDocument,
    identity?: { title?: string; instructions?: string },
  ) => {
    const passage = { ...next.passage };
    if (!passage.imageUrl?.trim()) {
      delete passage.imageUrl;
      delete passage.imageAlt;
    }
    if (!passage.title?.trim()) delete passage.title;
    const title = identity?.title ?? part.title;
    const instructions = identity?.instructions ?? part.instructions;
    onChange({
      ...part,
      title,
      instructions,
      document: {
        ...next,
        passage,
        title,
        instructions,
      } as unknown as Record<string, unknown>,
    });
  };

  const patchPassage = (patch: Partial<ReadAndAnswerDocument["passage"]>) => {
    commit({
      ...document,
      passage: { ...document.passage, ...patch },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
            Read and answer content
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
            Write a short passage, add an optional picture, then 3–5 questions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const sample = cloneReadAndAnswerDocumentForAuthoring(
              createSampleReadAndAnswerDocument(),
            );
            onChange({
              ...part,
              title: sample.title,
              instructions: sample.instructions,
              document: sample as unknown as Record<string, unknown>,
            });
          }}
          className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-stone-800 hover:bg-stone-50"
        >
          Load sample
        </button>
      </div>

      {showIdentityFields ? (
        <>
          <label className="block text-[11px] font-bold text-stone-700">
            Title
            <input
              value={part.title}
              onChange={(event) =>
                commit(document, { title: event.target.value })
              }
              className={fieldClass}
            />
          </label>
          <label className="block text-[11px] font-bold text-stone-700">
            Student instructions
            <textarea
              value={part.instructions}
              rows={2}
              onChange={(event) =>
                commit(document, { instructions: event.target.value })
              }
              className={fieldClass}
            />
          </label>
        </>
      ) : null}

      <label className="block text-[11px] font-bold text-stone-700">
        Passage title
        <input
          value={document.passage.title ?? ""}
          onChange={(event) => patchPassage({ title: event.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="block text-[11px] font-bold text-stone-700">
        Passage
        <textarea
          value={document.passage.text}
          rows={6}
          onChange={(event) => patchPassage({ text: event.target.value })}
          className={fieldClass}
        />
        <span className="mt-1 block text-[10px] font-semibold text-stone-500">
          {passageLength} characters · need {READ_AND_ANSWER_MIN_PASSAGE_CHARS}+
        </span>
      </label>
      <MediaUrlControls
        label="Passage picture (optional)"
        value={document.passage.imageUrl ?? ""}
        compact
        onChange={(url) =>
          patchPassage({
            imageUrl: url,
            imageAlt: url.trim() ? document.passage.imageAlt ?? "" : "",
          })
        }
      />
      {document.passage.imageUrl?.trim() ? (
        <label className="block text-[11px] font-bold text-stone-700">
          Image alt
          <input
            value={document.passage.imageAlt ?? ""}
            onChange={(event) => patchPassage({ imageAlt: event.target.value })}
            className={fieldClass}
          />
        </label>
      ) : null}

      <label className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
        <input
          type="checkbox"
          checked={document.shuffleOptions}
          onChange={(event) =>
            commit({ ...document, shuffleOptions: event.target.checked })
          }
        />
        Shuffle answer choices for students
      </label>

      <AuthoringItemPager
        count={document.questions.length}
        index={questionIndex}
        onIndexChange={setQuestionIndex}
        label="Question"
        itemLabels={document.questions.map((item) => item.prompt)}
        minCount={READ_AND_ANSWER_MIN_QUESTIONS}
        maxCount={READ_AND_ANSWER_MAX_QUESTIONS}
        stickyNav
        onAdd={() => {
          commit({
            ...document,
            questions: [...document.questions, createBlankReadAndAnswerQuestion()],
          });
          setQuestionIndex(document.questions.length);
        }}
        onDuplicate={() => {
          if (!question) return;
          const questions = [...document.questions];
          questions.splice(questionIndex + 1, 0, duplicateQuestion(question));
          commit({ ...document, questions });
          setQuestionIndex(questionIndex + 1);
        }}
        onRemove={() => {
          if (!question || document.questions.length <= READ_AND_ANSWER_MIN_QUESTIONS) {
            return;
          }
          commit({
            ...document,
            questions: document.questions.filter((item) => item.id !== question.id),
          });
        }}
      >
        {question ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-stone-700">
              Prompt
              <textarea
                value={question.prompt}
                rows={2}
                onChange={(event) =>
                  commit({
                    ...document,
                    questions: document.questions.map((item) =>
                      item.id === question.id
                        ? { ...item, prompt: event.target.value }
                        : item,
                    ),
                  })
                }
                className={fieldClass}
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-[11px] font-bold text-stone-700">
                Answer choices
              </legend>
              {question.options.map((option, optionIndex) => (
                <div
                  key={option.id}
                  className="flex min-w-0 items-center gap-2 rounded-lg border border-stone-200 bg-white p-2"
                >
                  <input
                    type="radio"
                    name={`read-and-answer-correct-${part.id}-${question.id}`}
                    checked={question.correctOptionId === option.id}
                    onChange={() =>
                      commit({
                        ...document,
                        questions: document.questions.map((item) =>
                          item.id === question.id
                            ? { ...item, correctOptionId: option.id }
                            : item,
                        ),
                      })
                    }
                    aria-label={`Mark option ${optionIndex + 1} correct`}
                  />
                  <input
                    value={option.text}
                    onChange={(event) =>
                      commit({
                        ...document,
                        questions: document.questions.map((item) =>
                          item.id === question.id
                            ? {
                                ...item,
                                options: item.options.map((entry) =>
                                  entry.id === option.id
                                    ? { ...entry, text: event.target.value }
                                    : entry,
                                ),
                              }
                            : item,
                        ),
                      })
                    }
                    placeholder={`Option ${optionIndex + 1}`}
                    className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-semibold"
                  />
                  <button
                    type="button"
                    disabled={question.options.length <= 2}
                    onClick={() =>
                      commit({
                        ...document,
                        questions: document.questions.map((item) => {
                          if (item.id !== question.id) return item;
                          const options = item.options.filter(
                            (entry) => entry.id !== option.id,
                          );
                          return {
                            ...item,
                            options,
                            correctOptionId:
                              item.correctOptionId === option.id
                                ? options[0]?.id ?? ""
                                : item.correctOptionId,
                          };
                        }),
                      })
                    }
                    className="shrink-0 text-stone-400 hover:text-rose-700 disabled:opacity-30"
                    aria-label="Delete option"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={question.options.length >= 4}
                onClick={() =>
                  commit({
                    ...document,
                    questions: document.questions.map((item) =>
                      item.id === question.id
                        ? {
                            ...item,
                            options: [
                              ...item.options,
                              { id: crypto.randomUUID(), text: "" },
                            ],
                          }
                        : item,
                    ),
                  })
                }
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" /> Add answer choice
              </button>
            </fieldset>
          </div>
        ) : null}
      </AuthoringItemPager>

      {issues.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-950">
          Fix before assign:
          <ul className="mt-1 list-disc pl-4">
            {issues.slice(0, 6).map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[11px] font-semibold text-emerald-700">
          Read and answer looks valid for assign.
        </p>
      )}
    </div>
  );
}
