"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type RecordingRow = {
  id: string;
  status: string;
  durationSeconds: number | null;
  sizeBytes: number | null;
  readyAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  contentType: string | null;
};

type Payload = {
  error?: string;
  recordingEnabled?: boolean;
  latest?: RecordingRow | null;
  recordings?: RecordingRow[];
  signedUrl?: string | null;
};

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TeacherRecordingReviewClient({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/virtual-classroom/${encodeURIComponent(sessionId)}/daily/recording`,
      );
      const payload = (await res.json()) as Payload;
      if (!res.ok) {
        setError(payload.error ?? "Could not load recording.");
        setData(null);
        return;
      }
      setData(payload);
    } catch {
      setError("Could not load recording.");
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
          <h1 className="text-2xl font-bold text-slate-900">Class recording</h1>
          <p className="text-sm text-slate-600">
            Opt-in Daily cloud recording for this session. Private to the host teacher.
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
            href={`/teacher/virtual-classroom/${encodeURIComponent(sessionId)}/transcript`}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            Transcript
          </Link>
          <Link
            href={`/teacher/virtual-classroom/${encodeURIComponent(sessionId)}`}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            Back to session
          </Link>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-600">Loading…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {data ? (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-700">
              Live recording:{" "}
              <span className="font-bold">
                {data.recordingEnabled ? "on" : "off"}
              </span>
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Latest status:{" "}
              <span className="font-bold">{data.latest?.status ?? "none"}</span>
              {data.latest?.errorMessage ? (
                <span className="text-red-600"> — {data.latest.errorMessage}</span>
              ) : null}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Duration {formatDuration(data.latest?.durationSeconds)} · Size{" "}
              {formatBytes(data.latest?.sizeBytes)}
            </p>
            {data.signedUrl ? (
              <p className="mt-2 text-sm">
                <a
                  href={data.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-teal-800 underline"
                >
                  Download video
                </a>
              </p>
            ) : null}
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Playback</h2>
            {data.signedUrl ? (
              <video
                key={data.signedUrl}
                controls
                className="mt-3 w-full rounded-lg bg-slate-900"
                src={data.signedUrl}
              >
                <track kind="captions" />
              </video>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                No ready recording yet. Start “Record” in the video dock during the call,
                then stop when finished and refresh this page.
              </p>
            )}
          </section>

          {(data.recordings?.length ?? 0) > 1 ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">History</h2>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {data.recordings!.map((row) => (
                  <li key={row.id} className="flex justify-between gap-2">
                    <span>
                      {row.status}
                      {row.durationSeconds != null
                        ? ` · ${formatDuration(row.durationSeconds)}`
                        : ""}
                    </span>
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
