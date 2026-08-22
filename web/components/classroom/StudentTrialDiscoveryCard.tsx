"use client";

import { useState, useTransition } from "react";
import { saveStudentTrialDiscovery } from "@/lib/actions/trial-discovery";
import type { TrialStudentDiscovery } from "@/lib/class-schedule/trial-types";

type Props = {
  classId: string;
  initialDiscovery: TrialStudentDiscovery | null;
};

const INTEREST_CHOICES = ["Games", "Stories", "Animals", "Music", "Sports", "Science", "Art"];

export function StudentTrialDiscoveryCard({ classId, initialDiscovery }: Props) {
  const [preferredName, setPreferredName] = useState(initialDiscovery?.preferredName ?? "");
  const [interests, setInterests] = useState(initialDiscovery?.interests ?? "");
  const [englishGoals, setEnglishGoals] = useState(initialDiscovery?.englishGoals ?? "");
  const [englishUse, setEnglishUse] = useState(initialDiscovery?.englishUse ?? "");
  const [confidence, setConfidence] = useState(initialDiscovery?.confidence ?? 3);
  const [feelsEasy, setFeelsEasy] = useState(initialDiscovery?.feelsEasy ?? "");
  const [feelsDifficult, setFeelsDifficult] = useState(initialDiscovery?.feelsDifficult ?? "");
  const [editing, setEditing] = useState(!initialDiscovery);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const addInterest = (choice: string) => {
    const current = interests.split(",").map((item) => item.trim()).filter(Boolean);
    if (!current.some((item) => item.toLowerCase() === choice.toLowerCase())) {
      setInterests([...current, choice].join(", "));
    }
  };

  const save = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveStudentTrialDiscovery({
        classId,
        preferredName,
        interests,
        englishGoals,
        englishUse,
        confidence,
        feelsEasy,
        feelsDifficult,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      setMessage("Thanks! Your teacher can use this to make the trial feel more like you.");
    });
  };

  if (!editing) {
    return (
      <section className="mb-5 rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-violet-700">Your trial</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">Nice to meet you, {preferredName}!</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Your teacher has your interests and learning goals for today&apos;s lesson.
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 rounded-xl border border-violet-300 bg-white px-3 py-2 text-sm font-extrabold text-violet-800"
        >
          Update my answers
        </button>
        {message ? <p className="mt-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      </section>
    );
  }

  return (
    <section className="mb-5 rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 shadow-sm sm:p-6">
      <p className="text-xs font-black uppercase tracking-wide text-violet-700">Before we begin</p>
      <h2 className="mt-1 text-2xl font-black text-slate-950">Tell us about you</h2>
      <p className="mt-2 text-sm font-semibold text-slate-600">
        There are no wrong answers. This helps your teacher choose examples and activities you&apos;ll enjoy.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-800">
          What should we call you?
          <input
            value={preferredName}
            onChange={(event) => setPreferredName(event.target.value)}
            maxLength={120}
            className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 font-semibold"
          />
        </label>
        <label className="text-sm font-bold text-slate-800">
          When do you use English?
          <input
            value={englishUse}
            onChange={(event) => setEnglishUse(event.target.value)}
            maxLength={240}
            placeholder="School, games, videos, travel…"
            className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 font-semibold"
          />
        </label>
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-bold text-slate-800">What do you enjoy?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {INTEREST_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => addInterest(choice)}
              className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-extrabold text-violet-800 hover:bg-violet-100"
            >
              + {choice}
            </button>
          ))}
        </div>
        <input
          value={interests}
          onChange={(event) => setInterests(event.target.value)}
          maxLength={400}
          placeholder="Your interests"
          className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 font-semibold"
        />
      </fieldset>

      <label className="mt-4 block text-sm font-bold text-slate-800">
        What would you like to get better at in English?
        <textarea
          value={englishGoals}
          onChange={(event) => setEnglishGoals(event.target.value)}
          maxLength={400}
          rows={2}
          placeholder="Speaking, understanding, reading, writing, confidence…"
          className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 font-semibold"
        />
      </label>

      <fieldset className="mt-4">
        <legend className="text-sm font-bold text-slate-800">
          How confident do you feel speaking English? {confidence}/5
        </legend>
        <input
          type="range"
          min={1}
          max={5}
          value={confidence}
          onChange={(event) => setConfidence(Number(event.target.value))}
          className="mt-2 w-full accent-violet-600"
        />
        <div className="flex justify-between text-xs font-semibold text-slate-500">
          <span>I need help</span><span>Very confident</span>
        </div>
      </fieldset>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-800">
          What feels easy?
          <input
            value={feelsEasy}
            onChange={(event) => setFeelsEasy(event.target.value)}
            maxLength={240}
            className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 font-semibold"
          />
        </label>
        <label className="text-sm font-bold text-slate-800">
          What feels difficult?
          <input
            value={feelsDifficult}
            onChange={(event) => setFeelsDifficult(event.target.value)}
            maxLength={240}
            className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 font-semibold"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={isPending || !preferredName.trim()}
          className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Share with my teacher"}
        </button>
        {initialDiscovery ? (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-xl border border-violet-300 bg-white px-4 py-2.5 text-sm font-extrabold text-violet-800"
          >
            Keep previous answers
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm font-bold text-rose-700">{error}</p> : null}
    </section>
  );
}
