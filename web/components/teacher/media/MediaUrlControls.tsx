"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  searchTeacherMedia,
  uploadTeacherMedia,
  type MediaAssetRow,
  type MediaKind,
} from "@/lib/actions/media";
import { MEDIA_PICKER_PAGE_SIZE } from "@/components/teacher/media/mediaPickerConstants";
import { computeClientImageHashes } from "@/components/teacher/media/client-image-hash";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  /** Image (default) or video uploads + library */
  mediaKind?: MediaKind;
  /** Shorter preview height in compact forms */
  compact?: boolean;
  /** Hide inline image preview while keeping upload/library/url controls */
  hidePreview?: boolean;
  /** Hide direct URL input field; caller can provide custom URL UI */
  hideUrlInput?: boolean;
  /** Optional extra controls rendered next to Upload/Media library buttons */
  extraButtons?: ReactNode;
};

type SharedLibraryState = {
  open: boolean;
  ownerId: string | null;
  kind: MediaKind;
  query: string;
  assets: MediaAssetRow[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  err: string | null;
  onSelect: ((url: string) => void) | null;
};

const SHARED_LIBRARY_DEBOUNCE_MS = 350;
const SHARED_LIBRARY_CACHE_TTL_MS = 3 * 60 * 1000;
const SHARED_LIBRARY_RECENT_LIMIT = 10;
const sharedLibraryListeners = new Set<() => void>();
const sharedLibraryFirstPageCache = new Map<string, { at: number; rows: MediaAssetRow[]; total: number }>();
const sharedLibraryRecentByKind = new Map<MediaKind, MediaAssetRow[]>();
const sharedLibraryLastQueryByKind = new Map<MediaKind, string>();
let sharedSearchTimer: ReturnType<typeof setTimeout> | null = null;
let sharedRequestSeq = 0;
let sharedLibraryState: SharedLibraryState = {
  open: false,
  ownerId: null,
  kind: "image",
  query: "",
  assets: [],
  total: 0,
  loading: false,
  loadingMore: false,
  err: null,
  onSelect: null,
};

function emitSharedLibrary() {
  for (const listener of sharedLibraryListeners) listener();
}

function subscribeSharedLibrary(listener: () => void) {
  sharedLibraryListeners.add(listener);
  return () => {
    sharedLibraryListeners.delete(listener);
  };
}

function sharedLibrarySnapshot() {
  return sharedLibraryState;
}

function setSharedLibraryState(next: Partial<SharedLibraryState>) {
  sharedLibraryState = { ...sharedLibraryState, ...next };
  emitSharedLibrary();
}

function sharedLibraryCacheKey(kind: MediaKind, query: string) {
  return `${kind}::${query.trim().toLowerCase()}`;
}

async function runSharedLibrarySearch(opts: { reset: boolean; debounced: boolean }) {
  const { reset, debounced } = opts;
  if (!sharedLibraryState.open) return;
  if (sharedSearchTimer) {
    clearTimeout(sharedSearchTimer);
    sharedSearchTimer = null;
  }
  const kickoff = async () => {
    if (!sharedLibraryState.open) return;
    const q = sharedLibraryState.query.trim();
    const kind = sharedLibraryState.kind;
    const cacheKey = sharedLibraryCacheKey(kind, q);
    const offset = reset ? 0 : sharedLibraryState.assets.length;
    if (reset) {
      const cached = sharedLibraryFirstPageCache.get(cacheKey);
      if (cached && Date.now() - cached.at < SHARED_LIBRARY_CACHE_TTL_MS) {
        setSharedLibraryState({
          assets: cached.rows,
          total: cached.total,
          err: null,
          loading: false,
        });
        return;
      }
    }
    const requestId = ++sharedRequestSeq;
    setSharedLibraryState({
      err: null,
      loading: reset,
      loadingMore: !reset,
    });
    try {
      const { rows, total } = await searchTeacherMedia({
        kind,
        q,
        limit: MEDIA_PICKER_PAGE_SIZE,
        offset,
      });
      if (requestId !== sharedRequestSeq) return;
      if (reset) {
        sharedLibraryFirstPageCache.set(cacheKey, { at: Date.now(), rows, total });
      }
      const nextRows = reset ? rows : [...sharedLibraryState.assets, ...rows];
      setSharedLibraryState({
        assets: nextRows,
        total,
        loading: false,
        loadingMore: false,
        err: null,
      });
    } catch (e: unknown) {
      if (requestId !== sharedRequestSeq) return;
      setSharedLibraryState({
        loading: false,
        loadingMore: false,
        err: e instanceof Error ? e.message : "Failed to load library",
      });
    }
  };
  if (debounced) {
    sharedSearchTimer = setTimeout(() => {
      void kickoff();
    }, SHARED_LIBRARY_DEBOUNCE_MS);
  } else {
    void kickoff();
  }
}

function openSharedLibrary(ownerId: string, kind: MediaKind, onSelect: (url: string) => void) {
  const rememberedQuery = sharedLibraryLastQueryByKind.get(kind) ?? "";
  setSharedLibraryState({
    open: true,
    ownerId,
    kind,
    query: rememberedQuery,
    assets: [],
    total: 0,
    loading: false,
    loadingMore: false,
    err: null,
    onSelect,
  });
  void runSharedLibrarySearch({ reset: true, debounced: false });
}

function closeSharedLibrary() {
  sharedRequestSeq += 1;
  if (sharedSearchTimer) {
    clearTimeout(sharedSearchTimer);
    sharedSearchTimer = null;
  }
  setSharedLibraryState({
    open: false,
    ownerId: null,
    loading: false,
    loadingMore: false,
    err: null,
    onSelect: null,
  });
}

function setSharedLibraryQuery(query: string) {
  sharedLibraryLastQueryByKind.set(sharedLibraryState.kind, query);
  setSharedLibraryState({ query });
  void runSharedLibrarySearch({ reset: true, debounced: true });
}

function loadMoreSharedLibrary() {
  if (
    !sharedLibraryState.open ||
    sharedLibraryState.loading ||
    sharedLibraryState.loadingMore ||
    sharedLibraryState.assets.length >= sharedLibraryState.total
  ) {
    return;
  }
  void runSharedLibrarySearch({ reset: false, debounced: false });
}

function selectSharedLibraryAsset(url: string) {
  const hit =
    sharedLibraryState.assets.find((a) => a.public_url === url) ??
    sharedLibraryRecentByKind
      .get(sharedLibraryState.kind)
      ?.find((a) => a.public_url === url) ??
    null;
  if (hit) {
    const prev = sharedLibraryRecentByKind.get(sharedLibraryState.kind) ?? [];
    const next = [hit, ...prev.filter((a) => a.public_url !== hit.public_url)].slice(
      0,
      SHARED_LIBRARY_RECENT_LIMIT,
    );
    sharedLibraryRecentByKind.set(sharedLibraryState.kind, next);
  }
  sharedLibraryState.onSelect?.(url);
  closeSharedLibrary();
}

function useSharedLibrary() {
  return useSyncExternalStore(subscribeSharedLibrary, sharedLibrarySnapshot, sharedLibrarySnapshot);
}

export function MediaUrlControls({
  label,
  value,
  onChange,
  disabled,
  mediaKind = "image",
  compact,
  hidePreview,
  hideUrlInput,
  extraButtons,
}: Props) {
  const inputId = useId();
  const ownerId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const librarySearchRef = useRef<HTMLInputElement>(null);
  const sharedLibrary = useSharedLibrary();
  const ownsSharedLibrary = sharedLibrary.open && sharedLibrary.ownerId === ownerId;
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ownsSharedLibrary) return;
    const raf = window.requestAnimationFrame(() => {
      librarySearchRef.current?.focus();
      librarySearchRef.current?.select();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [ownsSharedLibrary]);

  useEffect(() => {
    if (!ownsSharedLibrary) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSharedLibrary();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ownsSharedLibrary]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", f);
      if (mediaKind === "image") {
        const hashes = await computeClientImageHashes(f);
        if (hashes?.sha256Hex) {
          fd.set("client_sha256", hashes.sha256Hex);
        }
        if (hashes?.dHashHex) {
          fd.set("client_dhash", hashes.dHashHex);
        }
        // Inline field upload should avoid expensive near-duplicate scans.
        fd.set("skip_near_duplicate", "1");
      }
      const r = await uploadTeacherMedia(fd, mediaKind);
      onChange(r.url);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const previewH = compact ? "h-28" : "h-40";
  const fileAccept =
    mediaKind === "video" ? "video/mp4,video/webm,video/ogg,video/quicktime" : (
      "image/jpeg,image/png,image/webp,image/gif"
    );
  const urlPlaceholder =
    mediaKind === "video" ? "Or paste video URL" : "Or paste image URL";
  const emptyLibraryHint =
    mediaKind === "video" ?
      "No uploads yet. Use Upload on any video field to add files."
    : "No uploads yet. Use Upload on any image field to add files.";
  const recentAssets = sharedLibraryRecentByKind.get(sharedLibrary.kind) ?? [];

  return (
    <div className="space-y-2">
      <span className={compact ? "text-xs font-medium text-neutral-800" : "mt-2 block text-sm font-medium text-neutral-800"}>
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={fileAccept}
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
          onClick={() =>
            openSharedLibrary(ownerId, mediaKind, (url) => {
              onChange(url);
            })
          }
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
            {mediaKind === "video" ? "Video URL" : "Image URL"}
          </label>
          <input
            id={inputId}
            type="url"
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            placeholder={urlPlaceholder}
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
          {mediaKind === "video" ? (
            <video src={value} className="h-full w-full object-contain" controls muted playsInline />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element -- arbitrary teacher URLs may not be optimizable */
            <img src={value} alt="" className="h-full w-full object-contain" />
          )}
        </div>
      ) : null}

      {ownsSharedLibrary && typeof document !== "undefined" ?
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Media library"
            onClick={() => closeSharedLibrary()}
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
                  onClick={() => closeSharedLibrary()}
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
                    value={sharedLibrary.query}
                    onChange={(e) => setSharedLibraryQuery(e.target.value)}
                    placeholder="Search by name, filename, tag, or URL"
                    className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                  />
                </label>
                {recentAssets.length > 0 ? (
                  <div className="mb-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Recent picks
                    </p>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                      {recentAssets.map((a) => (
                        <button
                          key={`recent-${a.id}`}
                          type="button"
                          className="rounded border border-neutral-200 bg-white p-1.5 hover:border-sky-500 hover:ring-1 hover:ring-sky-500 active:bg-sky-50"
                          onClick={() => selectSharedLibraryAsset(a.public_url)}
                          title={a.original_filename}
                        >
                          <div className="relative aspect-square w-full overflow-hidden rounded bg-neutral-100">
                            {sharedLibrary.kind === "video" ? (
                              <video
                                src={a.public_url}
                                className="h-full w-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <Image
                                src={a.public_url}
                                alt=""
                                fill
                                sizes="64px"
                                className="object-cover"
                                loading="lazy"
                                unoptimized={a.public_url.includes("supabase.co")}
                              />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {sharedLibrary.loading ? (
                  <p className="text-sm text-neutral-600">Loading…</p>
                ) : sharedLibrary.err ? (
                  <p className="text-sm text-red-700">{sharedLibrary.err}</p>
                ) : sharedLibrary.assets.length === 0 ? (
                  <p className="text-sm text-neutral-600">
                    {sharedLibrary.total === 0 && !sharedLibrary.query.trim() ?
                      emptyLibraryHint
                    : "No media matched your search."}
                  </p>
                ) : (
                  <>
                    <p className="mb-2 text-xs text-neutral-500">
                      Showing {sharedLibrary.assets.length} of {sharedLibrary.total}
                    </p>
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {sharedLibrary.assets.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            className="w-full rounded border border-neutral-200 bg-white p-2 text-left hover:border-sky-500 hover:ring-1 hover:ring-sky-500 active:border-sky-600 active:bg-sky-50"
                            onClick={() => selectSharedLibraryAsset(a.public_url)}
                          >
                            <div className="relative aspect-square w-full overflow-hidden rounded bg-neutral-100">
                              {sharedLibrary.kind === "video" ? (
                                <video
                                  src={a.public_url}
                                  className="h-full w-full object-cover"
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                              ) : (
                                <Image
                                  src={a.public_url}
                                  alt=""
                                  fill
                                  sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, 150px"
                                  className="object-cover"
                                  loading="lazy"
                                  unoptimized={a.public_url.includes("supabase.co")}
                                />
                              )}
                            </div>
                            <p className="mt-1 truncate text-xs text-neutral-700" title={a.original_filename}>
                              {a.original_filename}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {sharedLibrary.assets.length < sharedLibrary.total ? (
                      <div className="mt-4 flex justify-center">
                        <button
                          type="button"
                          disabled={sharedLibrary.loadingMore}
                          onClick={() => loadMoreSharedLibrary()}
                          className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-50"
                        >
                          {sharedLibrary.loadingMore ? "Loading…" : "Load more"}
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
