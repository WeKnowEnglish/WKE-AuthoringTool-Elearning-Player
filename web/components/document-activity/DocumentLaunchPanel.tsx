"use client";

import { useState } from "react";
import {
  DOCUMENT_TEMPLATE_OPTIONS,
  defaultPromptForTemplate,
  defaultScaffoldsForTemplate,
  parseScaffoldList,
  templateUsesStimulus,
} from "@/lib/document-activity/domain";
import type {
  DocumentParticipationMode,
  DocumentTemplateType,
} from "@/lib/document-activity/types";

export type DocumentLaunchPayload = {
  templateType: DocumentTemplateType;
  participationMode: DocumentParticipationMode;
  title: string;
  instructions: string;
  successCriteria: string;
  stimulus: string;
  wordBank: string[];
  sentenceStarters: string[];
  groupSubmitPolicy: "any_member";
  timerMinutes: number;
};

type Props = {
  busy: boolean;
  initial?: Partial<DocumentLaunchPayload>;
  submitLabel?: string;
  busyLabel?: string;
  onLaunch: (payload: DocumentLaunchPayload) => void;
};

type LaunchMode = "individual" | "group" | "whole_class";

const MODE_OPTIONS: { value: LaunchMode; label: string }[] = [
  { value: "individual", label: "Individual" },
  { value: "group", label: "Group" },
  { value: "whole_class", label: "Whole class" },
];

function defaultsFor(template: DocumentTemplateType) {
  const prompt = defaultPromptForTemplate(template);
  const scaffolds = defaultScaffoldsForTemplate(template);
  return {
    title: prompt.title,
    instructions: prompt.instructions,
    successCriteria: prompt.successCriteria,
    stimulus: prompt.stimulus ?? "",
    wordBankText: scaffolds.wordBank.join(", "),
    sentenceStartersText: scaffolds.sentenceStarters.join("\n"),
  };
}

export function DocumentLaunchPanel({
  busy,
  initial,
  submitLabel,
  busyLabel = "Starting…",
  onLaunch,
}: Props) {
  const seedTemplate = initial?.templateType ?? "paragraph";
  const seedDefaults = defaultsFor(seedTemplate);
  const [documentMode, setDocumentMode] = useState<LaunchMode>(
    initial?.participationMode ?? "individual",
  );
  const [templateType, setTemplateType] = useState<DocumentTemplateType>(seedTemplate);
  const [title, setTitle] = useState(initial?.title?.trim() || seedDefaults.title);
  const [instructions, setInstructions] = useState(
    initial?.instructions?.trim() || seedDefaults.instructions,
  );
  const [successCriteria, setSuccessCriteria] = useState(
    initial?.successCriteria?.trim() || seedDefaults.successCriteria,
  );
  const [stimulus, setStimulus] = useState(initial?.stimulus ?? seedDefaults.stimulus);
  const [wordBankText, setWordBankText] = useState(
    initial?.wordBank?.length ? initial.wordBank.join(", ") : seedDefaults.wordBankText,
  );
  const [sentenceStartersText, setSentenceStartersText] = useState(
    initial?.sentenceStarters?.length
      ? initial.sentenceStarters.join("\n")
      : seedDefaults.sentenceStartersText,
  );

  const selectTemplate = (next: DocumentTemplateType) => {
    setTemplateType(next);
    const defaults = defaultsFor(next);
    setTitle(defaults.title);
    setInstructions(defaults.instructions);
    setSuccessCriteria(defaults.successCriteria);
    setStimulus(defaults.stimulus);
    setWordBankText(defaults.wordBankText);
    setSentenceStartersText(defaults.sentenceStartersText);
  };

  const startLabel =
    documentMode === "group"
      ? "Start group document"
      : documentMode === "whole_class"
        ? "Start whole-class document"
        : "Start document activity";

  return (
    <div className="space-y-2 rounded-lg border border-sky-100 bg-sky-50/60 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-sky-900">Document</p>

      <div className="flex flex-wrap gap-2">
        {MODE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            disabled={busy}
            onClick={() => setDocumentMode(value)}
            className={`rounded px-3 py-1.5 text-sm font-bold ${
              documentMode === value
                ? "bg-sky-800 text-white"
                : "bg-white text-slate-800 ring-1 ring-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {documentMode === "group" && (
        <p className="text-xs text-slate-600">
          Generate groups first (or send them after launch). Submit policy: any member.
        </p>
      )}
      {documentMode === "whole_class" && (
        <p className="text-xs text-slate-600">
          Everyone shares one document. You Collect when ready — students do not Submit.
        </p>
      )}

      <label className="block text-xs font-semibold text-slate-700">
        Template
        <select
          value={templateType}
          disabled={busy}
          onChange={(e) => selectTemplate(e.target.value as DocumentTemplateType)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900"
        >
          {DOCUMENT_TEMPLATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-semibold text-slate-700">
        Title
        <input
          type="text"
          value={title}
          disabled={busy}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900"
        />
      </label>

      <label className="block text-xs font-semibold text-slate-700">
        Instructions
        <textarea
          value={instructions}
          disabled={busy}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900"
        />
      </label>

      {templateUsesStimulus(templateType) && (
        <label className="block text-xs font-semibold text-slate-700">
          Stimulus
          <textarea
            value={stimulus}
            disabled={busy}
            onChange={(e) => setStimulus(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900"
          />
        </label>
      )}

      <label className="block text-xs font-semibold text-slate-700">
        Success criteria
        <textarea
          value={successCriteria}
          disabled={busy}
          onChange={(e) => setSuccessCriteria(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900"
        />
      </label>

      <label className="block text-xs font-semibold text-slate-700">
        Word bank
        <textarea
          value={wordBankText}
          disabled={busy}
          onChange={(e) => setWordBankText(e.target.value)}
          rows={2}
          placeholder="Comma or line separated"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900"
        />
      </label>

      <label className="block text-xs font-semibold text-slate-700">
        Sentence starters
        <textarea
          value={sentenceStartersText}
          disabled={busy}
          onChange={(e) => setSentenceStartersText(e.target.value)}
          rows={2}
          placeholder="One per line"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900"
        />
      </label>

      <button
        type="button"
        disabled={busy}
        onClick={() =>
          onLaunch({
            templateType,
            participationMode: documentMode,
            title: title.trim(),
            instructions: instructions.trim(),
            successCriteria: successCriteria.trim(),
            stimulus: templateUsesStimulus(templateType) ? stimulus.trim() : "",
            wordBank: parseScaffoldList(wordBankText),
            sentenceStarters: parseScaffoldList(sentenceStartersText),
            groupSubmitPolicy: "any_member",
            timerMinutes: 5,
          })
        }
        className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? busyLabel : submitLabel ?? startLabel}
      </button>
    </div>
  );
}
