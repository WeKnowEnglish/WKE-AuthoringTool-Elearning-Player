"use client";

import Link from "next/link";
import { useState } from "react";
import { savePackFlashcardSet } from "@/lib/actions/pack-flashcards";
import {
  FlashcardFaceStack,
  faceLabel,
  facesForSide,
} from "@/components/teacher/word-packs/FlashcardFaceStack";
import type {
  PackFlashcardCompileResult,
  PackFlashcardCompiledCard,
  PackFlashcardDraft,
  PackFlashcardFaceSnapshot,
} from "@/lib/vocabulary/pack-flashcards";
import { incompleteFacesOnCard } from "@/lib/vocabulary/pack-flashcards";

type Props = {
  compiled: PackFlashcardCompileResult;
  onBack: () => void;
  backLabel?: string;
  hideSave?: boolean;
};

function applyFaceEdits(
  faces: PackFlashcardFaceSnapshot,
  edits: {
    definition: string;
    example: string;
    pictureUrl: string;
  },
): PackFlashcardFaceSnapshot {
  const next: PackFlashcardFaceSnapshot = { ...faces };
  // Keep blank strings for included faces so incomplete cards stay editable.
  if (faces.definition !== undefined || edits.definition.trim()) {
    next.definition = edits.definition.trim();
  }
  if (faces.example !== undefined || edits.example.trim()) {
    next.example = edits.example.trim();
  }
  if (faces.pictureUrl !== undefined || edits.pictureUrl.trim()) {
    next.pictureUrl = edits.pictureUrl.trim();
  }
  return next;
}

function cardIncludeFaces(card: PackFlashcardCompiledCard) {
  return [...new Set([...card.frontFaces, ...card.backFaces])];
}

