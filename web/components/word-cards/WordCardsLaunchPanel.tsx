"use client";

import { useState } from "react";
import { parseWordList, type WordCardsParticipationMode } from "@/lib/word-cards/domain";

export type WordCardsLaunchPayload = {
  title: string;
  instructions: string;
  successCriteria: string;
  wordList: string[];
  participationMode: WordCardsParticipationMode;
  timerMinutes: number;
};

type Props = {
  busy: boolean;
  initial?: Partial<WordCardsLaunchPayload>;
  submitLabel?: string;
  busyLabel?: string;
  onLaunch: (payload: WordCardsLaunchPayload) => void;
};

export function WordCardsLaunchPanel({
  busy,
  initial,
  submitLabel,
  busyLabel = "Starting…",
  onLaunch,
}: Props) {
  const [title, setTitle] = useState(initial?.title?.trim() || "Create a word card");
  const [instructions, setInstructions] = useState(
    initial?.instructions?.trim() || "Create a card for your assigned vocabulary word.",
  );
  const [successCriteria, setSuccessCriteria] = useState(
    initial?.successCriteria?.trim() || "Clear definition and a natural example sentence.",
  );
  const [wordListText, setWordListText] = useState(
    initial?.wordList?.length
      ? initial.wordList.join("\n")
      : "apple\nbanana\nchair\ndesk\nwindow\nschool\nfriend\nhappy",
  );
  const [timerMinutes, setTimerMinutes] = useState(initial?.timerMinutes ?? 4);
  const [participationMode, setParticipationMode] = useState<WordCardsParticipationMode>(
    initial?.participationMode === "group" ? "group" : "individual",
  );

  const wordCount = parseWordList(wordListText).length;

  return (
    <div className="space-y-2 rounded-lg border border-violet-100 bg-violet-50/60 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-violet-900">Word cards</p>
      <p className="text-xs text-slate-600">
        Students create cards for assigned words, then you moderate into a class deck and play.
      </p>

      <fieldset className="space-y-1">
        <legend className="text-xs font-semibold text-slate-700">Mode</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["individual", "Individual"],
              ["group", "Group"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={busy}
              onClick={() => setParticipationMode(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                participationMode === value
                  ? "bg-violet-700 text-white"
                  : "bg-white text-slate-800 ring-1 ring-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {participationMode === "group" && (
          <p className="text-xs text-amber-800">
            Generate groups in Group maker, then Send to word cards (or launch after groups exist).
          </p>
        )}
      </fieldset>

      <label className="block text-xs font-semibold text-slate-700">
        Word list
        <textarea
          value={wordListText}
          disabled={busy}
          onChange={(e) => setWordListText(e.target.value)}
          rows={4}
          placeholder="One word per line (or comma-separated)"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900"
        />
        <span className="mt-0.5 block font-normal text-slate-500">{wordCount} unique words</span>
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

      <label className="block text-xs font-semibold text-slate-700">
        Success criteria
        <input
          type="text"
          value={successCriteria}
          disabled={busy}
          onChange={(e) => setSuccessCriteria(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900"
        />
      </label>

      <label className="block text-xs font-semibold text-slate-700">
        Timer
        <select
          value={timerMinutes}
          disabled={busy}
          onChange={(e) => setTimerMinutes(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900"
        >
          {[2, 3, 4, 5, 8, 10].map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        disabled={busy || wordCount === 0}
        onClick={() =>
          onLaunch({
            title: title.trim(),
            instructions: instructions.trim(),
            successCriteria: successCriteria.trim(),
            wordList: parseWordList(wordListText),
            participationMode,
            timerMinutes,
          })
        }
        className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy
          ? busyLabel
          : submitLabel ??
            (participationMode === "group" ? "Start group word cards" : "Start word cards")}
      </button>
    </div>
  );
}
