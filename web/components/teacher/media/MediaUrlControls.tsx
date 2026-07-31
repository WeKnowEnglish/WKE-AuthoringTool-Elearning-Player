"use client";

import type { ReactNode } from "react";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import {
  uploadTeacherMedia,
  type MediaKind,
} from "@/lib/actions/media";
import { computeClientImageHashes } from "@/components/teacher/media/client-image-hash";
import { TeacherMediaLibraryModal } from "@/components/teacher/media/TeacherMediaLibraryModal";
import {
  openTeacherMediaLibrary,
  subscribeTeacherMediaLibrary,
  teacherMediaLibrarySnapshot,
  type MediaUrlChangeDetail,
} from "@/components/teacher/media/teacherMediaLibraryShared";

export type { MediaUrlChangeDetail };

type Props = {
  label: string;
  value: string;
  onChange: (url: string, detail?: MediaUrlChangeDetail) => void;
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
  /** Prefill media-library search when opening the picker (e.g. current word). */
  libraryQueryHint?: string;
  /** Soft-label new uploads with this item name in the media library. */
  uploadItemName?: string;
  /** When set, media library can filter to assets linked to this dictionary id. */
  lexiconId?: string;
};

function useTeacherMediaLibrary() {
  return useSyncExternalStore(
    subscribeTeacherMediaLibrary,
    teacherMediaLibrarySnapshot,
    teacherMediaLibrarySnapshot,
  );
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
  libraryQueryHint,
  uploadItemName,
  lexiconId,
}: Props) {
  const inputId = useId();
  const ownerId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const sharedLibrary = useTeacherMediaLibrary();
  const ownsSharedLibrary = sharedLibrary.open && sharedLibrary.ownerId === ownerId;
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", f);
      if (uploadItemName?.trim()) {
        fd.set("meta_item_name", uploadItemName.trim());
      }
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
      onChange(r.url, { mediaAssetId: r.id });
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

  return (
    <div className="space-y-2">
      <span
        className={
          compact ?
            "text-xs font-medium text-neutral-800"
          : "mt-2 block text-sm font-medium text-neutral-800"
        }
      >
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
            openTeacherMediaLibrary(
              ownerId,
              mediaKind,
              (url, detail) => {
                onChange(url, detail);
              },
              libraryQueryHint,
              lexiconId,
            )
          }
          className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50 active:bg-neutral-200 disabled:opacity-50"
        >
          Media library
        </button>
        {extraButtons}
      </div>
      {uploadErr ? <p className="text-sm text-red-700">{uploadErr}</p> : null}
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

      {ownsSharedLibrary ? <TeacherMediaLibraryModal ownerId={ownerId} /> : null}
    </div>
  );
}
