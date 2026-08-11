const RECORDING_MIME_PREFERENCES = [
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
] as const;

export function preferredAudioRecordingMimeType(): string | null {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return null;
  return RECORDING_MIME_PREFERENCES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function createAudioMediaRecorder(stream: MediaStream): MediaRecorder {
  const mimeType = preferredAudioRecordingMimeType();
  return mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
}

export function recordedAudioFile(parts: BlobPart[], recorderMimeType: string, basename: string): File {
  const typedPart = parts.find((part): part is Blob => part instanceof Blob && Boolean(part.type));
  const reported = recorderMimeType || typedPart?.type || "audio/webm";
  const mimeType = reported.split(";", 1)[0]?.toLowerCase() || "audio/webm";
  const extension =
    mimeType === "audio/mp4" || mimeType === "audio/x-m4a"
      ? "m4a"
      : mimeType === "audio/ogg"
        ? "ogg"
        : mimeType === "audio/mpeg"
          ? "mp3"
          : mimeType === "audio/wav" || mimeType === "audio/x-wav"
            ? "wav"
            : mimeType === "audio/aac"
              ? "aac"
              : "webm";
  const blob = new Blob(parts, { type: mimeType });
  return new File([blob], `${basename}.${extension}`, { type: mimeType });
}
