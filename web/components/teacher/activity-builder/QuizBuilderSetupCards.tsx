"use client";

import Link from "next/link";
import type { VocabCompileFormat } from "@/lib/activity-builder/games/compile-from-vocab-list";
import {
  GAMES_FLASHCARD_FACES,
  type GamesFlashcardFace,
} from "@/lib/activity-builder/games/types-flashcards";
import type { VocabListEntry } from "@/lib/activity-builder/vocabulary-list/types";
import type { StudioVocabularyListRef } from "@/lib/activity-library/vocabulary-list-studio";
import type {
  GamesCrosswordClueMode,
  GamesMemoryTextMode,
} from "@/lib/activity-builder/games/types-word-games";

export type FormatSource = "vocab_list" | "blank";

export type StagedQuizCard = {
  id: string;
  format: VocabCompileFormat;
  source: FormatSource;
  listId: string | null;
  listName: string | null;
  entries: VocabListEntry[];
  entriesBusy: boolean;
  selectedEntryIds: string[];
  masterPrompt: string;
  mcOptionCount: number;
  mcShuffleOptions: boolean;
  letterShuffleLetters: boolean;
  letterCaseSensitive: boolean;
  flashcardsShuffleCards: boolean;
  flashcardsFrontFaces: GamesFlashcardFace[];
  flashcardsBackFaces: GamesFlashcardFace[];
  memoryTextMode: GamesMemoryTextMode;
  crosswordClueMode: GamesCrosswordClueMode;
};

type FormatMeta = {
  format: VocabCompileFormat;
  label: string;
  short: string;
  hint: string;
};

