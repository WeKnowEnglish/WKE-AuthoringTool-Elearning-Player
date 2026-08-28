"use client";

import { Plus, Trash2 } from "lucide-react";
import type { HomeworkCollectionPart } from "@/lib/homework-collections";
import {
  homeworkCollectionGradingMode,
  homeworkCollectionPartValidationIssues,
} from "@/lib/homework-collections";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";
import { AudioClipControls } from "@/components/teacher/activity-builder/AudioClipControls";
import { AssessmentListeningItemMatchPartEditor } from "@/components/teacher/activity-builder/AssessmentListeningItemMatchPartEditor";
import { HomeworkCollectionLessonPlayerPackEditor } from "@/components/teacher/activity-builder/HomeworkCollectionLessonPlayerPackEditor";
import { HomeworkCollectionDocumentModuleEditor } from "@/components/teacher/activity-builder/HomeworkCollectionDocumentModuleEditor";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";

type Props = {
  part: HomeworkCollectionPart;
  onChange: (part: HomeworkCollectionPart) => void;
};

const fieldClass =
  "mt-1 min-w-0 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-sm font-semibold text-stone-900";
const compactFieldClass =
  "min-w-0 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-semibold text-stone-900";

function freshId() {
  return crypto.randomUUID();
}

export function HomeworkCollectionPartEditor({ part, onChange }: Props) {
  const issues = homeworkCollectionPartValidationIssues(part);
  const gradingMode = homeworkCollectionGradingMode(part.kind);
  const patchBase = (
    patch: Partial<
      Pick<HomeworkCollectionPart, "title" | "instructions" | "required">
    >,
  ) => onChange({ ...part, ...patch } as HomeworkCollectionPart);

  const [questionIndex, setQuestionIndex] = useAuthoringItemIndex(
    part.kind === "multiple_choice" ? part.questions.length : 0,
    part.kind === "multiple_choice" ? part.id : undefined,
  );
  const [wordIndex, setWordIndex] = useAuthoringItemIndex(
    part.kind === "letter_mixup" ? part.items.length : 0,
    part.kind === "letter_mixup" ? part.id : undefined,
  );
  const [pairIndex, setPairIndex] = useAuthoringItemIndex(
    part.kind === "line_match" ? part.pairs.length : 0,
    part.kind === "line_match" ? part.id : undefined,
  );
  const [listeningIndex, setListeningIndex] = useAuthoringItemIndex(
    part.kind === "listen_and_choose" ? part.items.length : 0,
    part.kind === "listen_and_choose" ? part.id : undefined,
  );
  const [sentenceIndex, setSentenceIndex] = useAuthoringItemIndex(
    part.kind === "sentence_scramble" ? part.items.length : 0,
    part.kind === "sentence_scramble" ? part.id : undefined,
  );
  const [promptIndex, setPromptIndex] = useAuthoringItemIndex(
    part.kind === "free_response" ? part.prompts.length : 0,
    part.kind === "free_response" ? part.id : undefined,
  );

  const question =
    part.kind === "multiple_choice" ? part.questions[questionIndex] : undefined;
  const word = part.kind === "letter_mixup" ? part.items[wordIndex] : undefined;
  const pair = part.kind === "line_match" ? part.pairs[pairIndex] : undefined;
  const listeningItem =
    part.kind === "listen_and_choose" ? part.items[listeningIndex] : undefined;
  const sentence =
    part.kind === "sentence_scramble" ? part.items[sentenceIndex] : undefined;
  const prompt =
    part.kind === "free_response" ? part.prompts[promptIndex] : undefined;

  return (
    <div className="min-w-0 space-y-3">
      <details className="group rounded-xl border border-stone-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-stone-500">
              Activity setup
            </p>
            <p className="truncate text-xs font-bold text-stone-800">
              {part.title || "Untitled activity"}
            </p>
          </div>
          <span
            className={
              "shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide " +
              (gradingMode === "automatic"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-900")
            }
          >
            {gradingMode === "automatic" ? "Auto graded" : "Teacher reviewed"}
          </span>
          <span className="text-xs font-black text-stone-400 transition group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="space-y-3 border-t border-stone-200 p-3">
          <p className="rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-semibold leading-4 text-amber-900">
            Answers and scoring rules are frozen when this collection is assigned.
          </p>
          <label className="block text-xs font-bold text-stone-800">
            Activity title
            <input
              value={part.title}
              onChange={(event) => patchBase({ title: event.target.value })}
              className={fieldClass}
            />
          </label>
          <label className="block text-xs font-bold text-stone-800">
            Student instructions
            <textarea
              value={part.instructions}
              onChange={(event) =>
                patchBase({ instructions: event.target.value })
              }
              rows={3}
              className={fieldClass}
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-stone-800">
            <input
              type="checkbox"
              checked={part.required}
              onChange={(event) => patchBase({ required: event.target.checked })}
            />
            Required before submission
          </label>
        </div>
      </details>

      {issues.length > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-4 text-amber-900">
          Keep editing — {issues[0]}
        </p>
      ) : null}

      {part.kind === "multiple_choice" ? (
        <AuthoringItemPager
          count={part.questions.length}
          index={questionIndex}
          onIndexChange={setQuestionIndex}
          label="Question"
          itemLabels={part.questions.map((item) => item.prompt)}
          minCount={1}
          maxCount={20}
          stickyNav
          onAdd={() => {
            const correctId = freshId();
            onChange({
              ...part,
              questions: [
                ...part.questions,
                {
                  id: freshId(),
                  prompt: "",
                  options: [
                    { id: correctId, text: "" },
                    { id: freshId(), text: "" },
                  ],
                  correctOptionId: correctId,
                },
              ],
            });
            setQuestionIndex(part.questions.length);
          }}
          onDuplicate={() => {
            if (!question) return;
            const optionIds = new Map<string, string>();
            const options = question.options.map((option) => {
              const id = freshId();
              optionIds.set(option.id, id);
              return { ...option, id };
            });
            const copy = {
              ...question,
              id: freshId(),
              prompt: question.prompt ? question.prompt + " copy" : "",
              options,
              correctOptionId:
                optionIds.get(question.correctOptionId) ?? options[0]?.id ?? "",
            };
            const questions = [...part.questions];
            questions.splice(questionIndex + 1, 0, copy);
            onChange({ ...part, questions });
            setQuestionIndex(questionIndex + 1);
          }}
          onRemove={() => {
            if (!question) return;
            onChange({
              ...part,
              questions: part.questions.filter(
                (item) => item.id !== question.id,
              ),
            });
          }}
        >
          {question ? (
            <div className="space-y-3">
              <label className="block text-[11px] font-bold text-stone-700">
                Question students see
                <textarea
                  value={question.prompt}
                  onChange={(event) =>
                    onChange({
                      ...part,
                      questions: part.questions.map((item) =>
                        item.id === question.id
                          ? { ...item, prompt: event.target.value }
                          : item,
                      ),
                    })
                  }
                  placeholder="Write the question"
                  rows={2}
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
                      name={
                        "correct-" + part.id + "-" + question.id
                      }
                      checked={question.correctOptionId === option.id}
                      onChange={() =>
                        onChange({
                          ...part,
                          questions: part.questions.map((item) =>
                            item.id === question.id
                              ? { ...item, correctOptionId: option.id }
                              : item,
                          ),
                        })
                      }
                      aria-label={
                        "Mark option " + (optionIndex + 1) + " correct"
                      }
                    />
                    <input
                      value={option.text}
                      onChange={(event) =>
                        onChange({
                          ...part,
                          questions: part.questions.map((item) =>
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
                      placeholder={"Option " + (optionIndex + 1)}
                      className={compactFieldClass}
                    />
                    <button
                      type="button"
                      disabled={question.options.length <= 2}
                      onClick={() =>
                        onChange({
                          ...part,
                          questions: part.questions.map((item) =>
                            item.id === question.id
                              ? {
                                  ...item,
                                  options: item.options.filter(
                                    (entry) => entry.id !== option.id,
                                  ),
                                  correctOptionId:
                                    item.correctOptionId === option.id
                                      ? item.options.find(
                                          (entry) => entry.id !== option.id,
                                        )?.id ?? ""
                                      : item.correctOptionId,
                                }
                              : item,
                          ),
                        })
                      }
                      className="shrink-0 text-stone-400 hover:text-rose-700 disabled:opacity-30"
                      aria-label="Delete option"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </fieldset>
              <button
                type="button"
                onClick={() => {
                  const option = { id: freshId(), text: "" };
                  onChange({
                    ...part,
                    questions: part.questions.map((item) =>
                      item.id === question.id
                        ? { ...item, options: [...item.options, option] }
                        : item,
                    ),
                  });
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add answer choice
              </button>
            </div>
          ) : null}
        </AuthoringItemPager>
      ) : null}

      {part.kind === "letter_mixup" ? (
        <AuthoringItemPager
          count={part.items.length}
          index={wordIndex}
          onIndexChange={setWordIndex}
          label="Word"
          itemLabels={part.items.map(
            (item) => item.targetWord || item.prompt,
          )}
          minCount={1}
          maxCount={20}
          stickyNav
          onAdd={() => {
            onChange({
              ...part,
              items: [
                ...part.items,
                {
                  id: freshId(),
                  prompt: "Unscramble the word.",
                  targetWord: "",
                  acceptedWords: [],
                },
              ],
            });
            setWordIndex(part.items.length);
          }}
          onDuplicate={() => {
            if (!word) return;
            const items = [...part.items];
            items.splice(wordIndex + 1, 0, { ...word, id: freshId() });
            onChange({ ...part, items });
            setWordIndex(wordIndex + 1);
          }}
          onRemove={() => {
            if (!word) return;
            onChange({
              ...part,
              items: part.items.filter((item) => item.id !== word.id),
            });
          }}
        >
          {word ? (
            <div className="space-y-3">
              <label className="block text-[11px] font-bold text-stone-700">
                Student clue
                <input
                  value={word.prompt}
                  onChange={(event) =>
                    onChange({
                      ...part,
                      items: part.items.map((item) =>
                        item.id === word.id
                          ? { ...item, prompt: event.target.value }
                          : item,
                      ),
                    })
                  }
                  placeholder="Prompt or hint"
                  className={fieldClass}
                />
              </label>
              <label className="block text-[11px] font-bold text-stone-700">
                Correct word
                <input
                  value={word.targetWord}
                  onChange={(event) =>
                    onChange({
                      ...part,
                      items: part.items.map((item) =>
                        item.id === word.id
                          ? { ...item, targetWord: event.target.value }
                          : item,
                      ),
                    })
                  }
                  placeholder="The word students should build"
                  className={fieldClass}
                />
              </label>
              <label className="block text-[11px] font-bold text-stone-700">
                Other accepted answers
                <input
                  value={word.acceptedWords.join(", ")}
                  onChange={(event) =>
                    onChange({
                      ...part,
                      items: part.items.map((item) =>
                        item.id === word.id
                          ? {
                              ...item,
                              acceptedWords: event.target.value
                                .split(",")
                                .map((value) => value.trim())
                                .filter(Boolean),
                            }
                          : item,
                      ),
                    })
                  }
                  placeholder="Optional, separated by commas"
                  className={fieldClass}
                />
              </label>
              <MediaUrlControls
                label="Optional picture clue"
                value={word.imageUrl ?? ""}
                compact
                onChange={(imageUrl) =>
                  onChange({
                    ...part,
                    items: part.items.map((item) =>
                      item.id === word.id
                        ? { ...item, imageUrl: imageUrl || undefined }
                        : item,
                    ),
                  })
                }
              />
            </div>
          ) : null}
        </AuthoringItemPager>
      ) : null}

      {part.kind === "line_match" ? (
        <AuthoringItemPager
          count={part.pairs.length}
          index={pairIndex}
          onIndexChange={setPairIndex}
          label="Pair"
          itemLabels={part.pairs.map(
            (item) => item.left || item.right,
          )}
          minCount={1}
          maxCount={20}
          stickyNav
          onAdd={() => {
            onChange({
              ...part,
              pairs: [
                ...part.pairs,
                { id: freshId(), left: "", right: "" },
              ],
            });
            setPairIndex(part.pairs.length);
          }}
          onDuplicate={() => {
            if (!pair) return;
            const pairs = [...part.pairs];
            pairs.splice(pairIndex + 1, 0, { ...pair, id: freshId() });
            onChange({ ...part, pairs });
            setPairIndex(pairIndex + 1);
          }}
          onRemove={() => {
            if (!pair) return;
            onChange({
              ...part,
              pairs: part.pairs.filter((item) => item.id !== pair.id),
            });
          }}
        >
          {pair ? (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold leading-4 text-stone-500">
                Students connect the left item to its matching text or picture.
              </p>
              <label className="block text-[11px] font-bold text-stone-700">
                Left item
                <input
                  value={pair.left}
                  onChange={(event) =>
                    onChange({
                      ...part,
                      pairs: part.pairs.map((item) =>
                        item.id === pair.id
                          ? { ...item, left: event.target.value }
                          : item,
                      ),
                    })
                  }
                  placeholder="Word or prompt"
                  className={fieldClass}
                />
              </label>
              <label className="block text-[11px] font-bold text-stone-700">
                Matching item
                <input
                  value={pair.right}
                  onChange={(event) =>
                    onChange({
                      ...part,
                      pairs: part.pairs.map((item) =>
                        item.id === pair.id
                          ? { ...item, right: event.target.value }
                          : item,
                      ),
                    })
                  }
                  placeholder="Matching text"
                  className={fieldClass}
                />
              </label>
              <MediaUrlControls
                label="Matching picture"
                value={pair.imageUrl ?? ""}
                compact
                onChange={(imageUrl) =>
                  onChange({
                    ...part,
                    pairs: part.pairs.map((item) =>
                      item.id === pair.id
                        ? { ...item, imageUrl: imageUrl || undefined }
                        : item,
                    ),
                  })
                }
              />
            </div>
          ) : null}
        </AuthoringItemPager>
      ) : null}

      {part.kind === "listen_and_choose" ? (
        <AuthoringItemPager
          count={part.items.length}
          index={listeningIndex}
          onIndexChange={setListeningIndex}
          label="Listening item"
          itemLabels={part.items.map((item) => item.prompt)}
          minCount={1}
          maxCount={20}
          stickyNav
          onAdd={() => {
            const correctId = freshId();
            onChange({
              ...part,
              items: [
                ...part.items,
                {
                  id: freshId(),
                  prompt: "Listen and choose.",
                  speakText: "",
                  choices: [
                    { id: correctId, label: "" },
                    { id: freshId(), label: "" },
                  ],
                  correctChoiceId: correctId,
                },
              ],
            });
            setListeningIndex(part.items.length);
          }}
          onDuplicate={() => {
            if (!listeningItem) return;
            const choiceIds = new Map<string, string>();
            const choices = listeningItem.choices.map((choice) => {
              const id = freshId();
              choiceIds.set(choice.id, id);
              return { ...choice, id };
            });
            const copy = {
              ...listeningItem,
              id: freshId(),
              choices,
              correctChoiceId:
                choiceIds.get(listeningItem.correctChoiceId) ??
                choices[0]?.id ??
                "",
            };
            const items = [...part.items];
            items.splice(listeningIndex + 1, 0, copy);
            onChange({ ...part, items });
            setListeningIndex(listeningIndex + 1);
          }}
          onRemove={() => {
            if (!listeningItem) return;
            onChange({
              ...part,
              items: part.items.filter(
                (item) => item.id !== listeningItem.id,
              ),
            });
          }}
        >
          {listeningItem ? (
            <div className="space-y-3">
              <label className="block text-[11px] font-bold text-stone-700">
                Student prompt
                <input
                  value={listeningItem.prompt}
                  onChange={(event) =>
                    onChange({
                      ...part,
                      items: part.items.map((item) =>
                        item.id === listeningItem.id
                          ? { ...item, prompt: event.target.value }
                          : item,
                      ),
                    })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="block text-[11px] font-bold text-stone-700">
                Text-to-speech fallback
                <textarea
                  value={listeningItem.speakText ?? ""}
                  onChange={(event) =>
                    onChange({
                      ...part,
                      items: part.items.map((item) =>
                        item.id === listeningItem.id
                          ? {
                              ...item,
                              speakText: event.target.value || undefined,
                            }
                          : item,
                      ),
                    })
                  }
                  placeholder="What should students hear?"
                  rows={2}
                  className={fieldClass}
                />
              </label>
              <AudioClipControls
                label="Recorded audio"
                value={listeningItem.audioUrl ?? ""}
                onChange={(audioUrl) =>
                  onChange({
                    ...part,
                    items: part.items.map((item) =>
                      item.id === listeningItem.id
                        ? { ...item, audioUrl: audioUrl || undefined }
                        : item,
                    ),
                  })
                }
                hint="Optional when text-to-speech is provided."
              />
              <fieldset className="space-y-2">
                <legend className="text-[11px] font-bold text-stone-700">
                  Answer choices
                </legend>
                {listeningItem.choices.map((choice, choiceIndex) => (
                  <div
                    key={choice.id}
                    className="space-y-2 rounded-lg border border-stone-200 bg-white p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={
                          "listen-correct-" +
                          part.id +
                          "-" +
                          listeningItem.id
                        }
                        checked={listeningItem.correctChoiceId === choice.id}
                        onChange={() =>
                          onChange({
                            ...part,
                            items: part.items.map((item) =>
                              item.id === listeningItem.id
                                ? { ...item, correctChoiceId: choice.id }
                                : item,
                            ),
                          })
                        }
                        aria-label={
                          "Mark choice " + (choiceIndex + 1) + " correct"
                        }
                      />
                      <span className="min-w-0 flex-1 text-[11px] font-bold text-stone-600">
                        Choice {choiceIndex + 1}
                      </span>
                      <button
                        type="button"
                        disabled={listeningItem.choices.length <= 2}
                        onClick={() =>
                          onChange({
                            ...part,
                            items: part.items.map((item) =>
                              item.id === listeningItem.id
                                ? {
                                    ...item,
                                    choices: item.choices.filter(
                                      (entry) => entry.id !== choice.id,
                                    ),
                                    correctChoiceId:
                                      item.correctChoiceId === choice.id
                                        ? item.choices.find(
                                            (entry) =>
                                              entry.id !== choice.id,
                                          )?.id ?? ""
                                        : item.correctChoiceId,
                                  }
                                : item,
                            ),
                          })
                        }
                        className="shrink-0 text-stone-400 hover:text-rose-700 disabled:opacity-30"
                        aria-label="Delete choice"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      value={choice.label}
                      onChange={(event) =>
                        onChange({
                          ...part,
                          items: part.items.map((item) =>
                            item.id === listeningItem.id
                              ? {
                                  ...item,
                                  choices: item.choices.map((entry) =>
                                    entry.id === choice.id
                                      ? { ...entry, label: event.target.value }
                                      : entry,
                                  ),
                                }
                              : item,
                          ),
                        })
                      }
                      placeholder="Choice text"
                      className={compactFieldClass}
                    />
                    <MediaUrlControls
                      label="Optional choice picture"
                      value={choice.imageUrl ?? ""}
                      compact
                      onChange={(imageUrl) =>
                        onChange({
                          ...part,
                          items: part.items.map((item) =>
                            item.id === listeningItem.id
                              ? {
                                  ...item,
                                  choices: item.choices.map((entry) =>
                                    entry.id === choice.id
                                      ? {
                                          ...entry,
                                          imageUrl: imageUrl || undefined,
                                        }
                                      : entry,
                                  ),
                                }
                              : item,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
              </fieldset>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...part,
                    items: part.items.map((item) =>
                      item.id === listeningItem.id
                        ? {
                            ...item,
                            choices: [
                              ...item.choices,
                              { id: freshId(), label: "" },
                            ],
                          }
                        : item,
                    ),
                  })
                }
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add answer choice
              </button>
            </div>
          ) : null}
        </AuthoringItemPager>
      ) : null}

      {part.kind === "sentence_scramble" ? (
        <AuthoringItemPager
          count={part.items.length}
          index={sentenceIndex}
          onIndexChange={setSentenceIndex}
          label="Sentence"
          itemLabels={part.items.map((item) => item.sentence)}
          minCount={1}
          maxCount={20}
          stickyNav
          onAdd={() => {
            onChange({
              ...part,
              items: [
                ...part.items,
                {
                  id: freshId(),
                  promptMode: "scramble_only",
                  sentence: "",
                },
              ],
            });
            setSentenceIndex(part.items.length);
          }}
          onDuplicate={() => {
            if (!sentence) return;
            const items = [...part.items];
            items.splice(sentenceIndex + 1, 0, {
              ...sentence,
              id: freshId(),
            });
            onChange({ ...part, items });
            setSentenceIndex(sentenceIndex + 1);
          }}
          onRemove={() => {
            if (!sentence) return;
            onChange({
              ...part,
              items: part.items.filter((item) => item.id !== sentence.id),
            });
          }}
        >
          {sentence ? (() => {
            const promptMode =
              sentence.promptMode ??
              (sentence.prompt?.trim()
                ? "additional_prompt"
                : "scramble_only");
            const patchSentence = (patch: Partial<typeof sentence>) =>
              onChange({
                ...part,
                items: part.items.map((item) =>
                  item.id === sentence.id ? { ...item, ...patch } : item,
                ),
              });
            return (
              <div className="space-y-3">
                <label className="block text-[11px] font-bold text-stone-700">
                  Sentence students must build
                  <textarea
                    value={sentence.sentence}
                    onChange={(event) =>
                      patchSentence({ sentence: event.target.value })
                    }
                    placeholder="Write the complete correct sentence"
                    rows={2}
                    className={fieldClass}
                  />
                  <span className="mt-1 block font-medium leading-snug text-stone-500">
                    This becomes the scrambled answer.
                  </span>
                </label>
                <fieldset className="space-y-2">
                  <legend className="text-[11px] font-bold text-stone-700">
                    Student prompt
                  </legend>
                  <button
                    type="button"
                    onClick={() =>
                      patchSentence({
                        promptMode: "scramble_only",
                        prompt: undefined,
                      })
                    }
                    className={
                      "w-full rounded-lg border px-2.5 py-2 text-left text-[11px] font-bold " +
                      (promptMode === "scramble_only"
                        ? "border-amber-500 bg-amber-50 text-amber-950"
                        : "border-stone-200 bg-white text-stone-700")
                    }
                  >
                    Use the standard scramble instruction
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      patchSentence({
                        promptMode: "additional_prompt",
                        prompt: sentence.prompt ?? "",
                      })
                    }
                    className={
                      "w-full rounded-lg border px-2.5 py-2 text-left text-[11px] font-bold " +
                      (promptMode === "additional_prompt"
                        ? "border-amber-500 bg-amber-50 text-amber-950"
                        : "border-stone-200 bg-white text-stone-700")
                    }
                  >
                    Add a custom prompt
                  </button>
                </fieldset>
                {promptMode === "additional_prompt" ? (
                  <label className="block text-[11px] font-bold text-stone-700">
                    Additional prompt
                    <textarea
                      value={sentence.prompt ?? ""}
                      onChange={(event) =>
                        patchSentence({ prompt: event.target.value })
                      }
                      placeholder="Example: Expand this idea: She likes music."
                      rows={2}
                      className={fieldClass}
                    />
                  </label>
                ) : null}
              </div>
            );
          })() : null}
        </AuthoringItemPager>
      ) : null}

      {part.kind === "free_response" ? (
        <AuthoringItemPager
          count={part.prompts.length}
          index={promptIndex}
          onIndexChange={setPromptIndex}
          label="Prompt"
          itemLabels={part.prompts.map((item) => item.prompt)}
          minCount={1}
          maxCount={20}
          stickyNav
          onAdd={() => {
            onChange({
              ...part,
              prompts: [
                ...part.prompts,
                {
                  id: freshId(),
                  prompt: "",
                  minWords: 1,
                  maxPoints: 5,
                },
              ],
            });
            setPromptIndex(part.prompts.length);
          }}
          onDuplicate={() => {
            if (!prompt) return;
            const prompts = [...part.prompts];
            prompts.splice(promptIndex + 1, 0, {
              ...prompt,
              id: freshId(),
            });
            onChange({ ...part, prompts });
            setPromptIndex(promptIndex + 1);
          }}
          onRemove={() => {
            if (!prompt) return;
            onChange({
              ...part,
              prompts: part.prompts.filter((item) => item.id !== prompt.id),
            });
          }}
        >
          {prompt ? (
            <div className="space-y-3">
              <label className="block text-[11px] font-bold text-stone-700">
                Question or writing prompt
                <textarea
                  value={prompt.prompt}
                  onChange={(event) =>
                    onChange({
                      ...part,
                      prompts: part.prompts.map((item) =>
                        item.id === prompt.id
                          ? { ...item, prompt: event.target.value }
                          : item,
                      ),
                    })
                  }
                  rows={4}
                  className={fieldClass}
                />
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-[11px] font-bold text-stone-600">
                  Minimum words
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={prompt.minWords}
                    onChange={(event) =>
                      onChange({
                        ...part,
                        prompts: part.prompts.map((item) =>
                          item.id === prompt.id
                            ? {
                                ...item,
                                minWords: Math.max(
                                  0,
                                  Number(event.target.value) || 0,
                                ),
                              }
                            : item,
                        ),
                      })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="text-[11px] font-bold text-stone-600">
                  Points
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={prompt.maxPoints}
                    onChange={(event) =>
                      onChange({
                        ...part,
                        prompts: part.prompts.map((item) =>
                          item.id === prompt.id
                            ? {
                                ...item,
                                maxPoints: Math.max(
                                  1,
                                  Number(event.target.value) || 1,
                                ),
                              }
                            : item,
                        ),
                      })
                    }
                    className={fieldClass}
                  />
                </label>
              </div>
            </div>
          ) : null}
        </AuthoringItemPager>
      ) : null}

      {part.kind === "speaking_prompt" ? (
        <div className="space-y-3">
          <label className="block text-[11px] font-bold text-stone-700">
            Speaking prompt
            <textarea
              value={part.prompt}
              onChange={(event) =>
                onChange({ ...part, prompt: event.target.value })
              }
              rows={4}
              placeholder="What should the student talk about?"
              className={fieldClass}
            />
          </label>
          <MediaUrlControls
            label="Optional picture"
            value={part.imageUrl ?? ""}
            onChange={(imageUrl) =>
              onChange({
                ...part,
                ...(imageUrl ? { imageUrl } : {}),
              })
            }
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-[11px] font-bold text-stone-600">
              Max recording (seconds)
              <input
                type="number"
                min={15}
                max={120}
                value={part.maxDurationSeconds}
                onChange={(event) =>
                  onChange({
                    ...part,
                    maxDurationSeconds: Math.max(
                      15,
                      Math.min(120, Number(event.target.value) || 60),
                    ),
                  })
                }
                className={fieldClass}
              />
            </label>
            <label className="text-[11px] font-bold text-stone-600">
              Points
              <input
                type="number"
                min={1}
                max={100}
                value={part.maxPoints}
                onChange={(event) =>
                  onChange({
                    ...part,
                    maxPoints: Math.max(1, Number(event.target.value) || 1),
                  })
                }
                className={fieldClass}
              />
            </label>
          </div>
        </div>
      ) : null}

      {part.kind === "listening_item_match" ? (
        <AssessmentListeningItemMatchPartEditor
          part={{
            id: part.id,
            partNumber: 1,
            kind: "listening_item_match",
            title: part.title,
            instructions: part.instructions,
            activity: part.activity,
          }}
          onChange={(next) =>
            onChange({
              ...part,
              activity: next.activity,
            })
          }
        />
      ) : null}

      {part.kind === "lesson_player_pack" ? (
        <HomeworkCollectionLessonPlayerPackEditor
          part={part}
          onChange={(nextPart) => onChange(nextPart)}
        />
      ) : null}

      {part.kind === "document_module" ? (
        <HomeworkCollectionDocumentModuleEditor
          part={part}
          onChange={(nextPart) => onChange(nextPart)}
        />
      ) : null}
    </div>
  );
}
