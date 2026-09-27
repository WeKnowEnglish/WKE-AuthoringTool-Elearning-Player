import "server-only";

export function logStripe(
  event: string,
  context: Record<string, string | number | boolean | null | undefined> = {},
): void {
  const safe: Record<string, unknown> = { event, ...context };
  for (const key of Object.keys(safe)) {
    if (/token|secret|key|authorization/i.test(key)) {
      delete safe[key];
    }
  }
  console.info("[stripe]", JSON.stringify(safe));
}

function normalizedOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    const localHttp =
      url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if (url.protocol !== "https:" && !localHttp) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function requestOriginFromHeaders(headerList: Headers): string {
  const configured =
    process.env.APP_ORIGIN?.trim() || process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  if (configured) {
    const origin = normalizedOrigin(configured);
    if (!origin) throw new Error("APP_ORIGIN must be HTTPS, except for localhost development.");
    return origin;
  }

  const host = headerList.get("x-forwarded-host") || headerList.get("host");
  const proto =
    headerList.get("x-forwarded-proto") ||
    (host?.includes("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");
  const origin = host ? normalizedOrigin(`${proto}://${host}`) : null;
  return origin ?? "http://localhost:3000";
}
