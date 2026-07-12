"use client";

import { useMemo, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import type { DepositSpellPayload, LiveGameQuestionRow } from "@/lib/live-game/question-banks/types";

type Props = {
  question: LiveGameQuestionRow;
  readOnly?: boolean;
  onSave: (patch: { prompt: string; payload: DepositSpellPayload; enabled: boolean }) => Promise<void>;
  onDelete: () => Promise<void>;
};

export function LiveGameDepositQuestionCard({
  question,
  readOnly = false,
  onSave,
  onDelete,
}: Props) {
  const initial =
    question.payload.type === "deposit_spell" ?
      question.payload
    : { type: "deposit_spell" as const, targetWord: "word", spellHint: "Definition hint" };

  const [prompt, setPrompt] = useState(question.prompt);
  const [targetWord, setTargetWord] = useState(initial.targetWord);
  const [spellHint, setSpellHint] = useState(initial.spellHint);
  const [enabled, setEnabled] = useState(question.enabled);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payload: DepositSpellPayload = {
    type: "deposit_spell",
    targetWord: targetWord.trim().toLowerCase(),
    spellHint: spellHint.trim(),
  };

  const dirty = useMemo(
    () =>
      prompt !== question.prompt ||
      enabled !== question.enabled ||
      JSON.stringify(payload) !== JSON.stringify(initial),
    [prompt, enabled, payload, question, initial],
  );

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
    if (!window.confirm("Delete this deposit question?")) return;
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
          <span className="text-sm font-bold text-kid-ink">Prompt (shown as definition)</span>
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

      <label className="block space-y-1">
        <span className="text-sm font-bold text-kid-ink">Target word (lowercase a–z)</span>
        <input
          value={targetWord}
          disabled={readOnly}
          onChange={(event) => setTargetWord(event.target.value.replace(/[^a-z]/gi, "").toLowerCase())}
          className="w-full rounded-lg border-4 border-kid-ink px-3 py-2 text-base font-semibold text-kid-ink disabled:opacity-70"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-bold text-kid-ink">Spell hint</span>
        <input
          value={spellHint}
          disabled={readOnly}
          onChange={(event) => setSpellHint(event.target.value)}
          className="w-full rounded-lg border-4 border-kid-ink px-3 py-2 text-base font-semibold text-kid-ink disabled:opacity-70"
        />
      </label>

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
