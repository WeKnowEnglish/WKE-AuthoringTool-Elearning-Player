"use client";

import { Plus, Trash2 } from "lucide-react";
import type { HomeworkCollectionDocumentModulePart } from "@/lib/homework-collections";
import { documentModuleValidationIssues } from "@/lib/homework-collections/document-module";
import {
  createBlankPictureStoryFrame,
  createBlankPictureStoryQuestion,
} from "@/lib/picture-story/blank";
import {
  asPictureStoryDraft,
  clonePictureStoryDocumentForAuthoring,
  isPictureStoryQuestionType,
} from "@/lib/picture-story/draft";
import { createSamplePictureStoryDocument } from "@/lib/picture-story/sample";
import {
  PICTURE_STORY_MAX_FRAMES,
  PICTURE_STORY_MAX_QUESTIONS,
  PICTURE_STORY_MIN_FRAMES,
  PICTURE_STORY_MIN_QUESTIONS,
  type PictureStoryDocument,
  type PictureStoryQuestion,
} from "@/lib/picture-story/types";
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

function splitCsv(value: string): string[] {
  return value
    .split(/[,|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function duplicateQuestion(question: PictureStoryQuestion): PictureStoryQuestion {
  const optionIds = new Map(
    question.options.map((option) => [option.id, crypto.randomUUID()]),
  );
  const options = question.options.map((option) => ({
    ...option,
    id: optionIds.get(option.id) ?? crypto.randomUUID(),
  }));
  return {
    ...question,
    id: crypto.randomUUID(),
    acceptedAnswers: [...question.acceptedAnswers],
    options,
    correctOptionId: optionIds.get(question.correctOptionId) ?? options[0]?.id ?? "",
  };
}

export function PictureStoryDocumentModuleEditor({
  part,
  onChange,
  showIdentityFields = false,
}: Props) {
  const document = asPictureStoryDraft(part.document);
  const issues = documentModuleValidationIssues(part);
  const [frameIndex, setFrameIndex] = useAuthoringItemIndex(
    document.frames.length,
    `${part.id}-frames`,
  );
  const [questionIndex, setQuestionIndex] = useAuthoringItemIndex(
    document.questions.length,
    `${part.id}-questions`,
  );

  const commit = (
    next: PictureStoryDocument,
    identity?: { title?: string; instructions?: string },
  ) => {
    const title = identity?.title ?? part.title;
    const instructions = identity?.instructions ?? part.instructions;
    onChange({
      ...part,
      title,
      instructions,
      document: {
        ...next,
        title,
        instructions,
      } as unknown as Record<string, unknown>,
    });
  };

  const frame = document.frames[frameIndex];
  const question = document.questions[questionIndex];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
            Picture story content
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
            Add one or more pictures, then write questions about them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const sample = clonePictureStoryDocumentForAuthoring(
              createSamplePictureStoryDocument(),
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

      <label className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
        <input
          type="checkbox"
          checked={document.allowStoryReviewDuringQuestions}
          onChange={(event) =>
            commit({
              ...document,
              allowStoryReviewDuringQuestions: event.target.checked,
            })
          }
        />
        Students can review the pictures while answering
      </label>

      <AuthoringItemPager
        count={document.frames.length}
        index={frameIndex}
        onIndexChange={setFrameIndex}
        label="Picture"
        itemLabels={document.frames.map((item) => item.text || item.imageAlt)}
        minCount={PICTURE_STORY_MIN_FRAMES}
        maxCount={PICTURE_STORY_MAX_FRAMES}
        stickyNav
        onAdd={() => {
          commit({
            ...document,
            frames: [...document.frames, createBlankPictureStoryFrame()],
          });
          setFrameIndex(document.frames.length);
        }}
        onDuplicate={() => {
          if (!frame) return;
          const copy = { ...frame, id: crypto.randomUUID() };
          const frames = [...document.frames];
          frames.splice(frameIndex + 1, 0, copy);
          commit({ ...document, frames });
          setFrameIndex(frameIndex + 1);
        }}
        onRemove={() => {
          if (!frame || document.frames.length <= PICTURE_STORY_MIN_FRAMES) return;
          const frames = document.frames.filter((item) => item.id !== frame.id);
          const fallbackId = frames[0]!.id;
          commit({
            ...document,
            frames,
            questions: document.questions.map((item) =>
              item.evidenceFrameId === frame.id
                ? { ...item, evidenceFrameId: fallbackId }
                : item,
            ),
          });
        }}
      >
        {frame ? (
          <div className="space-y-2">
            <MediaUrlControls
              label="Picture"
              value={frame.imageUrl}
              compact
              onChange={(url) =>
                commit({
                  ...document,
                  frames: document.frames.map((item) =>
                    item.id === frame.id ? { ...item, imageUrl: url } : item,
                  ),
                })
              }
            />
            <label className="block text-[11px] font-bold text-stone-700">
              Image alt
              <input
                value={frame.imageAlt}
                onChange={(event) =>
                  commit({
                    ...document,
                    frames: document.frames.map((item) =>
                      item.id === frame.id
                        ? { ...item, imageAlt: event.target.value }
                        : item,
                    ),
                  })
                }
                className={fieldClass}
              />
            </label>
            <label className="block text-[11px] font-bold text-stone-700">
              Caption
              <textarea
                value={frame.text}
                rows={2}
                onChange={(event) =>
                  commit({
                    ...document,
                    frames: document.frames.map((item) =>
                      item.id === frame.id ? { ...item, text: event.target.value } : item,
                    ),
                  })
                }
                className={fieldClass}
              />
            </label>
          </div>
        ) : null}
      </AuthoringItemPager>

      <AuthoringItemPager
        count={document.questions.length}
        index={questionIndex}
        onIndexChange={setQuestionIndex}
        label="Question"
        itemLabels={document.questions.map((item) => item.prompt)}
        minCount={PICTURE_STORY_MIN_QUESTIONS}
        maxCount={PICTURE_STORY_MAX_QUESTIONS}
        stickyNav
        onAdd={() => {
          commit({
            ...document,
            questions: [
              ...document.questions,
              createBlankPictureStoryQuestion(
                document.frames[frameIndex]?.id ?? document.frames[0]!.id,
              ),
            ],
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
          if (!question || document.questions.length <= PICTURE_STORY_MIN_QUESTIONS) {
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
              Question type
              <select
                value={question.type}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!isPictureStoryQuestionType(value)) return;
                  if (value === question.type) return;
                  const next = createBlankPictureStoryQuestion(
                    question.evidenceFrameId,
                    value,
                  );
                  commit({
                    ...document,
                    questions: document.questions.map((item) =>
                      item.id === question.id
                        ? { ...next, id: question.id, prompt: question.prompt }
                        : item,
                    ),
                  });
                }}
                className={fieldClass}
              >
                <option value="multiple_choice">Multiple choice</option>
                <option value="sentence_completion">Complete the sentence</option>
                <option value="free_response">Free response</option>
              </select>
            </label>
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
            <label className="block text-[11px] font-bold text-stone-700">
              Picture this question is about
              <select
                value={question.evidenceFrameId}
                onChange={(event) =>
                  commit({
                    ...document,
                    questions: document.questions.map((item) =>
                      item.id === question.id
                        ? { ...item, evidenceFrameId: event.target.value }
                        : item,
                    ),
                  })
                }
                className={fieldClass}
              >
                {document.frames.map((item, index) => (
                  <option key={item.id} value={item.id}>
                    Picture {index + 1}
                    {item.text.trim() ? `: ${item.text.trim().slice(0, 40)}` : ""}
                  </option>
                ))}
              </select>
            </label>
            {question.type === "sentence_completion" ? (
              <label className="block text-[11px] font-bold text-stone-700">
                Accepted answers (comma-separated)
                <input
                  value={question.acceptedAnswers.join(", ")}
                  onChange={(event) =>
                    commit({
                      ...document,
                      questions: document.questions.map((item) =>
                        item.id === question.id
                          ? { ...item, acceptedAnswers: splitCsv(event.target.value) }
                          : item,
                      ),
                    })
                  }
                  className={fieldClass}
                />
              </label>
            ) : question.type === "free_response" ? (
              <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-semibold text-sky-950">
                Students write their own answer about the picture. There is no
                auto-marked key — teachers can read it in homework results.
              </p>
            ) : (
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
                      name={`picture-story-correct-${part.id}-${question.id}`}
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
            )}
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
          Picture story looks valid for assign.
        </p>
      )}
    </div>
  );
}
