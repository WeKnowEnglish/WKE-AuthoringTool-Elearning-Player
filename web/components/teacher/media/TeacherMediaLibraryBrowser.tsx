"use client";

import Image from "next/image";
import { useEffect, useRef, useSyncExternalStore } from "react";
import type { MediaAssetRow, MediaKind } from "@/lib/actions/media";
import {
  assetDisplayKind,
  backToTeacherMediaLibraryHome,
  folderLabel,
  getTeacherMediaLibraryRecent,
  loadMoreTeacherMediaLibrary,
  openTeacherMediaFolder,
  selectTeacherMediaLibraryAsset,
  setTeacherMediaFolderQuery,
  setTeacherMediaLibraryHomeQuery,
  subscribeTeacherMediaLibrary,
  teacherMediaLibrarySnapshot,
  type TeacherMediaFolderPreview,
} from "@/components/teacher/media/teacherMediaLibraryShared";

type Props = {
  ownerId: string;
  /** Compact styling for narrow right rails. */
  compact?: boolean;
  className?: string;
};

function useTeacherMediaLibrary() {
  return useSyncExternalStore(
    subscribeTeacherMediaLibrary,
    teacherMediaLibrarySnapshot,
    teacherMediaLibrarySnapshot,
  );
}

function Thumb({
  kind,
  url,
  alt,
  className = "object-cover",
}: {
  kind: MediaKind;
  url: string;
  alt: string;
  className?: string;
}) {
  if (kind === "video") {
    return (
      <video
        src={url}
        className={`h-full w-full ${className}`}
        muted
        playsInline
        preload="metadata"
      />
    );
  }
  if (kind === "audio") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-neutral-100 px-1 text-neutral-600">
        <span className="text-lg" aria-hidden>
          ♪
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide">Audio</span>
      </div>
    );
  }
  if (kind === "document") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-red-50 px-1 text-red-800">
        <span className="text-2xl font-black" aria-hidden>
          PDF
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide">Document</span>
      </div>
    );
  }
  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes="120px"
      className={className}
      loading="lazy"
      unoptimized={url.includes("supabase.co")}
    />
  );
}

function AssetTile({
  asset,
  fieldKind,
  dense,
}: {
  asset: MediaAssetRow;
  fieldKind: MediaKind;
  dense?: boolean;
}) {
  const kind = assetDisplayKind(asset.content_type, fieldKind);
  const title = asset.meta_item_name || asset.original_filename;
  return (
    <button
      type="button"
      className={`w-full rounded-lg border border-neutral-200 bg-white text-left transition hover:border-sky-500 hover:ring-1 hover:ring-sky-500 active:bg-sky-50 ${
        dense ? "p-1.5" : "p-2"
      }`}
      onClick={() => selectTeacherMediaLibraryAsset(asset.public_url, asset)}
      title={title}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-neutral-100">
        <Thumb kind={kind} url={asset.public_url} alt={title} />
      </div>
      <p className="mt-1 truncate text-xs text-neutral-700">{title}</p>
    </button>
  );
}

