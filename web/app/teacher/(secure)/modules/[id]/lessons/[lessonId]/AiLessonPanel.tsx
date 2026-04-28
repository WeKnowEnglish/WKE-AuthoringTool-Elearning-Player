"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { appendScreensFromAi } from "@/lib/actions/teacher";

type Props = {
  moduleId: string;
  lessonId: string;
  lessonTitle: string;
  /** Tighter layout for the lesson editor right sidebar. */
  sidebar?: boolean;
};

export function AiLessonPanel({ moduleId, lessonId, lessonTitle, sidebar }: Props) {
  const router = useRouter();
  const [gradeBand, setGradeBand] = useState("3-5");
  const [goal, setGoal] = useState("");
  const [vocabulary, setVocabulary] = useState("");
  const [premise, setPremise] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function generate() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/teacher/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: lessonTitle,
          gradeBand,
          goal,
          vocabulary,
          premise,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Request failed");
        return;
      }
      await appendScreensFromAi(lessonId, moduleId, data.screens);
      setMsg(`Added ${data.screens.length} screens.`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`rounded-lg border border-amber-200 bg-amber-50 shadow-sm ${sidebar ? "p-3" : "p-4"}`}
    >
      <h2 className={`font-bold text-amber-950 ${sidebar ? "text-sm" : "text-lg"}`}>
        AI draft (Gemini)
      </h2>
      <p className={`mt-1 text-amber-900 ${sidebar ? "text-xs leading-snug" : "text-sm"}`}>
        Appends screens to this lesson; review in the storyboard and screen editor. Requires{" "}
        <code className="rounded bg-white px-1">GEMINI_API_KEY</code> on the server.
      </p>
      <div className={`mt-3 grid gap-3 ${sidebar ? "grid-cols-1" : "sm:grid-cols-2"}`}>
        <label className="text-sm">
          Grade band
          <input
            value={gradeBand}
            onChange={(e) => setGradeBand(e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className={`text-sm ${sidebar ? "" : "sm:col-span-2"}`}>
          Learning goal
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1"
            placeholder="Students can greet classmates"
          />
        </label>
        <label className={`text-sm ${sidebar ? "" : "sm:col-span-2"}`}>
          Vocabulary
          <input
            value={vocabulary}
            onChange={(e) => setVocabulary(e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1"
            placeholder="school, teacher, friend"
          />
        </label>
        <label className={`text-sm ${sidebar ? "" : "sm:col-span-2"}`}>
          Story premise
          <textarea
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded border px-2 py-1"
            placeholder="Two friends meet on the way to school..."
          />
        </label>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={generate}
        className={`mt-4 w-full rounded bg-amber-700 px-3 py-2 font-semibold text-white active:bg-amber-900 disabled:opacity-50 ${sidebar ? "text-xs sm:text-sm" : "text-sm"}`}
      >
        {busy ? "Generating…" : "Generate & append screens"}
      </button>
      {msg ? (
        <p className="mt-2 text-sm text-amber-950" role="status">
          {msg}
        </p>
      ) : null}
    </section>
  );
}
