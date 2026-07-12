"use client";

import { useMemo, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import type { CraftSentencePayload, LiveGameQuestionRow } from "@/lib/live-game/question-banks/types";

type Props = {
  question: LiveGameQuestionRow;
  readOnly?: boolean;
  onSave: (patch: { prompt: string; payload: CraftSentencePayload; enabled: boolean }) => Promise<void>;
  onDelete: () => Promise<void>;
};

export function LiveGameCraftQuestionCard({
  question,
  readOnly = false,
  onSave,
  onDelete,
}: Props) {
  const initial =
    question.payload.type === "drag_sentence" ?
      question.payload
    : { type: "drag_sentence" as const, wordBank: ["I"], correctOrder: ["I"], slotCount: 1 };

  const [prompt, setPrompt] = useState(question.prompt);
  const [wordBank, setWordBank] = useState(initial.wordBank);
  const [correctOrder, setCorrectOrder] = useState(initial.correctOrder);
  const [enabled, setEnabled] = useState(question.enabled);
  const [newToken, setNewToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload: CraftSentencePayload = {
    type: "drag_sentence",
    wordBank,
    correctOrder,
    slotCount: correctOrder.length,
  };

  const dirty = useMemo(
    () =>
      prompt !== question.prompt ||
      enabled !== question.enabled ||
      JSON.stringify(payload) !== JSON.stringify(initial),
    [prompt, enabled, payload, question, initial],
  );

  function moveOrder(index: number, direction: -1 | 1) {
    const next = [...correctOrder];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const current = next[index];
    const swap = next[target];
    if (current == null || swap == null) return;
    next[index] = swap;
    next[target] = current;
    setCorrectOrder(next);
  }

  function removeToken(token: string) {
    setWordBank((current) => current.filter((value) => value !== token));
    setCorrectOrder((current) => current.filter((value) => value !== token));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave({ prompt, payload, enabled });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save question.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this craft question?")) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete question.");
      setDeleting(false);
    }
  }

  return (
    <article className="space-y-3 rounded-lg border-4 border-kid-ink bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <label className="block flex-1 space-y-1">
          <span className="text-sm font-bold text-kid-ink">Prompt</span>
          <textarea
            value={prompt}
            disabled={readOnly}
            rows={2}
            onChange={(event) => setPrompt(event.target.value)}
            className="w-full rounded-lg border-4 border-kid-ink px-3 py-2 text-base font-semibold text-kid-ink disabled:opacity-70"
          />
        </label>
        {!readOnly ?
          <KidButton
            variant="secondary"
            disabled={deleting}
            onClick={() => void handleDelete()}
            className="min-h-10 shrink-0 px-3 py-1 text-sm"
          >
            Delete
          </KidButton>
        : null}
      </div>

      <div className="space-y-2">
        <span className="text-sm font-bold text-kid-ink">Word bank</span>
        <div className="flex flex-wrap gap-2">
          {wordBank.map((token) => (
            <span
              key={token}
              className="inline-flex items-center gap-1 rounded-lg border-2 border-kid-ink bg-kid-panel px-2 py-1 text-sm font-bold text-kid-ink"
            >
              {token}
              {!readOnly ?
                <button type="button" className="text-red-700" onClick={() => removeToken(token)}>
                  ✕
                </button>
              : null}
            </span>
          ))}
        </div>
        {!readOnly ?
          <div className="flex gap-2">
            <input
              value={newToken}
              onChange={(event) => setNewToken(event.target.value)}
              placeholder="Add word"
              className="min-w-0 flex-1 rounded-lg border-4 border-kid-ink px-3 py-2 text-base font-semibold text-kid-ink"
            />
            <KidButton
              variant="secondary"
              className="min-h-10 px-3 py-1 text-sm"
              onClick={() => {
                const token = newToken.trim();
                if (!token) return;
                setWordBank((current) => (current.includes(token) ? current : [...current, token]));
                setNewToken("");
              }}
            >
              Add
            </KidButton>
          </div>
        : null}
      </div>

      <div className="space-y-2">
        <span className="text-sm font-bold text-kid-ink">Correct order</span>
        {correctOrder.map((token, index) => (
          <div key={`${token}-${index}`} className="flex items-center gap-2">
            <span className="w-6 text-sm font-bold text-kid-ink">{index + 1}.</span>
            <select
              value={token}
              disabled={readOnly}
              onChange={(event) => {
                const next = [...correctOrder];
                next[index] = event.target.value;
                setCorrectOrder(next);
              }}
              className="min-w-0 flex-1 rounded-lg border-4 border-kid-ink px-3 py-2 text-base font-semibold text-kid-ink disabled:opacity-70"
            >
              {wordBank.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {!readOnly ?
              <>
                <button
                  type="button"
                  className="text-sm font-bold text-kid-ink"
                  disabled={index === 0}
                  onClick={() => moveOrder(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="text-sm font-bold text-kid-ink"
                  disabled={index === correctOrder.length - 1}
                  onClick={() => moveOrder(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="text-sm font-bold text-red-700"
                  onClick={() => setCorrectOrder(correctOrder.filter((_, i) => i !== index))}
                >
                  ✕
                </button>
              </>
            : null}
          </div>
        ))}
        {!readOnly ?
          <button
            type="button"
            className="text-sm font-bold text-kid-ink underline"
            onClick={() => {
              const first = wordBank[0];
              if (!first) return;
              setCorrectOrder([...correctOrder, first]);
            }}
          >
            + Add slot
          </button>
        : null}
      </div>

      <label className="flex items-center gap-2 text-sm font-bold text-kid-ink">
        <input
          type="checkbox"
          disabled={readOnly}
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Enabled in live game
      </label>

      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}

      {!readOnly ?
        <KidButton
          variant="primary"
          disabled={!dirty || saving}
          onClick={() => void handleSave()}
          className="min-h-11 px-4 py-2 text-base"
        >
          {saving ? "Saving..." : dirty ? "Save question ●" : "Save question"}
        </KidButton>
      : null}
    </article>
  );
}
