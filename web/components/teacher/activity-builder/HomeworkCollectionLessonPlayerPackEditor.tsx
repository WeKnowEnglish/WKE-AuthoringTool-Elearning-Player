"use client";

import { useCallback, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  appendBlankItem,
  cloneSession,
  listEntryLabel,
  removeSessionItem,
  sessionItemIds,
  type QuizSession,
} from "@/lib/activity-builder/games/quiz-builder-session";
import {
  FillBlanksEditor,
  TrueFalseEditor,
  WordGameEditor,
} from "@/components/teacher/activity-builder/QuizBuilderCoreFormatEditors";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";
import type { HomeworkCollectionLessonPlayerPackPart } from "@/lib/homework-collections";
import {
  exportPartFromQuizSession,
  parseStoredQuizSession,
  blankQuizSessionForStudioFormat,
} from "@/lib/homework-collections/lesson-player-pack";
import type { GamesFlashcardsAuthoringDocument } from "@/lib/activity-builder/games/types-flashcards";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";

type Props = {
  part: HomeworkCollectionLessonPlayerPackPart;
  onChange: (part: HomeworkCollectionLessonPlayerPackPart) => void;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900";

export function HomeworkCollectionLessonPlayerPackEditor({ part, onChange }: Props) {
  return (
    <HomeworkCollectionLessonPlayerPackEditorInner
      key={`${part.id}:${part.studioFormat}`}
      part={part}
      onChange={onChange}
    />
  );
}

function HomeworkCollectionLessonPlayerPackEditorInner({ part, onChange }: Props) {
  const initialSession = (() => {
    const stored = parseStoredQuizSession(part.studioFormat, part.authoringSession);
    return stored ? cloneSession(stored) : blankQuizSessionForStudioFormat(part.studioFormat);
  })();
  const [session, setSession] = useState<QuizSession>(initialSession);
  const [selectedItemId, setSelectedItemId] = useState(
    () => sessionItemIds(initialSession)[0] ?? "",
  );

  const patchSession = useCallback(
    (next: QuizSession) => {
      setSession(next);
      const exported = exportPartFromQuizSession(next);
      onChange({
        ...part,
        title: exported.title,
        pack: exported.pack,
        authoringSession: exported.authoringSession,
      });
    },
    [onChange, part],
  );

  const itemIds = sessionItemIds(session);
  const [itemIndex, setItemIndex] = useAuthoringItemIndex(itemIds.length, part.id);

  const selectedId = itemIds[itemIndex] ?? selectedItemId;

  const addItem = () => {
    const { session: next, selectedItemId: newId } = appendBlankItem(session);
    patchSession(next);
    setSelectedItemId(newId);
    setItemIndex(itemIds.length);
  };

  const removeItem = (removeId: string) => {
    const next = removeSessionItem(session, removeId);
    patchSession(next);
    setSelectedItemId(sessionItemIds(next)[0] ?? "");
    setItemIndex(0);
  };

  if (!parseStoredQuizSession(part.studioFormat, part.authoringSession) && !part.pack) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
        Quiz content could not be loaded. Remove this part and add it again.
      </p>
    );
  }

  const listLabel =
    session.format === "flashcards"
      ? "Cards"
      : session.format === "wordsearch" ||
          session.format === "crossword" ||
          session.format === "memory"
        ? "Words"
        : "Questions";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
          {part.studioFormat.replace(/_/g, " ")} · Lesson Player quiz
        </p>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-stone-900 px-3 text-xs font-bold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Add {listLabel.toLowerCase()}
        </button>
      </div>

      <AuthoringItemPager
        count={itemIds.length}
        index={itemIndex}
        onIndexChange={setItemIndex}
        label={listLabel}
        itemLabels={itemIds.map((id, index) => listEntryLabel(session, id, index))}
      />

      {session.format === "flashcards" ? (
        <FlashcardsInlineEditor
          document={session.document}
          selectedItemId={selectedId}
          onPatch={(next) => patchSession({ format: "flashcards", document: next })}
          onRemove={() => removeItem(selectedId)}
          canRemove={session.document.interaction.cards.length > 1}
        />
      ) : null}

      {session.format === "true_false" ? (
        <TrueFalseEditor
          document={session.document}
          selectedItemId={selectedId}
          onPatch={(next) => patchSession({ format: "true_false", document: next })}
          onRemove={() => removeItem(selectedId)}
          canRemove={session.document.interaction.items.length > 1}
        />
      ) : null}

      {session.format === "fill_blanks" ? (
        <FillBlanksEditor
          document={session.document}
          selectedItemId={selectedId}
          onPatch={(next) => patchSession({ format: "fill_blanks", document: next })}
          onRemove={() => removeItem(selectedId)}
          canRemove={session.document.interaction.items.length > 1}
        />
      ) : null}

      {session.format === "wordsearch" ||
      session.format === "crossword" ||
      session.format === "memory" ? (
        <WordGameEditor
          document={session.document}
          selectedItemId={selectedId}
          onPatch={(next) =>
            patchSession({ format: session.format, document: next } as QuizSession)
          }
          onRemove={() => removeItem(selectedId)}
          canRemove={session.document.interaction.items.length > 2}
        />
      ) : null}
    </div>
  );
}

function FlashcardsInlineEditor({
  document,
  selectedItemId,
  onPatch,
  onRemove,
  canRemove,
}: {
  document: GamesFlashcardsAuthoringDocument;
  selectedItemId: string;
  onPatch: (next: GamesFlashcardsAuthoringDocument) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const card =
    document.interaction.cards.find((row) => row.id === selectedItemId) ?? null;
  if (!card) {
    return <p className="text-sm text-stone-500">Select a card.</p>;
  }

  const patchCard = (patch: Partial<GamesFlashcardsAuthoringDocument["interaction"]["cards"][number]>) => {
    onPatch({
      ...document,
      interaction: {
        ...document.interaction,
        cards: document.interaction.cards.map((row) =>
          row.id === card.id ? { ...row, ...patch } : row,
        ),
      },
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-stone-900">Card</h3>
        <button
          type="button"
          disabled={!canRemove}
          onClick={onRemove}
          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-bold text-rose-800 disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>
      <label className="block text-xs font-semibold text-stone-600">
        Word
        <input
          className={inputClass}
          value={card.faces.word ?? ""}
          onChange={(event) =>
            patchCard({ faces: { ...card.faces, word: event.target.value } })
          }
        />
      </label>
      <label className="block text-xs font-semibold text-stone-600">
        Definition
        <textarea
          className={inputClass}
          rows={2}
          value={card.faces.definition ?? ""}
          onChange={(event) =>
            patchCard({ faces: { ...card.faces, definition: event.target.value } })
          }
        />
      </label>
      <MediaUrlControls
        label="Picture"
        value={card.faces.pictureUrl ?? ""}
        onChange={(url) => patchCard({ faces: { ...card.faces, pictureUrl: url } })}
      />
    </div>
  );
}
