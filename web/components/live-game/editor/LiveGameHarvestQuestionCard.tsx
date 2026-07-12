"use client";

import { useMemo, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import type { HarvestMcPayload, LiveGameQuestionRow } from "@/lib/live-game/question-banks/types";

type Props = {
  question: LiveGameQuestionRow;
  readOnly?: boolean;
  onSave: (patch: { prompt: string; payload: HarvestMcPayload; enabled: boolean }) => Promise<void>;
  onDelete: () => Promise<void>;
};

function buildPayload(options: string[], correctAnswers: string[]): HarvestMcPayload {
  return {
    type: "multiple_choice",
    options: options.map((option) => option.trim()).filter(Boolean),
    correctAnswers,
  };
}

export function LiveGameHarvestQuestionCard({
  question,
  readOnly = false,
  onSave,
  onDelete,
}: Props) {
  const initial =
    question.payload.type === "multiple_choice" ?
      question.payload
    : { type: "multiple_choice" as const, options: ["", ""], correctAnswers: [] as string[] };

  const [prompt, setPrompt] = useState(question.prompt);
  const [options, setOptions] = useState(initial.options.length >= 2 ? initial.options : ["", ""]);
  const [correctAnswers, setCorrectAnswers] = useState(initial.correctAnswers);
  const [enabled, setEnabled] = useState(question.enabled);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(() => {
    const payload = buildPayload(options, correctAnswers);
    return (
      prompt !== question.prompt ||
      enabled !== question.enabled ||
      JSON.stringify(payload) !== JSON.stringify(initial)
    );
  }, [prompt, options, correctAnswers, enabled, question, initial]);

  function toggleCorrect(option: string) {
    setCorrectAnswers((current) => {
      if (current.includes(option)) {
        return current.filter((value) => value !== option);
      }
      return [...current, option];
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave({ prompt, payload: buildPayload(options, correctAnswers), enabled });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save question.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this harvest question?")) return;
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
        <span className="text-sm font-bold text-kid-ink">Options</span>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={option}
              disabled={readOnly}
              onChange={(event) => {
                const next = [...options];
                const previous = next[index] ?? "";
                next[index] = event.target.value;
                setOptions(next);
                setCorrectAnswers((current) =>
                  current.map((answer) => (answer === previous ? event.target.value : answer)),
                );
              }}
              className="min-w-0 flex-1 rounded-lg border-4 border-kid-ink px-3 py-2 text-base font-semibold text-kid-ink disabled:opacity-70"
            />
            <label className="flex shrink-0 items-center gap-1 text-sm font-bold text-kid-ink">
              <input
                type="checkbox"
                disabled={readOnly || !option.trim()}
                checked={correctAnswers.includes(option)}
                onChange={() => toggleCorrect(option)}
              />
              Correct
            </label>
            {!readOnly && options.length > 2 ?
              <button
                type="button"
                className="text-sm font-bold text-red-700"
                onClick={() => {
                  const removed = options[index] ?? "";
                  setOptions(options.filter((_, i) => i !== index));
                  setCorrectAnswers((current) => current.filter((answer) => answer !== removed));
                }}
              >
                ✕
              </button>
            : null}
          </div>
        ))}
        {!readOnly ?
          <button
            type="button"
            className="text-sm font-bold text-kid-ink underline"
            onClick={() => setOptions([...options, ""])}
          >
            + Add option
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