function FolderRow({
  folder,
  fieldKind,
  compact,
}: {
  folder: TeacherMediaFolderPreview;
  fieldKind: MediaKind;
  compact?: boolean;
}) {
  const tileW = compact ? "w-[72px]" : "w-[88px] sm:w-[100px]";
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="group flex min-w-0 items-center gap-2 text-left"
          onClick={() => openTeacherMediaFolder(folder.id)}
        >
          <h3 className="truncate text-sm font-bold text-neutral-900 group-hover:text-sky-800">
            {folder.label}
          </h3>
          <span className="shrink-0 text-xs text-neutral-500">
            {folder.loading ? "…" : folder.total > 0 ? folder.total : ""}
          </span>
        </button>
        <button
          type="button"
          className="shrink-0 text-xs font-semibold text-sky-800 underline hover:text-sky-950"
          onClick={() => openTeacherMediaFolder(folder.id)}
        >
          See all
        </button>
      </div>

      {folder.err ? (
        <p className="text-sm text-red-700">{folder.err}</p>
      ) : folder.loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : folder.assets.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing here yet.</p>
      ) : (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {folder.assets.map((asset) => (
            <div key={asset.id} className={`${tileW} shrink-0`}>
              <AssetTile asset={asset} fieldKind={fieldKind} dense />
            </div>
          ))}
          {folder.total > folder.assets.length ? (
            <button
              type="button"
              onClick={() => openTeacherMediaFolder(folder.id)}
              className={`flex ${tileW} shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-xs font-semibold text-neutral-600 hover:border-sky-400 hover:bg-sky-50`}
            >
              +{folder.total - folder.assets.length}
              <span className="mt-0.5 font-normal">more</span>
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

/**
 * Canva-style browse UI (home rows + 3-col drill-in).
 * Renders only when the shared library is open for `ownerId`.
 * Used inside the modal portal and the Explore Hotspots Library tab.
 */
export function TeacherMediaLibraryBrowser({ ownerId, compact, className }: Props) {
  const library = useTeacherMediaLibrary();
  const owns = library.open && library.ownerId === ownerId;
  const homeSearchRef = useRef<HTMLInputElement>(null);
  const folderSearchRef = useRef<HTMLInputElement>(null);
  const recent = getTeacherMediaLibraryRecent(library.fieldKind);

  useEffect(() => {
    if (!owns) return;
    const raf = window.requestAnimationFrame(() => {
      if (library.view === "home") homeSearchRef.current?.focus();
      else folderSearchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [owns, library.view]);

  if (!owns) return null;

  return (
    <div className={className ?? "min-h-0 flex-1 overflow-y-auto p-3 sm:p-4"}>
      {library.view === "home" ? (
        <div className={compact ? "space-y-4" : "space-y-6"}>
          <label className="block text-sm">
            Search all assets
            <input
              ref={homeSearchRef}
              type="text"
              value={library.homeQuery}
              onChange={(e) => setTeacherMediaLibraryHomeQuery(e.target.value)}
              placeholder={
                library.fieldKind === "document"
                  ? "Search PDF filenames…"
                  : "Search images, characters, scenes, audio…"
              }
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>

          {recent.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-neutral-900">Recent picks</h3>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {recent.map((asset) => (
                  <div key={`recent-${asset.id}`} className="w-[72px] shrink-0">
                    <AssetTile asset={asset} fieldKind={library.fieldKind} dense />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {library.homeLoading && library.folders.every((f) => f.loading) ? (
            <p className="text-sm text-neutral-500">Loading folders…</p>
          ) : (
            library.folders.map((folder) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                fieldKind={library.fieldKind}
                compact={compact}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded px-2 py-1 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
              onClick={() => backToTeacherMediaLibraryHome()}
            >
              ← Back
            </button>
            <h3 className="truncate text-sm font-bold text-neutral-900">
              {folderLabel(library.folderId)}
            </h3>
          </div>
          <label className="block text-sm">
            Search in {folderLabel(library.folderId).toLowerCase()}
            <input
              ref={folderSearchRef}
              type="text"
              value={library.folderQuery}
              onChange={(e) => setTeacherMediaFolderQuery(e.target.value)}
              placeholder="Name, filename, tag…"
              className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>

          {library.loading ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : library.err ? (
            <p className="text-sm text-red-700">{library.err}</p>
          ) : library.assets.length === 0 ? (
            <p className="text-sm text-neutral-500">No media matched.</p>
          ) : (
            <>
              <p className="text-xs text-neutral-500">
                Showing {library.assets.length} of {library.total}
              </p>
              <ul className="grid grid-cols-3 gap-2 sm:gap-3">
                {library.assets.map((asset) => (
                  <li key={asset.id}>
                    <AssetTile asset={asset} fieldKind={library.fieldKind} />
                  </li>
                ))}
              </ul>
              {library.assets.length < library.total ? (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    disabled={library.loadingMore}
                    onClick={() => loadMoreTeacherMediaLibrary()}
                    className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {library.loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
