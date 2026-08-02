"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  archiveParentStreamItem,
  publishParentStreamItem,
} from "@/lib/actions/parent-stream-publications";
import type { TeacherParentStreamPublication } from "@/lib/parent/parent-stream";

export function ParentStreamPublishingPanel(props: {
  classId: string;
  studentId: string;
  publications: TeacherParentStreamPublication[] | null;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"student_highlight" | "milestone">("student_highlight");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contextLabel, setContextLabel] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (!props.publications) {
    return null;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("publish");
    setError("");
    setMessage("");
    try {
      const result = await publishParentStreamItem({
        classId: props.classId,
        studentId: props.studentId,
        kind,
        title,
        body,
        contextLabel,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setBody("");
      setContextLabel("");
      setMessage(result.message);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function archive(publicationId: string) {
    setBusyId(publicationId);
    setError("");
    setMessage("");
    try {
      const result = await archiveParentStreamItem({
        classId: props.classId,
        studentId: props.studentId,
        publicationId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const active = props.publications.filter((item) => item.status === "published");

  return (
    <section className="space-y-4 rounded-xl border bg-white p-4" aria-labelledby="parent-sharing-heading">
      <div>
        <h2 id="parent-sharing-heading" className="text-lg font-bold text-neutral-950">
          Parent stream highlights
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Share a short, student-specific learning moment. Keep it factual, encouraging, and useful.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-3 rounded-lg bg-indigo-50/60 p-3 md:grid-cols-2">
        <label className="text-sm font-semibold text-neutral-800">
          Update type
          <select
            value={kind}
            onChange={(event) =>
              setKind(event.target.value === "milestone" ? "milestone" : "student_highlight")
            }
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"
          >
            <option value="student_highlight">Learning highlight</option>
            <option value="milestone">Meaningful milestone</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-neutral-800">
          Context (optional)
          <input
            value={contextLabel}
            onChange={(event) => setContextLabel(event.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"
            placeholder="Daily routines · Speaking"
          />
        </label>
        <label className="text-sm font-semibold text-neutral-800 md:col-span-2">
          Parent-friendly title
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"
            placeholder="Used routine vocabulary with confidence"
          />
        </label>
        <label className="text-sm font-semibold text-neutral-800 md:col-span-2">
          What happened?
          <textarea
            required
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"
            placeholder="Describe the evidence in one or two clear sentences."
          />
        </label>
        <button
          type="submit"
          disabled={busyId !== null}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60 md:col-span-2 md:justify-self-start"
        >
          {busyId === "publish" ? "Publishing…" : "Publish to parent stream"}
        </button>
      </form>

      <p aria-live="polite" className="min-h-5 text-sm">
        {error ? <span className="text-red-700">{error}</span> : null}
        {!error && message ? <span className="text-emerald-700">{message}</span> : null}
      </p>

      {active.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            Currently published
          </h3>
          {active.map((item) => (
            <article key={item.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-950">{item.title}</p>
                <p className="mt-1 text-sm text-neutral-600">{item.body}</p>
              </div>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void archive(item.id)}
                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"
              >
                {busyId === item.id ? "Archiving…" : "Archive"}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
