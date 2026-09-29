"use client";

import { useMemo, useState } from "react";
import {
  createMissingBagDraft,
  type SecretRoleCard,
  type SecretRoleLaunchDraft,
  type SecretRoleStudent,
} from "@/lib/secret-roles/domain";

type Props = {
  sessionId: string;
  students: SecretRoleStudent[];
  onLaunched: (roundId: string) => void;
};

function copyDraft(draft: SecretRoleLaunchDraft): SecretRoleLaunchDraft {
  return { ...draft, cards: draft.cards.map((card) => ({ ...card, sentenceFrames: [...card.sentenceFrames] })) };
}

export function SecretRolesLaunchPanel({ sessionId, students, onLaunched }: Props) {
  const initial = useMemo(() => createMissingBagDraft(students.length), [students.length]);
  const [draft, setDraft] = useState<SecretRoleLaunchDraft>(() => copyDraft(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copies = draft.cards.reduce((total, card) => total + card.copies, 0);
  const coverageOk = students.length >= 2 && copies >= students.length && draft.cards.length <= students.length;

  const updateCard = (index: number, patch: Partial<SecretRoleCard>) => {
    setDraft((current) => ({
      ...current,
      cards: current.cards.map((card, cardIndex) =>
        cardIndex === index ? { ...card, ...patch } : card,
      ),
    }));
  };

  const launch = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/virtual-classroom/${sessionId}/secret-roles`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, students }),
      });
      const payload = (await response.json()) as { error?: string; round?: { id?: string } };
      if (!response.ok || !payload.round?.id) {
        throw new Error(payload.error ?? "Could not start Secret Roles.");
      }
      onLaunched(payload.round.id);
    } catch (launchError) {
      setError(launchError instanceof Error ? launchError.message : "Could not start Secret Roles.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-800">Live activity</p>
        <h3 className="mt-1 text-lg font-extrabold text-slate-950">Secret Roles</h3>
        <p className="mt-1 text-xs text-slate-600">
          Give each learner private information, then lead a speaking mystery with no elimination.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
        <TextField
          label="Decision prompt"
          value={draft.discussionPrompt}
          onChange={(discussionPrompt) => setDraft({ ...draft, discussionPrompt })}
        />
      </div>
      <TextArea label="Scenario" value={draft.scenario} onChange={(scenario) => setDraft({ ...draft, scenario })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextArea
          label="Learning objective"
          value={draft.learningObjective}
          onChange={(learningObjective) => setDraft({ ...draft, learningObjective })}
        />
        <TextArea
          label="Success criteria"
          value={draft.successCriteria}
          onChange={(successCriteria) => setDraft({ ...draft, successCriteria })}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-extrabold text-slate-900">Private role cards</p>
            <p className={`text-xs font-semibold ${coverageOk ? "text-emerald-700" : "text-amber-700"}`}>
              {students.length} students · {copies} card copies · {coverageOk ? "Roster covered" : "Adjust copies to cover the roster"}
            </p>
          </div>
          <button
            type="button"
            disabled={draft.cards.length >= Math.max(students.length, 2)}
            onClick={() =>
              setDraft((current) => ({
                ...current,
                cards: [
                  ...current.cards,
                  {
                    id: `role-${Date.now().toString(36)}`,
                    title: "New role",
                    privateInformation: "Add the private clue this learner knows.",
                    mission: "Add the communication goal for this learner.",
                    sentenceFrames: ["I know that…", "Can you tell me…?"],
                    copies: 1,
                  },
                ],
              }))
            }
            className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-bold text-violet-900 disabled:opacity-40"
          >
            Add role
          </button>
        </div>

        {draft.cards.map((card, index) => (
          <div key={card.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Role {index + 1}</p>
              {draft.cards.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, cards: current.cards.filter((_, itemIndex) => itemIndex !== index) }))}
                  className="text-xs font-semibold text-red-700 hover:underline"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_6rem]">
              <TextField label="Role name" value={card.title} onChange={(title) => updateCard(index, { title })} />
              <label className="text-xs font-bold text-slate-700">
                Copies
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={card.copies}
                  onChange={(event) => updateCard(index, { copies: Math.max(1, Number(event.target.value) || 1) })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal text-slate-950"
                />
              </label>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <TextArea label="Private information" value={card.privateInformation} onChange={(privateInformation) => updateCard(index, { privateInformation })} />
              <TextArea label="Speaking mission" value={card.mission} onChange={(mission) => updateCard(index, { mission })} />
            </div>
            <label className="mt-3 block text-xs font-bold text-slate-700">
              Sentence frames · one per line
              <textarea
                rows={2}
                value={card.sentenceFrames.join("\n")}
                onChange={(event) => updateCard(index, { sentenceFrames: event.target.value.split("\n") })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal text-slate-950"
              />
            </label>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <span className="font-bold text-slate-900">Included now: </span>
        {students.length ? students.map((student) => student.displayName).join(", ") : "No students are currently visible in the live roster."}
      </div>
      {error ? <p role="alert" className="text-sm font-semibold text-red-700">{error}</p> : null}
      <button
        type="button"
        disabled={busy || !coverageOk}
        onClick={() => void launch()}
        className="w-full rounded-xl bg-violet-800 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {busy ? "Assigning private roles…" : "Assign roles and start briefing"}
      </button>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-bold text-slate-700">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal text-slate-950" />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-bold text-slate-700">
      {label}
      <textarea rows={2} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal text-slate-950" />
    </label>
  );
}
