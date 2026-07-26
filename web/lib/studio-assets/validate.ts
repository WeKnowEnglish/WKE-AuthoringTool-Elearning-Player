import type { StudioAssetKind } from "@/lib/studio-assets/types";

export const STUDIO_MEDIA_BUCKET = "studio_media";
/** Keep in sync with migration 069_studio_assets.sql */
export const STUDIO_ASSET_MAX_BYTES = 20 * 1024 * 1024;

export const STUDIO_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const STUDIO_AUDIO_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
]);

export function sanitizeStudioFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

export function inferStudioAssetKind(
  contentType: string,
  explicit?: string | null,
): StudioAssetKind {
  const trimmed = explicit?.trim().toLowerCase();
  if (trimmed === "image" || trimmed === "audio") return trimmed;
  if (STUDIO_IMAGE_MIME.has(contentType)) return "image";
  if (STUDIO_AUDIO_MIME.has(contentType)) return "audio";
  throw new Error(
    'Unsupported file type. Use image (JPEG/PNG/WebP/GIF) or audio (MP3/WAV/OGG/WebM/M4A/AAC).',
  );
}

export function assertStudioAssetAllowed(
  kind: StudioAssetKind,
  contentType: string,
  byteSize: number,
): void {
  if (byteSize <= 0) throw new Error("Empty file.");
  if (byteSize > STUDIO_ASSET_MAX_BYTES) {
    throw new Error("File too large (max 20 MB).");
  }
  const allowed = kind === "audio" ? STUDIO_AUDIO_MIME : STUDIO_IMAGE_MIME;
  if (!allowed.has(contentType)) {
    if (kind === "audio") {
      throw new Error("Only MP3, WAV, OGG, WebM, M4A, MP4, or AAC audio is allowed.");
    }
    throw new Error("Only JPEG, PNG, WebP, or GIF images are allowed.");
  }
}

export function parseStudioAssetMeta(raw: FormDataEntryValue | null): Record<string, unknown> {
  if (raw == null || raw === "") return {};
  if (typeof raw !== "string") {
    throw new Error("meta must be a JSON string.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("meta must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("meta must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}
