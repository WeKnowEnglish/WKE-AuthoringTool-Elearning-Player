"use client";

import { KidButton } from "@/components/kid-ui/KidButton";
import type { LiveGameQuestionSetRow } from "@/lib/live-game/question-banks/types";

type MetadataFormState = {
  title: string;
  level: "A1" | "A2";
  topic: string;
  learningObjective: string;
  description: string;
};

type Props = {
  value: MetadataFormState;
  dirty: boolean;
  saving: boolean;
  readOnly?: boolean;
  onChange: (patch: Partial<MetadataFormState>) => void;
  onSave: () => void;
};

export function toMetadataFormState(set: LiveGameQuestionSetRow): MetadataFormState {
  return {
    title: set.title,
    level: set.level,
    topic: set.topic,
    learningObjective: set.learningObjective,
    description: set.description,
  };
}

export function LiveGameQuestionSetMetadataForm({
  value,
  dirty,
  saving,
  readOnly = false,
  onChange,
  onSave,
}: Props) {
  return (
    <div className="space-y-3 rounded-lg border-4 border-kid-ink bg-white p-4">
      <label className="block space-y-1">
        <span className="text-sm font-bold text-kid-ink">Title</span>
        <input
          value={value.title}
          disabled={readOnly}
          onChange={(event) => onChange({ title: event.target.value })}
          className="w-full rounded-lg border-4 border-kid-ink bg-white px-3 py-2 text-base font-semibold text-kid-ink disabled:opacity-70"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-bold text-kid-ink">Level</span>
          <select
            value={value.level}
            disabled={readOnly}
            onChange={(event) => onChange({ level: event.target.value as "A1" | "A2" })}
            className="w-full rounded-lg border-4 border-kid-ink bg-white px-3 py-2 text-base font-semibold text-kid-ink disabled:opacity-70"
          >
            <option value="A1">A1</option>
            <option value="A2">A2</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-bold text-kid-ink">Topic</span>
          <input
            value={value.topic}
            disabled={readOnly}
            onChange={(event) => onChange({ topic: event.target.value })}
            className="w-full rounded-lg border-4 border-kid-ink bg-white px-3 py-2 text-base font-semibold text-kid-ink disabled:opacity-70"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-bold text-kid-ink">Learning objective</span>
        <input
          value={value.learningObjective}
          disabled={readOnly}
          onChange={(event) => onChange({ learningObjective: event.target.value })}
          className="w-full rounded-lg border-4 border-kid-ink bg-white px-3 py-2 text-base font-semibold text-kid-ink disabled:opacity-70"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-bold text-kid-ink">Description</span>
        <textarea
          value={value.description}
          disabled={readOnly}
          rows={2}
          onChange={(event) => onChange({ description: event.target.value })}
          className="w-full rounded-lg border-4 border-kid-ink bg-white px-3 py-2 text-base font-semibold text-kid-ink disabled:opacity-70"
        />
      </label>

      {!readOnly ?
        <KidButton
          variant="secondary"
          disabled={!dirty || saving}
          onClick={onSave}
          className="min-h-11 px-4 py-2 text-base"
        >
          {saving ? "Saving..." : dirty ? "Save metadata ●" : "Save metadata"}
        </KidButton>
      : null}
    </div>
  );
}
