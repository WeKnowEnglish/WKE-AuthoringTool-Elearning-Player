import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";

export type LocalVocabMediaCounts = {
  images: number;
  audio: number;
  total: number;
};

export type PublishLocalVocabMediaResult = {
  document: VocabularyListDocument;
  uploadedImages: number;
  uploadedAudio: number;
  failed: number;
  errors: string[];
};

function isDataUrl(value: string | undefined): value is string {
  return Boolean(value?.trim().startsWith("data:"));
}

function extensionFromDataUrl(dataUrl: string, fallback: string): string {
  const mime = dataUrl.slice(5, dataUrl.indexOf(";")).toLowerCase();
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("webm")) return "webm";
  return fallback;
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export function countLocalVocabMedia(document: VocabularyListDocument): LocalVocabMediaCounts {
  let images = 0;
  let audio = 0;
  for (const entry of document.entries) {
    if (isDataUrl(entry.imageUrl)) images += 1;
    if (isDataUrl(entry.audioUrl)) audio += 1;
  }
  return { images, audio, total: images + audio };
}

/**
 * Publish a blob to Lesson Player studio_assets using the teacher cookie session
 * (same-origin). Optional access token for parity with Studio clients.
 */
export async function publishVocabStudioAsset(input: {
  file: Blob;
  filename: string;
  kind: "image" | "audio";
  meta?: Record<string, unknown>;
}): Promise<{ public_url: string; media_asset_id?: string }> {
  const form = new FormData();
  form.append("file", input.file, input.filename);
  form.append("kind", input.kind);
  if (input.meta) form.append("meta", JSON.stringify(input.meta));

  const response = await fetch("/api/studio/assets", {
    method: "POST",
    body: form,
    credentials: "same-origin",
  });
  const body = (await response.json().catch(() => null)) as {
    ok?: boolean;
    public_url?: string;
    media_public_url?: string;
    media_asset_id?: string;
    error?: string;
  } | null;
  if (!response.ok || !(body?.media_public_url || body?.public_url)) {
    throw new Error(body?.error || `Upload failed (${response.status}).`);
  }
  return {
    // Prefer shared media library URL when the Studio upload was bridged.
    public_url: (body.media_public_url || body.public_url) as string,
    ...(body.media_asset_id ? { media_asset_id: body.media_asset_id } : {}),
  };
}

/**
 * Upload every `data:` picture/audio on the list to studio_assets.
 * Already-cloud http(s) URLs are left unchanged.
 */
export async function publishLocalVocabMedia(
  document: VocabularyListDocument,
  options?: {
    onProgress?: (done: number, total: number, label: string) => void;
  },
): Promise<PublishLocalVocabMediaResult> {
  const counts = countLocalVocabMedia(document);
  if (counts.total === 0) {
    return {
      document,
      uploadedImages: 0,
      uploadedAudio: 0,
      failed: 0,
      errors: [],
    };
  }

  let uploadedImages = 0;
  let uploadedAudio = 0;
  let failed = 0;
  const errors: string[] = [];
  let done = 0;
  const entries = [];

  for (const entry of document.entries) {
    let imageUrl = entry.imageUrl;
    let audioUrl = entry.audioUrl;

    if (isDataUrl(imageUrl)) {
      const word = entry.word.trim() || entry.id;
      options?.onProgress?.(done, counts.total, `picture · ${word}`);
      try {
        const blob = await dataUrlToBlob(imageUrl);
        const ext = extensionFromDataUrl(imageUrl, "webp");
        const published = await publishVocabStudioAsset({
          file: blob,
          filename: `vocab-${entry.id}.${ext}`,
          kind: "image",
          meta: {
            source: "vocabulary_list",
            listId: document.id,
            entryId: entry.id,
            field: "imageUrl",
            batch: true,
            ...(entry.sourceWordId ? { sourceWordId: entry.sourceWordId } : {}),
            ...(entry.word.trim() ? { word: entry.word.trim() } : {}),
          },
        });
        imageUrl = published.public_url;
        uploadedImages += 1;
      } catch (error) {
        failed += 1;
        errors.push(
          `${word} picture: ${error instanceof Error ? error.message : "upload failed"}`,
        );
      }
      done += 1;
    }

    if (isDataUrl(audioUrl)) {
      const word = entry.word.trim() || entry.id;
      options?.onProgress?.(done, counts.total, `audio · ${word}`);
      try {
        const blob = await dataUrlToBlob(audioUrl);
        const ext = extensionFromDataUrl(audioUrl, "webm");
        const published = await publishVocabStudioAsset({
          file: blob,
          filename: `vocab-${entry.id}.${ext}`,
          kind: "audio",
          meta: {
            source: "vocabulary_list",
            listId: document.id,
            entryId: entry.id,
            field: "audioUrl",
            batch: true,
            ...(entry.sourceWordId ? { sourceWordId: entry.sourceWordId } : {}),
            ...(entry.word.trim() ? { word: entry.word.trim() } : {}),
          },
        });
        audioUrl = published.public_url;
        uploadedAudio += 1;
      } catch (error) {
        failed += 1;
        errors.push(
          `${word} audio: ${error instanceof Error ? error.message : "upload failed"}`,
        );
      }
      done += 1;
    }

    entries.push({ ...entry, imageUrl, audioUrl });
  }

  return {
    document: { ...document, entries },
    uploadedImages,
    uploadedAudio,
    failed,
    errors,
  };
}

export async function readAudioFileAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|ogg|webm)$/i.test(file.name)) {
    throw new Error("Please choose an audio file (mp3, wav, m4a, ogg, or webm).");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Audio is too large (max 12 MB).");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read audio file."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