const FLASHCARD_FACE_LABELS: Record<GamesFlashcardFace, string> = {
  word: "Word",
  definition: "Definition",
  example: "Example",
  picture: "Picture",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900";

function formatLabel(formats: FormatMeta[], format: VocabCompileFormat): string {
  return formats.find((row) => row.format === format)?.label ?? format;
}

function isCardReady(card: StagedQuizCard): boolean {
  if (card.source === "blank") return true;
  return Boolean(card.listId) && card.selectedEntryIds.length > 0;
}

function orderFlashcardFaces(faces: GamesFlashcardFace[]): GamesFlashcardFace[] {
  return GAMES_FLASHCARD_FACES.filter((face) => faces.includes(face));
}

function toggleFlashcardFace(
  card: StagedQuizCard,
  side: "front" | "back",
  face: GamesFlashcardFace,
): Pick<StagedQuizCard, "flashcardsFrontFaces" | "flashcardsBackFaces"> {
  const primaryKey = side === "front" ? "flashcardsFrontFaces" : "flashcardsBackFaces";
  const otherKey = side === "front" ? "flashcardsBackFaces" : "flashcardsFrontFaces";
  const onPrimary = card[primaryKey].includes(face);
  if (onPrimary) {
    if (card[primaryKey].length <= 1) {
      return {
        flashcardsFrontFaces: card.flashcardsFrontFaces,
        flashcardsBackFaces: card.flashcardsBackFaces,
      };
    }
    return {
      flashcardsFrontFaces: orderFlashcardFaces(
        primaryKey === "flashcardsFrontFaces"
          ? card.flashcardsFrontFaces.filter((item) => item !== face)
          : card.flashcardsFrontFaces,
      ),
      flashcardsBackFaces: orderFlashcardFaces(
        primaryKey === "flashcardsBackFaces"
          ? card.flashcardsBackFaces.filter((item) => item !== face)
          : card.flashcardsBackFaces,
      ),
    };
  }
  return {
    flashcardsFrontFaces: orderFlashcardFaces(
      primaryKey === "flashcardsFrontFaces"
        ? [...card.flashcardsFrontFaces, face]
        : card.flashcardsFrontFaces.filter((item) => item !== face),
    ),
    flashcardsBackFaces: orderFlashcardFaces(
      primaryKey === "flashcardsBackFaces"
        ? [...card.flashcardsBackFaces, face]
        : card.flashcardsBackFaces.filter((item) => item !== face),
    ),
  };
}

type Props = {
  formats: FormatMeta[];
  cards: StagedQuizCard[];
  vocabLists: StudioVocabularyListRef[];
  listsBusy: boolean;
  onAdd: (format: VocabCompileFormat) => void;
  onRemove: (cardId: string) => void;
  onPatch: (cardId: string, patch: Partial<StagedQuizCard>) => void;
  onLoadList: (cardId: string, listId: string) => void;
};

export function QuizBuilderSetupCards({
  formats,
  cards,
  vocabLists,
  listsBusy,
  onAdd,
  onRemove,
  onPatch,
  onLoadList,
}: Props) {
  return (
    <div className="flex w-full max-w-[90rem] flex-col items-center gap-6">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {formats.map((row) => (
          <button
            key={row.format}
            type="button"
            onClick={() => onAdd(row.format)}
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50"
          >
            <span className="text-amber-700">+</span> {row.label}
          </button>
        ))}
      </div>

      {cards.length === 0 ? (
        <p className="max-w-md text-center text-sm text-stone-500">
          Add a quiz or game, then choose the vocabulary list and words it should use.
          Each card can use a different list.
        </p>
      ) : (
        <div className="w-full overflow-x-auto pb-2">
          <div className="flex min-w-min items-stretch gap-4 px-1">
            {cards.map((card) => {
              const ready = isCardReady(card);
              const pictureCount = card.entries.filter((entry) =>
                Boolean(entry.imageUrl?.trim()),
              ).length;
              return (
                <article
                  key={card.id}
                  className={`flex w-[20.5rem] shrink-0 flex-col rounded-2xl border bg-white p-4 shadow-sm transition ${
                    ready
                      ? "border-emerald-300 shadow-emerald-100/50"
                      : "border-stone-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                        {formats.find((row) => row.format === card.format)?.short}
                      </p>
                      <h3 className="mt-0.5 text-base font-semibold text-stone-900">
                        {formatLabel(formats, card.format)}
                      </h3>
                      {card.listName ? (
                        <p className="mt-0.5 truncate text-xs text-stone-500">
                          {card.listName}
                          {ready
                            ? ` · ${card.selectedEntryIds.length} words`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      aria-label="Remove card"
                      className="rounded-full px-2 py-0.5 text-sm text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                      onClick={() => onRemove(card.id)}
                    >
                      ×
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: "vocab_list", label: "Vocab list" },
                        { id: "blank", label: "Blank" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                          card.source === option.id
                            ? "border-amber-400 bg-amber-50 text-amber-950"
                            : "border-stone-200 bg-stone-50 text-stone-600"
                        }`}
                        onClick={() => onPatch(card.id, { source: option.id })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {card.source === "vocab_list" ? (
                    <>
                      <label className="mt-3 block text-xs font-medium text-stone-700">
                        Source list
                        <select
                          className={inputClass}
                          value={card.listId ?? ""}
                          disabled={listsBusy || card.entriesBusy}
                          onChange={(event) => {
                            const listId = event.target.value;
                            if (!listId) {
                              onPatch(card.id, {
                                listId: null,
                                listName: null,
                                entries: [],
                                selectedEntryIds: [],
                              });
                              return;
                            }
                            onLoadList(card.id, listId);
                          }}
                        >
                          <option value="">
                            {listsBusy ? "Loading…" : "Choose a list…"}
                          </option>
                          {vocabLists.map((list) => (
                            <option key={list.id} value={list.id}>
                              {list.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      {card.entriesBusy ? (
                        <p className="mt-2 text-xs text-stone-500">Loading words…</p>
                      ) : card.entries.length > 0 ? (
                        <div className="mt-2 min-h-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-stone-500">
                              {card.selectedEntryIds.length}/{card.entries.length}
                              {pictureCount > 0
                                ? ` · ${pictureCount} pics`
                                : " · no pics"}
                            </p>
                            <div className="flex gap-2 text-[11px] font-semibold">
                              <button
                                type="button"
                                className="text-sky-800 hover:underline"
                                onClick={() =>
                                  onPatch(card.id, {
                                    selectedEntryIds: card.entries.map(
                                      (entry) => entry.id,
                                    ),
                                  })
                                }
                              >
                                All
                              </button>
                              <button
                                type="button"
                                className="text-sky-800 hover:underline"
                                onClick={() =>
                                  onPatch(card.id, { selectedEntryIds: [] })
                                }
                              >
                                None
                              </button>
                            </div>
                          </div>
                          <ul className="mt-1.5 max-h-40 space-y-0.5 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50/80 p-1.5">
                            {card.entries.map((entry) => {
                              const checked = card.selectedEntryIds.includes(
                                entry.id,
                              );
                              return (
                                <li key={entry.id}>
                                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-xs hover:bg-white">
                                    <input
                                      type="checkbox"
                                      className="h-3.5 w-3.5 rounded border-stone-300"
                                      checked={checked}
                                      onChange={() => {
                                        const next = checked
                                          ? card.selectedEntryIds.filter(
                                              (id) => id !== entry.id,
                                            )
                                          : [...card.selectedEntryIds, entry.id];
                                        onPatch(card.id, {
                                          selectedEntryIds: next,
                                        });
                                      }}
                                    />
                                    {entry.imageUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={entry.imageUrl}
                                        alt=""
                                        className="h-6 w-6 rounded object-cover"
                                      />
                                    ) : (
                                      <span className="flex h-6 w-6 items-center justify-center rounded bg-stone-200 text-[9px] text-stone-500">
                                        —
                                      </span>
                                    )}
                                    <span className="min-w-0 truncate font-medium text-stone-800">
                                      {entry.word || "(empty)"}
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : vocabLists.length === 0 && !listsBusy ? (
                        <p className="mt-2 text-xs text-stone-500">
                          No lists yet.{" "}
                          <Link
                            href="/teacher/activity-builder/vocabulary-lists"
                            className="font-semibold text-sky-800 underline"
                          >
                            Create one
                          </Link>
                          .
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-3 rounded-xl border border-dashed border-stone-200 bg-stone-50 px-2.5 py-2 text-xs text-stone-600">
                      A starter {formatLabel(formats, card.format).toLowerCase()} activity
                      will open after generate.
                    </p>
                  )}

                  {card.format === "flashcards" ? (
                    <div className="mt-3 space-y-2.5 rounded-xl border border-stone-200 bg-stone-50/80 p-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                        Card faces
                      </p>
                      {(
                        [
                          ["front", "Front", "flashcardsFrontFaces"],
                          ["back", "Back", "flashcardsBackFaces"],
                        ] as const
                      ).map(([side, sideLabel, key]) => (
                        <fieldset key={side}>
                          <legend className="text-xs font-medium text-stone-700">
                            {sideLabel}
                          </legend>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {GAMES_FLASHCARD_FACES.map((face) => {
                              const checked = card[key].includes(face);
                              return (
                                <button
                                  key={`${card.id}-${side}-${face}`}
                                  type="button"
                                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                                    checked
                                      ? "border-amber-400 bg-amber-50 text-amber-950"
                                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                                  }`}
                                  onClick={() =>
                                    onPatch(card.id, toggleFlashcardFace(card, side, face))
                                  }
                                >
                                  {FLASHCARD_FACE_LABELS[face]}
                                </button>
                              );
                            })}
                          </div>
                        </fieldset>
                      ))}
                      <p className="text-[10px] leading-snug text-stone-500">
                        A face can only sit on one side. Keep at least one on front and back.
                      </p>
                    </div>
                  ) : null}

                  {card.format !== "flashcards" &&
                  !(
                    card.format === "sentence_scramble" &&
                    card.source === "vocab_list"
                  ) ? (
                    <label className="mt-3 block text-xs font-medium text-stone-700">
                      {card.format === "multiple_choice"
                        ? "Master question"
                        : card.format === "sentence_scramble"
                          ? "Correct sentence"
                          : "Prompt"}
                      <input
                        className={inputClass}
                        value={card.masterPrompt}
                        onChange={(event) =>
                          onPatch(card.id, { masterPrompt: event.target.value })
                        }
                      />
                      {card.format === "sentence_scramble" ? (
                        <span className="mt-1 block text-[10px] leading-snug text-stone-500">
                          This sentence becomes the scrambled answer. You can add a
                          separate expansion prompt in the editor.
                        </span>
                      ) : null}
                    </label>
                  ) : null}

                  {card.format === "sentence_scramble" &&
                  card.source === "vocab_list" ? (
                    <p className="mt-3 rounded-lg bg-sky-50 px-2.5 py-2 text-[11px] leading-snug text-sky-950">
                      Correct sentences come from each selected word’s example sentence.
                      You can add separate expansion prompts after generating.
                    </p>
                  ) : null}

                  <details className="mt-3 rounded-xl border border-stone-200 bg-stone-50/70">
                    <summary className="cursor-pointer px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                      Options
                    </summary>
                    <div className="space-y-2 border-t border-stone-200 px-2.5 py-2">
                      {card.format === "multiple_choice" ? (
                        <>
                          <label className="block text-xs text-stone-700">
                            Options per question
                            <select
                              className={inputClass}
                              value={card.mcOptionCount}
                              onChange={(event) =>
                                onPatch(card.id, {
                                  mcOptionCount: Number(event.target.value),
                                })
                              }
                            >
                              {[2, 3, 4, 5, 6].map((count) => (
                                <option key={count} value={count}>
                                  {count}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex items-center gap-2 text-xs text-stone-700">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-stone-300"
                              checked={card.mcShuffleOptions}
                              onChange={(event) =>
                                onPatch(card.id, {
                                  mcShuffleOptions: event.target.checked,
                                })
                              }
                            />
                            Shuffle options
                          </label>
                        </>
                      ) : null}
                      {card.format === "letter_mixup" ? (
                        <>
                          <label className="flex items-center gap-2 text-xs text-stone-700">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-stone-300"
                              checked={card.letterShuffleLetters}
                              onChange={(event) =>
                                onPatch(card.id, {
                                  letterShuffleLetters: event.target.checked,
                                })
                              }
                            />
                            Shuffle letters
                          </label>
                          <label className="flex items-center gap-2 text-xs text-stone-700">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-stone-300"
                              checked={card.letterCaseSensitive}
                              onChange={(event) =>
                                onPatch(card.id, {
                                  letterCaseSensitive: event.target.checked,
                                })
                              }
                            />
                            Case sensitive
                          </label>
                        </>
                      ) : null}
                      {card.format === "flashcards" ? (
                        <label className="flex items-center gap-2 text-xs text-stone-700">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-stone-300"
                            checked={card.flashcardsShuffleCards}
                            onChange={(event) =>
                              onPatch(card.id, {
                                flashcardsShuffleCards: event.target.checked,
                              })
                            }
                          />
                          Shuffle cards
                        </label>
                      ) : null}
                      {card.format === "memory" ? (
                        <label className="block text-xs text-stone-700">
                          Text paired with each picture
                          <select
                            className={inputClass}
                            value={card.memoryTextMode}
                            onChange={(event) =>
                              onPatch(card.id, {
                                memoryTextMode: event.target.value as GamesMemoryTextMode,
                              })
                            }
                          >
                            <option value="word">Word</option>
                            <option value="definition">Definition</option>
                            <option value="example">Example sentence</option>
                          </select>
                          <span className="mt-1 block text-[10px] leading-snug text-stone-500">
                            Every generated pair needs a picture and the selected text.
                          </span>
                        </label>
                      ) : null}
                      {card.format === "crossword" ? (
                        <label className="block text-xs text-stone-700">
                          Clue source
                          <select
                            className={inputClass}
                            value={card.crosswordClueMode}
                            onChange={(event) =>
                              onPatch(card.id, {
                                crosswordClueMode: event.target.value as GamesCrosswordClueMode,
                              })
                            }
                          >
                            <option value="definition_or_example">
                              Definition, then example
                            </option>
                            <option value="definition">Definition only</option>
                            <option value="example">Example sentence only</option>
                          </select>
                          <span className="mt-1 block text-[10px] leading-snug text-stone-500">
                            You can still override individual clues in the editor.
                          </span>
                        </label>
                      ) : null}
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
