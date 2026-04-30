"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  listTeacherMedia,
  uploadTeacherMedia,
  type MediaAssetRow,
} from "@/lib/actions/media";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  /** Shorter preview height in compact forms */
  compact?: boolean;
  /** Hide inline image preview while keeping upload/library/url controls */
  hidePreview?: boolean;
  /** Hide direct URL input field; caller can provide custom URL UI */
  hideUrlInput?: boolean;
  /** Optional extra controls rendered next to Upload/Media library buttons */
  extraButtons?: ReactNode;
};

export function MediaUrlControls({
  label,
  value,
  onChange,
  disabled,
  compact,
  hidePreview,
  hideUrlInput,
  extraButtons,
}: Props) {
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

  useEffect(() => {
    if (!libraryOpen) return;
    let cancelled = false;
    setLibLoading(true);
    setLibErr(null);
    listTeacherMedia()
      .then((rows) => {
        if (!cancelled) setAssets(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLibErr(e instanceof Error ? e.message : "Failed to load library");
        }
      })
      .finally(() => {
        if (!cancelled) setLibLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [libraryOpen]);

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
      const r = await uploadTeacherMedia(fd);
      onChange(r.url);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const previewH = compact ? "h-28" : "h-40";
  const normalizedQuery = libraryQuery.trim().toLowerCase();
  const filteredAssets =
    normalizedQuery ?
      assets.filter((asset) =>
        [asset.meta_item_name ?? "", asset.original_filename, asset.public_url, ...(asset.meta_tags ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : assets;

  return (
    <div className="space-y-2">
      <span className={compact ? "text-xs font-medium text-neutral-800" : "mt-2 block text-sm font-medium text-neutral-800"}>
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
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
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setLibraryOpen(true)}
          className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50 active:bg-neutral-200 disabled:opacity-50"
        >
          Media library
        </button>
        {extraButtons}
      </div>
      {uploadErr ? (
        <p className="text-sm text-red-700">{uploadErr}</p>
      ) : null}
      {!hideUrlInput ? (
        <>
          <label htmlFor={inputId} className="sr-only">
            Image URL
          </label>
          <input
            id={inputId}
            type="url"
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            placeholder="Or paste image URL"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        </>
      ) : null}
      {value && !hidePreview ? (
        <div
          className={`relative mt-2 w-full max-w-md overflow-hidden rounded border border-neutral-300 bg-neutral-100 ${previewH}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary teacher URLs may not be optimizable */}
          <img src={value} alt="" className="h-full w-full object-contain" />
        </div>
      ) : null}

      {libraryOpen && typeof document !== "undefined" ?
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Media library"
            onClick={() => setLibraryOpen(false)}
          >
            <div
              className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="font-semibold">Shared media library</h3>
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
                  <p className="text-sm text-neutral-600">Loading…</p>
                ) : libErr ? (
                  <p className="text-sm text-red-700">{libErr}</p>
                ) : assets.length === 0 ? (
                  <p className="text-sm text-neutral-600">
                    No uploads yet. Use Upload on any image field to add files.
                  </p>
                ) : filteredAssets.length === 0 ? (
                  <p className="text-sm text-neutral-600">No media matched your search.</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {filteredAssets.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          className="w-full rounded border border-neutral-200 bg-white p-2 text-left hover:border-sky-500 hover:ring-1 hover:ring-sky-500 active:border-sky-600 active:bg-sky-50"
                          onClick={() => {
                            onChange(a.public_url);
                            setLibraryOpen(false);
                          }}
                        >
                          <div className="relative aspect-square w-full overflow-hidden rounded bg-neutral-100">
                            <Image
                              src={a.public_url}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized={a.public_url.includes("supabase.co")}
                            />
                          </div>
                          <p className="mt-1 truncate text-xs text-neutral-700" title={a.original_filename}>
                            {a.original_filename}
                          </p>
                        </button>
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
