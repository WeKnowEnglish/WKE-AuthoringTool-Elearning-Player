"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MEDIA_PICKER_PAGE_SIZE } from "@/components/teacher/media/mediaPickerConstants";
import { normalizeAudioClipUrl } from "@/lib/activity-builder/audio-clip";
import { searchTeacherMedia, uploadTeacherMedia, type MediaAssetRow } from "@/lib/actions/media";
import { createAudioMediaRecorder, recordedAudioFile } from "@/lib/media/recorded-audio";

export type AudioClipChangeDetail = {
  mediaAssetId?: string;
};

export type AudioClipControlsProps = {
  label: string;
  /** Stable https URL (or empty). Data URLs are discouraged for saved tracks. */
  value: string;
  onChange: (url: string, detail?: AudioClipChangeDetail) => void;
  disabled?: boolean;
  /** Extra hint under the label. */
  hint?: string;
  /** Hide the shared media library picker (record + upload + paste still work). */
  hideLibrary?: boolean;
  /**
   * When set, Library opens this instead of the built-in audio portal
   * (e.g. Explore Hotspots docked Library tab).
   */
  onOpenLibrary?: () => void;
  className?: string;
};

export { normalizeAudioClipUrl } from "@/lib/activity-builder/audio-clip";

/**
 * Shared Activity Builder / LTC audio clip control.
 * Record → upload to teacher media, or upload file / library / paste URL.
 * Always prefers a stable public URL (not an in-memory blob).
 */
