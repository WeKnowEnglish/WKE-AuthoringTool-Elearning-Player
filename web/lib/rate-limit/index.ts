import { rateLimitAllowMemory } from "@/lib/rate-limit/memory";

function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

/**
 * Fixed-window counter via Upstash REST (no extra package).
 * Key includes the window bucket so TTL can expire the counter.
 */
async function rateLimitAllowUpstash(
  key: string,
  max: number,
  windowMs: number,
  config: { url: string; token: string },
): Promise<boolean> {
  const windowId = Math.floor(Date.now() / windowMs);
  const redisKey = `rl:${key}:${windowId}`;
  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000) + 1);

  try {
    const incrRes = await fetch(
      `${config.url}/incr/${encodeURIComponent(redisKey)}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${config.token}` },
        cache: "no-store",
      },
    );
    if (!incrRes.ok) return rateLimitAllowMemory(key, max, windowMs);
    const incrJson = (await incrRes.json()) as { result?: number };
    const count = typeof incrJson.result === "number" ? incrJson.result : 0;

    if (count === 1) {
      await fetch(
        `${config.url}/expire/${encodeURIComponent(redisKey)}/${ttlSeconds}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${config.token}` },
          cache: "no-store",
        },
      ).catch(() => undefined);
    }

    return count <= max;
  } catch {
    return rateLimitAllowMemory(key, max, windowMs);
  }
}

/**
 * Shared rate limiter: Upstash when configured, otherwise in-memory.
 * Async so Daily routes can await; memory path is sync under the hood.
 */
export async function rateLimitAllow(
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const upstash = upstashConfig();
  if (upstash) {
    return rateLimitAllowUpstash(key, max, windowMs, upstash);
  }
  return rateLimitAllowMemory(key, max, windowMs);
}

export function isUpstashRateLimitConfigured(): boolean {
  return upstashConfig() !== null;
}
