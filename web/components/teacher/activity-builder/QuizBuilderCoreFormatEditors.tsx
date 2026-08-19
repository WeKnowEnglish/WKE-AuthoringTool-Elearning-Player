"use client";

import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import { VocabEntryAudioControls } from "@/components/teacher/activity-builder/VocabEntryAudioControls";
import type { GamesListenAndChooseAuthoringDocument } from "@/lib/activity-builder/games/types-listen-and-choose";
import type { GamesLineMatchAuthoringDocument } from "@/lib/activity-builder/games/types-line-match";
import type { GamesTrueFalseAuthoringDocument } from "@/lib/activity-builder/games/types-true-false";
import type { GamesSentenceScrambleAuthoringDocument } from "@/lib/activity-builder/games/types-sentence-scramble";
import type { GamesFillBlanksAuthoringDocument } from "@/lib/activity-builder/games/types-fill-blanks";
import type { GamesWordGameAuthoringDocument } from "@/lib/activity-builder/games/types-word-games";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900";

type RemoveProps = {
  onRemove: () => void;
  canRemove: boolean;
};

export function ListenEditor({
  document,
  selectedItemId,
  onPatch,
  onRemove,
  canRemove,
}: {
  document: GamesListenAndChooseAuthoringDocument;
  selectedItemId: string;
  onPatch: (next: GamesListenAndChooseAuthoringDocument) => void;
} & RemoveProps) {
  const item =
    document.interaction.items.find((row) => row.id === selectedItemId) ?? null;
  if (!item) {
    return <p className="text-sm text-stone-500">Select a listen item.</p>;
  }

  const patchItem = (patch: Partial<typeof item>) => {
    onPatch({
      ...document,
      interaction: {
        ...document.interaction,
        items: document.interaction.items.map((row) =>
          row.id === item.id ? { ...row, ...patch } : row,
        ),
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-900">Listen item</h2>
        <button
          type="button"
          className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-800 disabled:opacity-40"
          disabled={!canRemove}
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
      <label className="block text-xs font-medium text-stone-600">
        Prompt / dialog
        <textarea
          className={inputClass}
          rows={2}
          value={item.dialogText}
          onChange={(event) => patchItem({ dialogText: event.target.value })}
        />
      </label>
      <VocabEntryAudioControls
        value={item.promptAudioUrl}
        onChange={(audioUrl) => patchItem({ promptAudioUrl: audioUrl })}
      />
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Picture choices
        </p>
        {item.choices.map((choice) => (
          <div
            key={choice.id}
            className="rounded-xl border border-stone-200 bg-white p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm text-stone-800">
                <input
                  type="radio"
                  name={`correct-${item.id}`}
                  checked={item.correctChoiceId === choice.id}
                  onChange={() => patchItem({ correctChoiceId: choice.id })}
                />
                Correct
              </label>
              <span className="text-xs uppercase text-stone-400">{choice.id}</span>
            </div>
            <label className="mt-2 block text-xs font-medium text-stone-600">
              Label
              <input
                className={inputClass}
                value={choice.label ?? ""}
                onChange={(event) =>
                  patchItem({
                    choices: item.choices.map((row) =>
                      row.id === choice.id
                        ? { ...row, label: event.target.value }
                        : row,
                    ),
                  })
                }
              />
            </label>
            <div className="mt-2">
              <MediaUrlControls
                label="Picture"
                value={choice.imageUrl}
                onChange={(imageUrl) =>
                  patchItem({
                    choices: item.choices.map((row) =>
                      row.id === choice.id ? { ...row, imageUrl } : row,
                    ),
                  })
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineMatchEditor({
  document,
  selectedItemId,
  onPatch,
  onRemove,
  canRemove,
}: {
  document: GamesLineMatchAuthoringDocument;
  selectedItemId: string;
  onPatch: (next: GamesLineMatchAuthoringDocument) => void;
} & RemoveProps) {
  const screen =
    document.interaction.screens.find((row) => row.id === selectedItemId) ?? null;
  if (!screen) {
    return <p className="text-sm text-stone-500">Select a match screen.</p>;
  }

  const patchScreen = (patch: Partial<typeof screen>) => {
    onPatch({
      ...document,
      interaction: {
        ...document.interaction,
        screens: document.interaction.screens.map((row) =>
          row.id === screen.id ? { ...row, ...patch } : row,
        ),
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-900">Match screen</h2>
        <button
          type="button"
          className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-800 disabled:opacity-40"
          disabled={!canRemove}
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
      <label className="block text-xs font-medium text-stone-600">
        Prompt
        <input
          className={inputClass}
          value={screen.bodyText ?? document.interaction.bodyTextDefault}
          onChange={(event) => patchScreen({ bodyText: event.target.value })}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Words
          </p>
          {screen.tokens.map((token) => (
            <label key={token.id} className="block text-xs font-medium text-stone-600">
              {token.id}
              <input
                className={inputClass}
                value={token.label}
                onChange={(event) =>
                  patchScreen({
                    tokens: screen.tokens.map((row) =>
                      row.id === token.id
                        ? { ...row, label: event.target.value }
                        : row,
                    ),
                  })
                }
              />
            </label>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Pictures
          </p>
          {screen.zones.map((zone) => (
            <div key={zone.id} className="rounded-xl border border-stone-200 p-2">
              <label className="block text-xs font-medium text-stone-600">
                Label
                <input
                  className={inputClass}
                  value={zone.label ?? ""}
                  onChange={(event) =>
                    patchScreen({
                      zones: screen.zones.map((row) =>
                        row.id === zone.id
                          ? { ...row, label: event.target.value }
                          : row,
                      ),
                    })
                  }
                />
              </label>
              <div className="mt-2">
                <MediaUrlControls
                  label="Picture"
                  value={zone.imageUrl ?? ""}
                  onChange={(imageUrl) =>
                    patchScreen({
                      zones: screen.zones.map((row) =>
                        row.id === zone.id
                          ? { ...row, imageUrl: imageUrl.trim() || undefined }
                          : row,
                      ),
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-stone-500">
        Pairs stay linked by id (tok_a → z_a). Regenerate from a vocab list for a full set.
      </p>
    </div>
  );
}

export function TrueFalseEditor({
  document,
  selectedItemId,
  onPatch,
  onRemove,
  canRemove,
}: {
  document: GamesTrueFalseAuthoringDocument;
  selectedItemId: string;
  onPatch: (next: GamesTrueFalseAuthoringDocument) => void;
} & RemoveProps) {
  const item =
    document.interaction.items.find((row) => row.id === selectedItemId) ?? null;
  if (!item) {
    return <p className="text-sm text-stone-500">Select a statement.</p>;
  }

  const patchItem = (patch: Partial<typeof item>) => {
    onPatch({
      ...document,
      interaction: {
        ...document.interaction,
        items: document.interaction.items.map((row) =>
          row.id === item.id ? { ...row, ...patch } : row,
        ),
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-900">True / false</h2>
        <button
          type="button"
          className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-800 disabled:opacity-40"
          disabled={!canRemove}
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
      <label className="block text-xs font-medium text-stone-600">
        Statement
        <textarea
          className={inputClass}
          rows={3}
          value={item.statement}
          onChange={(event) => patchItem({ statement: event.target.value })}
        />
      </label>
      <fieldset className="flex gap-4 text-sm text-stone-800">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={item.correct === true}
            onChange={() => patchItem({ correct: true })}
          />
          True
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={item.correct === false}
            onChange={() => patchItem({ correct: false })}
          />
          False
        </label>
      </fieldset>
      <label className="block text-xs font-medium text-stone-600">
        Picture truth (optional)
        <input
          className={inputClass}
          value={item.pictureTruthStatement ?? ""}
          onChange={(event) =>
            patchItem({
              pictureTruthStatement: event.target.value.trim() || undefined,
            })
          }
        />
      </label>
      <MediaUrlControls
        label="Picture"
        value={item.imageUrl ?? ""}
        onChange={(imageUrl) =>
          patchItem({
            imageUrl: imageUrl.trim() || undefined,
            imageFit: imageUrl.trim() ? "contain" : undefined,
          })
        }
      />
    </div>
  );
}

export function SentenceScrambleEditor({
  document,
  selectedItemId,
  onPatch,
  onRemove,
  canRemove,
}: {
  document: GamesSentenceScrambleAuthoringDocument;
  selectedItemId: string;
  onPatch: (next: GamesSentenceScrambleAuthoringDocument) => void;
} & RemoveProps) {
  const item =
    document.interaction.items.find((row) => row.id === selectedItemId) ?? null;
  if (!item) {
    return <p className="text-sm text-stone-500">Select a sentence.</p>;
  }

  const sentenceText = item.correctOrder.join(" ");

  const patchItem = (patch: Partial<typeof item>) => {
    onPatch({
      ...document,
      interaction: {
        ...document.interaction,
        items: document.interaction.items.map((row) =>
          row.id === item.id ? { ...row, ...patch } : row,
        ),
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-900">Sentence scramble</h2>
        <button
          type="button"
          className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-800 disabled:opacity-40"
          disabled={!canRemove}
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
      <label className="block text-xs font-medium text-stone-600">
        Correct sentence (space-separated tiles)
        <textarea
          className={inputClass}
          rows={2}
          value={sentenceText}
          onChange={(event) => {
            const tokens = event.target.value
              .trim()
              .split(/\s+/)
              .map((token) => token.trim())
              .filter(Boolean);
            patchItem({
              correctOrder: tokens.length >= 2 ? tokens : ["", ""],
            });
          }}
        />
      </label>
      <MediaUrlControls
        label="Picture"
        value={item.imageUrl ?? ""}
        onChange={(imageUrl) =>
          patchItem({
            imageUrl: imageUrl.trim() || undefined,
            imageFit: imageUrl.trim() ? "contain" : undefined,
          })
        }
      />
    </div>
  );
}

export function FillBlanksEditor({
  document,
  selectedItemId,
  onPatch,
  onRemove,
  canRemove,
}: {
  document: GamesFillBlanksAuthoringDocument;
  selectedItemId: string;
  onPatch: (next: GamesFillBlanksAuthoringDocument) => void;
} & RemoveProps) {
  const item =
    document.interaction.items.find((row) => row.id === selectedItemId) ?? null;
  if (!item) {
    return <p className="text-sm text-stone-500">Select a cloze item.</p>;
  }

  const blank = item.blanks[0];

  const patchItem = (patch: Partial<typeof item>) => {
    onPatch({
      ...document,
      interaction: {
        ...document.interaction,
        items: document.interaction.items.map((row) =>
          row.id === item.id ? { ...row, ...patch } : row,
        ),
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-900">Fill in the blanks</h2>
        <button
          type="button"
          className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-800 disabled:opacity-40"
          disabled={!canRemove}
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
      <label className="block text-xs font-medium text-stone-600">
        Template (use __1__ for the blank)
        <textarea
          className={inputClass}
          rows={2}
          value={item.template}
          onChange={(event) => patchItem({ template: event.target.value })}
        />
      </label>
      <label className="block text-xs font-medium text-stone-600">
        Acceptable answers (comma-separated)
        <input
          className={inputClass}
          value={(blank?.acceptable ?? []).join(", ")}
          onChange={(event) => {
            const acceptable = event.target.value
              .split(",")
              .map((entry) => entry.trim())
              .filter(Boolean);
            patchItem({
              blanks: [{ id: blank?.id ?? "1", acceptable: acceptable.length ? acceptable : [""] }],
            });
          }}
        />
      </label>
      <label className="block text-xs font-medium text-stone-600">
        Word bank (comma-separated)
        <input
          className={inputClass}
          value={item.wordBank.join(", ")}
          onChange={(event) => {
            const wordBank = event.target.value
              .split(",")
              .map((entry) => entry.trim())
              .filter(Boolean);
            patchItem({ wordBank: wordBank.length ? wordBank : [""] });
          }}
        />
      </label>
      <MediaUrlControls
        label="Picture"
        value={item.imageUrl ?? ""}
        onChange={(imageUrl) =>
          patchItem({
            imageUrl: imageUrl.trim() || undefined,
            imageFit: imageUrl.trim() ? "contain" : undefined,
          })
        }
      />
    </div>
  );
}

export function WordGameEditor({
  document,
  selectedItemId,
  onPatch,
  onRemove,
  canRemove,
}: {
  document: GamesWordGameAuthoringDocument;
  selectedItemId: string;
  onPatch: (next: GamesWordGameAuthoringDocument) => void;
} & RemoveProps) {
  const item = document.interaction.items.find((row) => row.id === selectedItemId) ?? null;
  if (!item) return <p className="text-sm text-stone-500">Select a word.</p>;
  const format = document.interaction.format;
  const patchInteraction = (patch: Partial<GamesWordGameAuthoringDocument["interaction"]>) => {
    onPatch({ ...document, interaction: { ...document.interaction, ...patch } });
  };
  const patchItem = (patch: Partial<typeof item>) => {
    patchInteraction({
      items: document.interaction.items.map((row) =>
        row.id === item.id ? { ...row, ...patch } : row,
      ),
    });
  };
  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border border-stone-200 bg-white/80 p-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
          {format === "wordsearch" ? "Word search" : format === "crossword" ? "Crossword" : "Memory"} settings
        </h2>
        <label className="block text-xs font-medium text-stone-600">
          Student prompt
          <input className={inputClass} value={document.interaction.promptDefault} onChange={(event) => patchInteraction({ promptDefault: event.target.value })} />
        </label>
        {format === "wordsearch" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-stone-600">
              Grid size
              <select className={inputClass} value={document.interaction.gridSize ?? 12} onChange={(event) => patchInteraction({ gridSize: Number(event.target.value) })}>
                {[10, 12, 14, 16, 18].map((size) => <option key={size} value={size}>{size} × {size}</option>)}
              </select>
            </label>
            <label className="flex items-end gap-2 pb-2 text-xs font-medium text-stone-700">
              <input type="checkbox" checked={document.interaction.allowBackwards === true} onChange={(event) => patchInteraction({ allowBackwards: event.target.checked })} />
              Allow backwards words
            </label>
          </div>
        ) : null}
        {format === "memory" ? (
          <label className="flex items-center gap-2 text-xs font-medium text-stone-700">
            <input type="checkbox" checked={document.interaction.memoryUsePictures !== false} onChange={(event) => patchInteraction({ memoryUsePictures: event.target.checked })} />
            Use pictures when the word list has them
          </label>
        ) : null}
      </section>
      <section className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-stone-900">Vocabulary word</h2>
          <button type="button" className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-800 disabled:opacity-40" disabled={!canRemove} onClick={onRemove}>Remove</button>
        </div>
        <label className="block text-xs font-medium text-stone-600">
          Word
          <input className={inputClass} value={item.word} onChange={(event) => patchItem({ word: event.target.value })} />
        </label>
        {format !== "wordsearch" ? (
          <label className="block text-xs font-medium text-stone-600">
            {format === "crossword" ? "Clue" : "Meaning / matching text"}
            <textarea className={inputClass} rows={2} value={item.clue ?? ""} onChange={(event) => patchItem({ clue: event.target.value })} />
          </label>
        ) : null}
        {format === "memory" ? (
          <MediaUrlControls label="Matching picture (optional)" value={item.imageUrl ?? ""} onChange={(imageUrl) => patchItem({ imageUrl: imageUrl.trim() || undefined, imageFit: "contain" })} />
        ) : null}
      </section>
    </div>
  );
}
