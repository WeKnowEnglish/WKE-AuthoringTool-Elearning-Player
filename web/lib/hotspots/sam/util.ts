/** Fast fingerprint for SAM embedding cache keys (not cryptographic). */
export function imageDataFingerprint(image: ImageData): string {
  const { width, height, data } = image;
  let hash = 2166136261;
  const pixelCount = width * height;
  const step = Math.max(1, Math.floor(pixelCount / 2048));

  for (let i = 0; i < pixelCount; i += step) {
    const base = i * 4;
    hash ^= data[base] ?? 0;
    hash = Math.imul(hash, 16777619);
    hash ^= data[base + 3] ?? 0;
    hash = Math.imul(hash, 16777619);
  }

  return `${width}x${height}-${(hash >>> 0).toString(16)}`;
}

export function isForegroundAt(
  image: ImageData,
  x: number,
  y: number,
  alphaThreshold = 8,
): boolean {
  const px = Math.min(image.width - 1, Math.max(0, Math.floor(x)));
  const py = Math.min(image.height - 1, Math.max(0, Math.floor(y)));
  const alpha = image.data[(py * image.width + px) * 4 + 3] ?? 0;
  return alpha >= alphaThreshold;
}
