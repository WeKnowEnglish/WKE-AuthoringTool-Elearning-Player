"use client";

import type { HomeworkCollectionDocumentModulePart } from "@/lib/homework-collections";
import { documentModuleValidationIssues } from "@/lib/homework-collections/document-module";

type Props = {
  part: HomeworkCollectionDocumentModulePart;
  onChange: (part: HomeworkCollectionDocumentModulePart) => void;
};

const fieldClass =
  "mt-1 min-w-0 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-sm font-semibold text-stone-900";

export function HomeworkCollectionDocumentModuleEditor({ part, onChange }: Props) {
  const issues = documentModuleValidationIssues(part);

  const patchDocument = (patch: Record<string, unknown>) => {
    onChange({
      ...part,
      document: { ...part.document, ...patch },
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
        {part.moduleFormat.replace(/_/g, " ")} · Reading module
      </p>
      <label className="block text-xs font-semibold text-stone-600">
        Activity title
        <input
          className={fieldClass}
          value={part.title}
          onChange={(event) => onChange({ ...part, title: event.target.value })}
        />
      </label>
      <label className="block text-xs font-semibold text-stone-600">
        Student instructions
        <textarea
          className={fieldClass}
          rows={2}
          value={part.instructions}
          onChange={(event) => onChange({ ...part, instructions: event.target.value })}
        />
      </label>
      <label className="block text-xs font-semibold text-stone-600">
        Document title (shown to students)
        <input
          className={fieldClass}
          value={typeof part.document.title === "string" ? part.document.title : ""}
          onChange={(event) => {
            const title = event.target.value;
            onChange({
              ...part,
              document: { ...part.document, title },
            });
          }}
        />
      </label>
      <label className="block text-xs font-semibold text-stone-600">
        Document instructions
        <textarea
          className={fieldClass}
          rows={2}
          value={
            typeof part.document.instructions === "string" ? part.document.instructions : ""
          }
          onChange={(event) => patchDocument({ instructions: event.target.value })}
        />
      </label>
      <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900">
        Passage, gaps, and questions use the seeded sample content. Open Activity Builder →
        Reading to author a full version, then assign from the bank—or edit the JSON in a
        future release.
      </p>
      {issues.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs font-bold text-emerald-700">Content is valid for assign.</p>
      )}
    </div>
  );
}
