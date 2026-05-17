const DEFAULT_PREFETCH_TIMEOUT_MS = 12000;

/** Dedupe non-empty trimmed image URLs. */
export function uniqueImageUrls(urls: Iterable<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const u = raw?.trim();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function loadAndDecodeImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onerror = done;
    img.onload = () => {
      if (typeof img.decode === "function") {
        void img.decode().then(done).catch(done);
      } else {
        done();
      }
    };
    img.src = src;
  });
}

/**
 * Warm the browser cache for remote images (fire-and-forget friendly).
 * Resolves when all loads finish, error, or `timeoutMs` elapses.
 */
export function prefetchImageUrls(
  urls: Iterable<string | undefined | null>,
  timeoutMs: number = DEFAULT_PREFETCH_TIMEOUT_MS,
): Promise<void> {
  const unique = uniqueImageUrls(urls);
  if (unique.length === 0) return Promise.resolve();

  return Promise.race([
    Promise.all(unique.map((src) => loadAndDecodeImage(src))).then(() => undefined),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}
