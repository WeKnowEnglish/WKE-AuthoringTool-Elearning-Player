"use client";

import { Plus, Trash2 } from "lucide-react";
import type { HomeworkCollectionPart } from "@/lib/homework-collections";
import { homeworkCollectionGradingMode } from "@/lib/homework-collections";
import { AudioClipControls } from "@/components/teacher/activity-builder/AudioClipControls";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";

type Props = {
  part: HomeworkCollectionPart;
  onChange: (part: HomeworkCollectionPart) => void;
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-sm font-semibold text-stone-900";
const smallFieldClass =
  "w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-semibold text-stone-900";

function freshId() {
  return crypto.randomUUID();
}

function ItemCard({
  title,
  onDelete,
  children,
}: {
  title: string;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-extrabold text-stone-800">{title}</p>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-rose-50 hover:text-rose-700"
          aria-label={`Delete ${title}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

export function HomeworkCollectionPartEditor({ part, onChange }: Props) {
  const patchBase = (patch: Partial<Pick<HomeworkCollectionPart, "title" | "instructions" | "required">>) =>
    onChange({ ...part, ...patch } as HomeworkCollectionPart);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-900">
          {homeworkCollectionGradingMode(part.kind) === "automatic"
            ? "Automatically graded"
            : "Teacher reviewed"}
        </p>
        <p className="mt-0.5 text-[11px] font-semibold leading-4 text-amber-900/75">
          Answers and scoring rules are frozen when this collection is assigned.
        </p>
      </div>

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
          onChange={(event) => patchBase({ instructions: event.target.value })}
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

      {part.kind === "multiple_choice" ? (
        <div className="space-y-3">
          {part.questions.map((question, questionIndex) => (
            <ItemCard
              key={question.id}
              title={`Question ${questionIndex + 1}`}
              onDelete={() =>
                onChange({
                  ...part,
                  questions: part.questions.filter((item) => item.id !== question.id),
                })
              }
            >
              <input
                value={question.prompt}
                onChange={(event) =>
                  onChange({
                    ...part,
                    questions: part.questions.map((item) =>
                      item.id === question.id ? { ...item, prompt: event.target.value } : item,
                    ),
                  })
                }
                placeholder="Question"
                className={smallFieldClass}
              />
              <div className="space-y-1.5">
                {question.options.map((option, optionIndex) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${part.id}-${question.id}`}
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
                      aria-label={`Mark option ${optionIndex + 1} correct`}
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
                      placeholder={`Option ${optionIndex + 1}`}
                      className={smallFieldClass}
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
                                  options: item.options.filter((entry) => entry.id !== option.id),
                                  correctOptionId:
                                    item.correctOptionId === option.id
                                      ? item.options.find((entry) => entry.id !== option.id)?.id ?? ""
                                      : item.correctOptionId,
                                }
                              : item,
                          ),
                        })
                      }
                      className="text-stone-400 hover:text-rose-700 disabled:opacity-30"
                      aria-label="Delete option"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
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
                <Plus className="h-3.5 w-3.5" /> Add option
              </button>
            </ItemCard>
          ))}
          <button
            type="button"
            onClick={() => {
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
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5" /> Add question
          </button>
        </div>
      ) : null}

      {part.kind === "letter_mixup" ? (
        <div className="space-y-3">
          {part.items.map((item, index) => (
            <ItemCard
              key={item.id}
              title={`Word ${index + 1}`}
              onDelete={() => onChange({ ...part, items: part.items.filter((row) => row.id !== item.id) })}
            >
              <input
                value={item.prompt}
                onChange={(event) => onChange({ ...part, items: part.items.map((row) => row.id === item.id ? { ...row, prompt: event.target.value } : row) })}
                placeholder="Prompt or hint"
                className={smallFieldClass}
              />
              <input
                value={item.targetWord}
                onChange={(event) => onChange({ ...part, items: part.items.map((row) => row.id === item.id ? { ...row, targetWord: event.target.value } : row) })}
                placeholder="Correct word"
                className={smallFieldClass}
              />
              <input
                value={item.acceptedWords.join(", ")}
                onChange={(event) => onChange({ ...part, items: part.items.map((row) => row.id === item.id ? { ...row, acceptedWords: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } : row) })}
                placeholder="Other accepted spellings, separated by commas"
                className={smallFieldClass}
              />
              <MediaUrlControls
                label="Optional picture clue"
                value={item.imageUrl ?? ""}
                compact
                onChange={(imageUrl) => onChange({ ...part, items: part.items.map((row) => row.id === item.id ? { ...row, imageUrl: imageUrl || undefined } : row) })}
              />
            </ItemCard>
          ))}
          <button type="button" onClick={() => onChange({ ...part, items: [...part.items, { id: freshId(), prompt: "Unscramble the word.", targetWord: "", acceptedWords: [] }] })} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold"><Plus className="h-3.5 w-3.5" /> Add word</button>
        </div>
      ) : null}

      {part.kind === "line_match" ? (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold leading-4 text-stone-500">
            Students match each item on the left to the text or picture on the right.
          </p>
          {part.pairs.map((pair, index) => (
            <ItemCard key={pair.id} title={`Pair ${index + 1}`} onDelete={() => onChange({ ...part, pairs: part.pairs.filter((row) => row.id !== pair.id) })}>
              <input value={pair.left} onChange={(event) => onChange({ ...part, pairs: part.pairs.map((row) => row.id === pair.id ? { ...row, left: event.target.value } : row) })} placeholder="Word or prompt" className={smallFieldClass} />
              <input value={pair.right} onChange={(event) => onChange({ ...part, pairs: part.pairs.map((row) => row.id === pair.id ? { ...row, right: event.target.value } : row) })} placeholder="Matching text" className={smallFieldClass} />
              <MediaUrlControls label="Matching picture" value={pair.imageUrl ?? ""} compact onChange={(imageUrl) => onChange({ ...part, pairs: part.pairs.map((row) => row.id === pair.id ? { ...row, imageUrl: imageUrl || undefined } : row) })} />
            </ItemCard>
          ))}
          <button type="button" onClick={() => onChange({ ...part, pairs: [...part.pairs, { id: freshId(), left: "", right: "" }] })} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold"><Plus className="h-3.5 w-3.5" /> Add pair</button>
        </div>
      ) : null}

      {part.kind === "listen_and_choose" ? (
        <div className="space-y-3">
          {part.items.map((item, index) => (
            <ItemCard key={item.id} title={`Listening item ${index + 1}`} onDelete={() => onChange({ ...part, items: part.items.filter((row) => row.id !== item.id) })}>
              <input value={item.prompt} onChange={(event) => onChange({ ...part, items: part.items.map((row) => row.id === item.id ? { ...row, prompt: event.target.value } : row) })} placeholder="Student prompt" className={smallFieldClass} />
              <textarea value={item.speakText ?? ""} onChange={(event) => onChange({ ...part, items: part.items.map((row) => row.id === item.id ? { ...row, speakText: event.target.value || undefined } : row) })} placeholder="Text-to-speech fallback" rows={2} className={smallFieldClass} />
              <AudioClipControls
                label="Recorded audio (optional when text-to-speech is provided)"
                value={item.audioUrl ?? ""}
                onChange={(audioUrl) => onChange({ ...part, items: part.items.map((row) => row.id === item.id ? { ...row, audioUrl: audioUrl || undefined } : row) })}
                hint="Record, upload, choose from your library, or paste a stable URL."
              />
              <div className="space-y-1.5">
                {item.choices.map((choice, choiceIndex) => (
                  <div key={choice.id} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
                    <input type="radio" name={`listen-correct-${part.id}-${item.id}`} checked={item.correctChoiceId === choice.id} onChange={() => onChange({ ...part, items: part.items.map((row) => row.id === item.id ? { ...row, correctChoiceId: choice.id } : row) })} aria-label={`Mark choice ${choiceIndex + 1} correct`} />
                    <input value={choice.label} onChange={(event) => onChange({ ...part, items: part.items.map((row) => row.id === item.id ? { ...row, choices: row.choices.map((entry) => entry.id === choice.id ? { ...entry, label: event.target.value } : entry) } : row) })} placeholder="Choice label" className={smallFieldClass} />
                    <MediaUrlControls label={`Choice ${choiceIndex + 1} picture`} value={choice.imageUrl ?? ""} compact onChange={(imageUrl) => onChange({ ...part, items: part.items.map((row) => row.id === item.id ? { ...row, choices: row.choices.map((entry) => entry.id === choice.id ? { ...entry, imageUrl: imageUrl || undefined } : entry) } : row) })} />
                    <button type="button" disabled={item.choices.length <= 2} onClick={() => onChange({ ...part, items: part.items.map((row) => row.id === item.id ? { ...row, choices: row.choices.filter((entry) => entry.id !== choice.id), correctChoiceId: row.correctChoiceId === choice.id ? row.choices.find((entry) => entry.id !== choice.id)?.id ?? "" : row.correctChoiceId } : row) })} className="text-stone-400 hover:text-rose-700 disabled:opacity-30" aria-label="Delete choice"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => onChange({ ...part, items: part.items.map((row) => row.id === item.id ? { ...row, choices: [...row.choices, { id: freshId(), label: "" }] } : row) })} className="inline-flex items-center gap-1 text-xs font-bold text-teal-700"><Plus className="h-3.5 w-3.5" /> Add choice</button>
            </ItemCard>
          ))}
          <button type="button" onClick={() => { const correctId = freshId(); onChange({ ...part, items: [...part.items, { id: freshId(), prompt: "Listen and choose.", speakText: "", choices: [{ id: correctId, label: "" }, { id: freshId(), label: "" }], correctChoiceId: correctId }] }); }} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold"><Plus className="h-3.5 w-3.5" /> Add listening item</button>
        </div>
      ) : null}

      {part.kind === "sentence_scramble" ? (
        <div className="space-y-3">
          {part.items.map((item, index) => (
            <ItemCard key={item.id} title={`Sentence ${index + 1}`} onDelete={() => onChange({ ...part, items: part.items.filter((row) => row.id !== item.id) })}>
              <input value={item.prompt} onChange={(event) => onChange({ ...part, items: part.items.map((row) => row.id === item.id ? { ...row, prompt: event.target.value } : row) })} placeholder="Prompt" className={smallFieldClass} />
              <textarea value={item.sentence} onChange={(event) => onChange({ ...part, items: part.items.map((row) => row.id === item.id ? { ...row, sentence: event.target.value } : row) })} placeholder="Correct sentence" rows={2} className={smallFieldClass} />
            </ItemCard>
          ))}
          <button type="button" onClick={() => onChange({ ...part, items: [...part.items, { id: freshId(), prompt: "Put the words in order.", sentence: "" }] })} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold"><Plus className="h-3.5 w-3.5" /> Add sentence</button>
        </div>
      ) : null}

      {part.kind === "free_response" ? (
        <div className="space-y-3">
          {part.prompts.map((prompt, index) => (
            <ItemCard key={prompt.id} title={`Prompt ${index + 1}`} onDelete={() => onChange({ ...part, prompts: part.prompts.filter((row) => row.id !== prompt.id) })}>
              <textarea value={prompt.prompt} onChange={(event) => onChange({ ...part, prompts: part.prompts.map((row) => row.id === prompt.id ? { ...row, prompt: event.target.value } : row) })} placeholder="Question or writing prompt" rows={3} className={smallFieldClass} />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] font-bold text-stone-600">Minimum words<input type="number" min={0} max={1000} value={prompt.minWords} onChange={(event) => onChange({ ...part, prompts: part.prompts.map((row) => row.id === prompt.id ? { ...row, minWords: Math.max(0, Number(event.target.value) || 0) } : row) })} className={smallFieldClass} /></label>
                <label className="text-[11px] font-bold text-stone-600">Points<input type="number" min={1} max={100} value={prompt.maxPoints} onChange={(event) => onChange({ ...part, prompts: part.prompts.map((row) => row.id === prompt.id ? { ...row, maxPoints: Math.max(1, Number(event.target.value) || 1) } : row) })} className={smallFieldClass} /></label>
              </div>
            </ItemCard>
          ))}
          <button type="button" onClick={() => onChange({ ...part, prompts: [...part.prompts, { id: freshId(), prompt: "", minWords: 1, maxPoints: 5 }] })} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold"><Plus className="h-3.5 w-3.5" /> Add prompt</button>
        </div>
      ) : null}
    </div>
  );
}
