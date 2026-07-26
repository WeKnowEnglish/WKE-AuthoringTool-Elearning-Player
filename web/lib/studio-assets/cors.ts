/** Shared CORS for EDU Studio → Lesson Player asset APIs. */

export function allowedStudioOrigins(): string[] {
  const fromEnv =
    process.env.STUDIO_ORIGIN?.trim() || process.env.NEXT_PUBLIC_STUDIO_ORIGIN?.trim();
  const list = [
    fromEnv,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
  ].filter((value): value is string => Boolean(value));
  return [...new Set(list)];
}

export function studioCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const allowed = allowedStudioOrigins();
  const headers: Record<string, string> = {
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}
