const attempts = new Map();

function upstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

function memoryConsume(key, max, windowMs) {
  const now = Date.now();
  const existing = attempts.get(key);
  const current =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : existing;
  const next = { ...current, count: current.count + 1 };
  attempts.set(key, next);
  return {
    allowed: next.count <= max,
    retryAfter: Math.max(1, Math.ceil((next.resetAt - now) / 1_000)),
  };
}

async function upstashConsume(key, max, windowMs, config) {
  const windowId = Math.floor(Date.now() / windowMs);
  const redisKey = `wke:deploy:login:${key}:${windowId}`;
  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1_000) + 1);
  try {
    const response = await fetch(`${config.url}/incr/${encodeURIComponent(redisKey)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}` },
      cache: "no-store",
    });
    if (!response.ok) return memoryConsume(key, max, windowMs);
    const body = await response.json();
    const count = typeof body.result === "number" ? body.result : max + 1;
    if (count === 1) {
      await fetch(`${config.url}/expire/${encodeURIComponent(redisKey)}/${ttlSeconds}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.token}` },
        cache: "no-store",
      }).catch(() => undefined);
    }
    return { allowed: count <= max, retryAfter: ttlSeconds };
  } catch {
    return memoryConsume(key, max, windowMs);
  }
}

export async function consumeLoginAttempt(key, max, windowMs) {
  const config = upstashConfig();
  return config
    ? upstashConsume(key, max, windowMs, config)
    : memoryConsume(key, max, windowMs);
}

export function resetMemoryLoginAttemptsForTests() {
  attempts.clear();
}
