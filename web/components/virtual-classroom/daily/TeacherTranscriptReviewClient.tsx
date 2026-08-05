"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type TranscriptRow = {
  id: string;
  status: string;
  durationSeconds: number | null;
  readyAt: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type Payload = {
  error?: string;
  transcriptionEnabled?: boolean;
  latest?: TranscriptRow | null;
  transcripts?: TranscriptRow[];
  signedUrl?: string | null;
  plainText?: string | null;
};

export function TeacherTranscriptReviewClient({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/virtual-classroom/${encodeURIComponent(sessionId)}/daily/transcription`,
      );
      const payload = (await res.json()) as Payload;
      if (!res.ok) {
        setError(payload.error ?? "Could not load transcript.");
        setData(null);
        return;
      }
      setData(payload);
    } catch {
      setError("Could not load transcript.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
            Virtual Classroom
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Class transcript</h1>
          <p className="text-sm text-slate-600">
            Opt-in Daily transcription for this session. Private to the host teacher.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            Refresh
          </button>
          <Link
            href={`/teacher/virtual-classroom/${encodeURIComponent(sessionId)}/recording`}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            Recording
          </Link>
          <Link
            href={`/teacher/virtual-classroom/${encodeURIComponent(sessionId)}`}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            Back to session
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {data ? (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-700">
              Live transcription:{" "}
              <span className="font-bold">
                {data.transcriptionEnabled ? "on" : "off"}
              </span>
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Latest status:{" "}
              <span className="font-bold">{data.latest?.status ?? "none"}</span>
              {data.latest?.errorMessage ? (
                <span className="text-red-600"> — {data.latest.errorMessage}</span>
              ) : null}
            </p>
            {data.signedUrl ? (
              <p className="mt-2 text-sm">
                <a
                  href={data.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-teal-800 underline"
                >
                  Download WebVTT
                </a>
              </p>
            ) : null}
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Transcript text</h2>
            {data.plainText ? (
              <pre className="mt-3 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-800">
                {data.plainText}
              </pre>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                No ready transcript yet. Start “Transcribe” in the video dock during the
                call, then stop when finished and refresh this page.
              </p>
            )}
          </section>

          {(data.transcripts?.length ?? 0) > 1 ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">History</h2>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {data.transcripts!.map((row) => (
                  <li key={row.id} className="flex justify-between gap-2">
                    <span>{row.status}</span>
                    <span className="text-slate-500">
                      {new Date(row.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
