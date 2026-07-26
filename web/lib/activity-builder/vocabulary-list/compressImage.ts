/** Classroom-friendly choice images for Games Listen & Choose (and later formats). */

export const GAMES_CHOICE_IMAGE_MAX_EDGE = 1024;
export const GAMES_CHOICE_IMAGE_QUALITY = 0.82;
export const GAMES_CHOICE_IMAGE_MAX_INPUT_BYTES = 12 * 1024 * 1024;

export type CompressedGamesImage = {
  dataUrl: string;
  mimeType: "image/webp" | "image/jpeg" | "image/png";
  width: number;
  height: number;
  originalBytes: number;
  outputBytes: number;
};

export function computeContainSize(
  width: number,
  height: number,
  maxEdge: number = GAMES_CHOICE_IMAGE_MAX_EDGE,
): { width: number; height: number; scaled: boolean } {
  if (width <= 0 || height <= 0) {
    throw new Error("Image dimensions must be positive.");
  }
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width, height, scaled: false };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scaled: true,
  };
}

function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return dataUrl.length;
  const payload = dataUrl.slice(comma + 1);
  if (dataUrl.includes(";base64")) return Math.floor((payload.length * 3) / 4);
  return payload.length;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not encode compressed image."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image encoding failed."))),
      mimeType,
      quality,
    );
  });
}

function prefersLosslessSource(file: File): boolean {
  return file.type === "image/png" || /\.png$/i.test(file.name);
}

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not decode image."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Resize (max edge 1024) and compress a local choice image for Quiz packs.
 * Prefers WebP, then JPEG; keeps PNG only if WebP/JPEG encoding is unavailable.
 */
export async function compressGamesChoiceImageFile(
  file: File,
  options?: {
    maxEdge?: number;
    quality?: number;
    maxInputBytes?: number;
  },
): Promise<CompressedGamesImage> {
  if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
    throw new Error("Please choose a PNG, JPEG, or WebP image.");
  }
  const maxInputBytes = options?.maxInputBytes ?? GAMES_CHOICE_IMAGE_MAX_INPUT_BYTES;
  if (file.size > maxInputBytes) {
    throw new Error("Image is too large (max 12 MB). Try a smaller file.");
  }

  const maxEdge = options?.maxEdge ?? GAMES_CHOICE_IMAGE_MAX_EDGE;
  const quality = options?.quality ?? GAMES_CHOICE_IMAGE_QUALITY;
  const image = await loadImageElement(file);
  const size = computeContainSize(image.naturalWidth, image.naturalHeight, maxEdge);

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare image canvas.");
  context.drawImage(image, 0, 0, size.width, size.height);

  const candidates: Array<"image/webp" | "image/jpeg" | "image/png"> = prefersLosslessSource(file)
    ? ["image/webp", "image/jpeg", "image/png"]
    : ["image/webp", "image/jpeg"];

  let best: CompressedGamesImage | null = null;
  for (const mimeType of candidates) {
    try {
      const blob = await canvasToBlob(
        canvas,
        mimeType,
        mimeType === "image/png" ? undefined : quality,
      );
      // Skip failed/empty encodes.
      if (!blob.size) continue;
      const dataUrl = await blobToDataUrl(blob);
      const candidate: CompressedGamesImage = {
        dataUrl,
        mimeType,
        width: size.width,
        height: size.height,
        originalBytes: file.size,
        outputBytes: blob.size,
      };
      if (!best || candidate.outputBytes < best.outputBytes) {
        best = candidate;
      }
      // Prefer the first viable lossy format if it's already smaller than the source.
      if (mimeType !== "image/png" && candidate.outputBytes < file.size) {
        break;
      }
    } catch {
      /* try next mime */
    }
  }

  if (!best) {
    throw new Error("Could not compress image in this browser.");
  }

  // If compression somehow grew a tiny source, keep the smaller original as data URL.
  if (best.outputBytes > file.size && file.size < 200_000) {
    const originalDataUrl = await blobToDataUrl(file);
    return {
      dataUrl: originalDataUrl,
      mimeType: (file.type as CompressedGamesImage["mimeType"]) || "image/png",
      width: image.naturalWidth,
      height: image.naturalHeight,
      originalBytes: file.size,
      outputBytes: estimateDataUrlBytes(originalDataUrl),
    };
  }

  return best;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
