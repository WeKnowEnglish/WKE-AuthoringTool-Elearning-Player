"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { searchTeacherMedia, uploadTeacherMedia, type MediaAssetRow } from "@/lib/actions/media";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function AudioUrlControls({ label, value, onChange, disabled, compact }: Props) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const librarySearchRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAssetRow[]>([]);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libLoading, setLibLoading] = useState(false);
  const [libErr, setLibErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordCountdown, setRecordCountdown] = useState<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<BlobPart[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const countdownStartTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!libraryOpen) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setLibLoading(true);
      setLibErr(null);
      searchTeacherMedia({
        kind: "audio",
        q: libraryQuery.trim(),
        limit: 1000,
      })
        .then((rows) => {
          if (!cancelled) setAssets(rows);
        })
        .catch((e: unknown) => {
          if (!cancelled) setLibErr(e instanceof Error ? e.message : "Failed to load library");
        })
        .finally(() => {
          if (!cancelled) setLibLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [libraryOpen, libraryQuery]);

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      if (recordStreamRef.current) {
        for (const t of recordStreamRef.current.getTracks()) t.stop();
        recordStreamRef.current = null;
      }
      if (countdownIntervalRef.current != null) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (countdownStartTimeoutRef.current != null) {
        window.clearTimeout(countdownStartTimeoutRef.current);
        countdownStartTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!libraryOpen) return;
    setLibraryQuery("");
  }, [libraryOpen]);

  useEffect(() => {
    if (!libraryOpen) return;
    const raf = window.requestAnimationFrame(() => {
      librarySearchRef.current?.focus();
      librarySearchRef.current?.select();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [libraryOpen]);

  useEffect(() => {
    if (!libraryOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLibraryOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [libraryOpen]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", f);
      const r = await uploadTeacherMedia(fd, "audio");
      onChange(r.url);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function startRecordingNow() {
    if (recording || disabled || uploading) return;
    setUploadErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordStreamRef.current = stream;
      recorderRef.current = recorder;
      recordChunksRef.current = [];
      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data.size > 0) recordChunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        const parts = recordChunksRef.current;
        recordChunksRef.current = [];
        if (recordStreamRef.current) {
          for (const t of recordStreamRef.current.getTracks()) t.stop();
          recordStreamRef.current = null;
        }
        if (!parts.length) return;
        setUploading(true);
        try {
          const blob = new Blob(parts, { type: "audio/webm" });
          const file = new File(
            [blob],
            `recorded-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`,
            { type: "audio/webm" },
          );
          const fd = new FormData();
          fd.set("file", file);
          const r = await uploadTeacherMedia(fd, "audio");
          onChange(r.url);
        } catch (err) {
          setUploadErr(err instanceof Error ? err.message : "Recording upload failed");
        } finally {
          setUploading(false);
        }
      };
      recorder.start();
      setRecording(true);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Could not start recording");
    }
  }

  function startRecordingWithCountdown() {
    if (recording || recordCountdown != null || disabled || uploading) return;
    setUploadErr(null);
    setRecordCountdown(3);
    countdownIntervalRef.current = window.setInterval(() => {
      setRecordCountdown((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          if (countdownIntervalRef.current != null) {
            window.clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    countdownStartTimeoutRef.current = window.setTimeout(() => {
      countdownStartTimeoutRef.current = null;
      void startRecordingNow();
    }, 3000);
  }

  function stopRecording() {
    if (!recording) return;
    setRecording(false);
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  return (
    <div className="space-y-2">
      <span className={compact ? "text-xs font-medium text-neutral-800" : "mt-2 block text-sm font-medium text-neutral-800"}>
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/webm,audio/mp4,audio/x-m4a,audio/aac"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => void onFileChange(e)}
        />
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
          className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50 active:bg-neutral-200 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setLibraryOpen(true)}
          className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50 active:bg-neutral-200 disabled:opacity-50"
        >
          Media library
        </button>
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() =>
            recording ? stopRecording() : startRecordingWithCountdown()
          }
          className={`rounded border px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${
            recording ?
              "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200"
            : "border-neutral-300 bg-white hover:bg-neutral-50 active:bg-neutral-200"
          }`}
        >
          {recording ?
            "Stop recording"
          : recordCountdown != null ?
            `Starting in ${recordCountdown}...`
          : "Record"}
        </button>
      </div>
      {recordCountdown != null ? (
        <p className="text-xs font-semibold text-amber-700">
          Recording starts in {recordCountdown} second{recordCountdown === 1 ? "" : "s"}...
        </p>
      ) : null}
      {uploadErr ? <p className="text-sm text-red-700">{uploadErr}</p> : null}
      <label htmlFor={inputId} className="sr-only">
        Audio URL
      </label>
      <input
        id={inputId}
        type="url"
        className="mt-1 w-full rounded border px-2 py-1 text-sm"
        placeholder="Or paste audio URL"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <audio className="mt-2 w-full max-w-md" controls preload="metadata" src={value}>
          Your browser does not support audio playback.
        </audio>
      ) : null}

      {libraryOpen && typeof document !== "undefined" ?
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Audio library"
            onClick={() => setLibraryOpen(false)}
          >
            <div
              className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="font-semibold">Shared audio library</h3>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-sm font-semibold text-neutral-600 underline hover:bg-neutral-100 active:bg-neutral-200"
                  onClick={() => setLibraryOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="max-h-[calc(85vh-3.5rem)] overflow-y-auto p-4">
                <label className="mb-3 block text-sm">
                  Search library
                  <input
                    ref={librarySearchRef}
                    type="text"
                    value={libraryQuery}
                    onChange={(e) => setLibraryQuery(e.target.value)}
                    placeholder="Search by name, filename, tag, or URL"
                    className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                  />
                </label>
                {libLoading ? (
                  <p className="text-sm text-neutral-600">Loading...</p>
                ) : libErr ? (
                  <p className="text-sm text-red-700">{libErr}</p>
                ) : assets.length === 0 ? (
                  <p className="text-sm text-neutral-600">No audio uploads yet. Use Upload to add audio files.</p>
                ) : assets.length === 0 ? (
                  <p className="text-sm text-neutral-600">No audio matched your search.</p>
                ) : (
                  <ul className="space-y-2">
                    {assets.map((a) => (
                      <li key={a.id} className="rounded border border-neutral-200 p-2">
                        <button
                          type="button"
                          className="w-full text-left text-sm font-medium text-sky-900 underline underline-offset-2"
                          onClick={() => {
                            onChange(a.public_url);
                            setLibraryOpen(false);
                          }}
                        >
                          {a.original_filename}
                        </button>
                        <audio className="mt-2 w-full" controls preload="metadata" src={a.public_url}>
                          Your browser does not support audio playback.
                        </audio>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null}
    </div>
  );
}