export function AudioClipControls({
  label,
  value,
  onChange,
  disabled = false,
  hint,
  hideLibrary = false,
  onOpenLibrary,
  className,
}: AudioClipControlsProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const librarySearchRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAssetRow[]>([]);
  const [libTotal, setLibTotal] = useState(0);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libLoading, setLibLoading] = useState(false);
  const [libLoadingMore, setLibLoadingMore] = useState(false);
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

  const clip = normalizeAudioClipUrl(value);

  useEffect(() => {
    if (!libraryOpen || hideLibrary) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setLibLoading(true);
      setLibErr(null);
      searchTeacherMedia({
        kind: "audio",
        q: libraryQuery.trim(),
        limit: MEDIA_PICKER_PAGE_SIZE,
        offset: 0,
      })
        .then(({ rows, total }) => {
          if (!cancelled) {
            setAssets(rows);
            setLibTotal(total);
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setLibErr(error instanceof Error ? error.message : "Failed to load library");
          }
        })
        .finally(() => {
          if (!cancelled) setLibLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [libraryOpen, libraryQuery, hideLibrary]);

  const loadMoreLibrary = useCallback(async () => {
    if (libLoadingMore || libLoading || assets.length >= libTotal) return;
    setLibLoadingMore(true);
    setLibErr(null);
    try {
      const { rows, total } = await searchTeacherMedia({
        kind: "audio",
        q: libraryQuery.trim(),
        limit: MEDIA_PICKER_PAGE_SIZE,
        offset: assets.length,
      });
      setLibTotal(total);
      setAssets((prev) => [...prev, ...rows]);
    } catch (error: unknown) {
      setLibErr(error instanceof Error ? error.message : "Failed to load more");
    } finally {
      setLibLoadingMore(false);
    }
  }, [libLoadingMore, libLoading, assets.length, libTotal, libraryQuery]);

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      if (recordStreamRef.current) {
        for (const track of recordStreamRef.current.getTracks()) track.stop();
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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLibraryOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [libraryOpen]);

  async function uploadAudioFile(file: File) {
    setUploadErr(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const result = await uploadTeacherMedia(form, "audio");
      onChange(result.url, { mediaAssetId: result.id });
    } catch (error) {
      setUploadErr(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await uploadAudioFile(file);
  }

  async function startRecordingNow() {
    if (recording || disabled || uploading) return;
    setUploadErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = createAudioMediaRecorder(stream);
      recordStreamRef.current = stream;
      recorderRef.current = recorder;
      recordChunksRef.current = [];
      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data.size > 0) recordChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const parts = recordChunksRef.current;
        recordChunksRef.current = [];
        if (recordStreamRef.current) {
          for (const track of recordStreamRef.current.getTracks()) track.stop();
          recordStreamRef.current = null;
        }
        if (!parts.length) return;
        const file = recordedAudioFile(
          parts,
          recorder.mimeType,
          `ltc-clip-${new Date().toISOString().replace(/[:.]/g, "-")}`,
        );
        void uploadAudioFile(file);
      };
      recorder.start();
      setRecording(true);
    } catch (error) {
      setUploadErr(error instanceof Error ? error.message : "Could not start recording");
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
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  const busy = disabled || uploading;

  return (
    <div className={className ?? "space-y-2"}>
      <div>
        <p className="text-[11px] font-medium ltc-muted">{label}</p>
        {hint ? <p className="mt-0.5 text-[11px] leading-snug ltc-subtle">{hint}</p> : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <input
          ref={fileRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/webm,audio/mp4,audio/x-m4a,audio/aac"
          className="hidden"
          disabled={busy}
          onChange={(event) => void onFileChange(event)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="rounded border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
        {!hideLibrary ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (onOpenLibrary) onOpenLibrary();
              else setLibraryOpen(true);
            }}
            className="rounded border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
          >
            Library
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => (recording ? stopRecording() : startRecordingWithCountdown())}
          className={`rounded border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50 ${
            recording
              ? "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
              : "border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
          }`}
        >
          {recording
            ? "Stop"
            : recordCountdown != null
              ? `In ${recordCountdown}…`
              : "Record"}
        </button>
        {clip ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setUploadErr(null);
              onChange("");
            }}
            className="rounded border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Clear
          </button>
        ) : null}
      </div>

      {recordCountdown != null ? (
        <p className="text-[11px] font-semibold text-amber-800">
          Recording starts in {recordCountdown}…
        </p>
      ) : null}
      {uploadErr ? <p className="text-[11px] text-rose-700">{uploadErr}</p> : null}

      <label htmlFor={inputId} className="block text-[11px] ltc-muted">
        Or paste audio URL
        <input
          id={inputId}
          type="url"
          className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
          placeholder="https://…"
          value={clip}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>

      {clip ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio className="mt-1 w-full max-w-md" controls preload="metadata" src={clip} />
      ) : null}

      {libraryOpen && !hideLibrary && !onOpenLibrary && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Audio library"
              onClick={() => setLibraryOpen(false)}
            >
              <div
                className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
                  <h3 className="text-sm font-semibold text-stone-900">Audio library</h3>
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-xs font-semibold text-stone-600 underline hover:bg-stone-100"
                    onClick={() => setLibraryOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <div className="max-h-[calc(85vh-3.5rem)] overflow-y-auto p-4">
                  <label className="mb-3 block text-xs text-stone-600">
                    Search library
                    <input
                      ref={librarySearchRef}
                      type="text"
                      value={libraryQuery}
                      onChange={(event) => setLibraryQuery(event.target.value)}
                      placeholder="Name, filename, tag, or URL"
                      className="mt-1 block w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  {libLoading ? (
                    <p className="text-sm text-stone-500">Loading…</p>
                  ) : libErr ? (
                    <p className="text-sm text-rose-700">{libErr}</p>
                  ) : assets.length === 0 ? (
                    <p className="text-sm text-stone-500">
                      {libTotal === 0 && !libraryQuery.trim()
                        ? "No audio uploads yet. Use Upload or Record."
                        : "No audio matched your search."}
                    </p>
                  ) : (
                    <>
                      <p className="mb-2 text-xs text-stone-500">
                        Showing {assets.length} of {libTotal}
                      </p>
                      <ul className="space-y-2">
                        {assets.map((asset) => (
                          <li key={asset.id} className="rounded border border-stone-200 p-2">
                            <button
                              type="button"
                              className="w-full text-left text-sm font-medium text-sky-900 underline underline-offset-2"
                              onClick={() => {
                                onChange(asset.public_url, { mediaAssetId: asset.id });
                                setLibraryOpen(false);
                              }}
                            >
                              {asset.original_filename}
                            </button>
                            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                            <audio
                              className="mt-2 w-full"
                              controls
                              preload="none"
                              src={asset.public_url}
                            />
                          </li>
                        ))}
                      </ul>
                      {assets.length < libTotal ? (
                        <div className="mt-4 flex justify-center">
                          <button
                            type="button"
                            disabled={libLoadingMore}
                            onClick={() => void loadMoreLibrary()}
                            className="rounded border border-stone-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50"
                          >
                            {libLoadingMore ? "Loading…" : "Load more"}
                          </button>
                        </div>
                      ) : null}
                    </>
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
