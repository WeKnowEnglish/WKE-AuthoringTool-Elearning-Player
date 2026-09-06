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

export function requestOriginFromHeaders(headerList: Headers): string {
  const host = headerList.get("x-forwarded-host") || headerList.get("host");
  const proto =
    headerList.get("x-forwarded-proto") ||
    (host?.includes("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return (
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ||
    process.env.APP_ORIGIN?.trim() ||
    "http://localhost:3000"
  );
}