export function PackFlashcardPreview({
  compiled,
  onBack,
  backLabel = "Back to word selection",
  hideSave = false,
}: Props) {
  const [cards, setCards] = useState<PackFlashcardCompiledCard[]>(() => [...compiled.cards]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedSetId, setSavedSetId] = useState<string | null>(null);

  const draft: PackFlashcardDraft = compiled.draft;
  const total = cards.length;
  const current = cards[index];
  const currentIncomplete = current
    ? incompleteFacesOnCard(current.faces, cardIncludeFaces(current))
    : [];
  const [showEdits, setShowEdits] = useState(() => currentIncomplete.length > 0);

  const [definitionEdit, setDefinitionEdit] = useState(
    () => current?.faces.definition ?? "",
  );
  const [exampleEdit, setExampleEdit] = useState(() => current?.faces.example ?? "");
  const [pictureEdit, setPictureEdit] = useState(() => current?.faces.pictureUrl ?? "");

  function syncEditsFromCard(card: PackFlashcardCompiledCard | undefined) {
    setDefinitionEdit(card?.faces.definition ?? "");
    setExampleEdit(card?.faces.example ?? "");
    setPictureEdit(card?.faces.pictureUrl ?? "");
    if (card) {
      const incomplete = incompleteFacesOnCard(card.faces, cardIncludeFaces(card));
      setShowEdits(incomplete.length > 0);
    }
  }

  function goTo(nextIndex: number) {
    setIndex(nextIndex);
    setFlipped(false);
    syncEditsFromCard(cards[nextIndex]);
  }

  function goNext() {
    if (index >= total - 1) {
      setFinished(true);
      return;
    }
    goTo(index + 1);
  }

  function applyEditsToCurrent() {
    if (!current || savedSetId) return;
    const nextFaces = applyFaceEdits(current.faces, {
      definition: definitionEdit,
      example: exampleEdit,
      pictureUrl: pictureEdit,
    });
    setCards((prev) =>
      prev.map((card) =>
        card.id === current.id ? { ...card, faces: nextFaces } : card,
      ),
    );
  }

  async function onSave() {
    if (hideSave || savedSetId || saving) return;
    applyEditsToCurrent();
    const cardsToSave = cards.map((card) => {
      if (card.id !== current?.id) return card;
      return {
        ...card,
        faces: applyFaceEdits(card.faces, {
          definition: definitionEdit,
          example: exampleEdit,
          pictureUrl: pictureEdit,
        }),
      };
    });
    setSaving(true);
    setSaveMessage(null);
    try {
      const result = await savePackFlashcardSet({
        draft,
        cards: cardsToSave,
        warnings: compiled.warnings,
      });
      if (!result.ok) {
        setSaveMessage(result.error);
        return;
      }
      setCards(cardsToSave);
      setSavedSetId(result.set.id);
      setSaveMessage(`Saved as draft: ${result.set.title}`);
    } finally {
      setSaving(false);
    }
  }

  const saveControls = hideSave ? null : (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={saving || Boolean(savedSetId) || total === 0}
        className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {savedSetId ? "Saved" : saving ? "Saving…" : "Save flashcards"}
      </button>
      {saveMessage ? (
        <p className={`text-xs ${savedSetId ? "text-emerald-800" : "text-amber-900"}`}>
          {saveMessage}
          {savedSetId ? (
            <>
              {" "}
              ·{" "}
              <Link
                href="/teacher/word-packs?tab=flashcards"
                className="font-semibold underline underline-offset-2"
              >
                View in Flashcards
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );

  if (total === 0 || !current) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-neutral-700">No cards to preview.</p>
        {compiled.warnings.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-xs text-amber-900">
            {compiled.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          onClick={onBack}
          className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
        >
          {backLabel}
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4">
        <p className="text-sm font-semibold text-emerald-950">Preview complete</p>
        <p className="text-sm text-emerald-900">
          You walked through {total} flashcard{total === 1 ? "" : "s"} from this pack. Assign from
          the Flashcards tab or class Homework so students can study on Primary.
        </p>
        {compiled.warnings.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-xs text-emerald-900/80">
            {compiled.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
        <div className="space-y-2 pt-1">
          {saveControls}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setFinished(false);
                goTo(0);
              }}
              className="rounded border border-emerald-700 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-100/60"
            >
              Play again
            </button>
            <button
              type="button"
              onClick={onBack}
              className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              {backLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const side = flipped ? "back" : "front";
  const sideFaces = facesForSide(current, side);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-neutral-500">
          Teacher preview · Card {index + 1} of {total} · {flipped ? "Back" : "Front"}
          {currentIncomplete.length > 0 ? " · needs edit" : ""}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-neutral-600 underline-offset-2 hover:underline"
        >
          {backLabel}
        </button>
      </div>

      {currentIncomplete.length > 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Fill in {currentIncomplete.map(faceLabel).join(", ")} below, then Apply — blank faces are
          kept so you can finish them later.
        </div>
      ) : null}

      {compiled.warnings.length > 0 && index === 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {compiled.warnings.join(" ")}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        className="flex min-h-[12rem] w-full flex-col items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-sky-50/50 px-4 py-6 text-left transition hover:border-neutral-400"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          {sideFaces.map(faceLabel).join(" · ") || "Empty"} · tap to flip
        </p>
        <FlashcardFaceStack faces={sideFaces} values={current.faces} size="lg" emptyHints />
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            if (index <= 0) return;
            applyEditsToCurrent();
            goTo(index - 1);
          }}
          disabled={index <= 0}
          className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => {
            applyEditsToCurrent();
            goNext();
          }}
          className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
        >
          {index >= total - 1 ? "Finish preview" : "Next card"}
        </button>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50/80 px-3 py-2">
        <button
          type="button"
          onClick={() => {
            if (!showEdits) syncEditsFromCard(current);
            setShowEdits((v) => !v);
          }}
          className="text-xs font-semibold text-neutral-700 underline-offset-2 hover:underline"
        >
          {showEdits ? "Hide face edits" : "Edit faces on this card"}
        </button>
        {showEdits ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-1">
            <label className="block text-xs text-neutral-700">
              Definition
              <textarea
                value={definitionEdit}
                onChange={(e) => setDefinitionEdit(e.target.value)}
                disabled={Boolean(savedSetId)}
                rows={2}
                className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900"
              />
            </label>
            <label className="block text-xs text-neutral-700">
              Example sentence
              <textarea
                value={exampleEdit}
                onChange={(e) => setExampleEdit(e.target.value)}
                disabled={Boolean(savedSetId)}
                rows={2}
                className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900"
              />
            </label>
            <label className="block text-xs text-neutral-700">
              Picture URL
              <input
                type="url"
                value={pictureEdit}
                onChange={(e) => setPictureEdit(e.target.value)}
                disabled={Boolean(savedSetId)}
                placeholder="https://"
                className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900"
              />
            </label>
            <button
              type="button"
              onClick={applyEditsToCurrent}
              disabled={Boolean(savedSetId)}
              className="justify-self-start rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
            >
              Apply to this card
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
        {saveControls ?? <span />}
      </div>
    </div>
  );
}
