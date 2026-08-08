import { SITE_URL } from "@/lib/seo/site";

function normalizeOrigin(raw: string): string {
  return raw.replace(/\/$/, "");
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Origin for Supabase auth emails (signup confirm, password reset).
 *
 * Localhost keeps the current origin so local email testing works.
 * Everywhere else uses APP_ORIGIN / NEXT_PUBLIC_APP_ORIGIN, then production
 * SITE_URL — never a Vercel preview URL, which expires into DEPLOYMENT_NOT_FOUND.
 */
export function authEmailRedirectOrigin(
  currentOrigin?: string | null,
): string {
  const current = (currentOrigin ?? "").trim();
  if (current && isLocalDevOrigin(current)) {
    return normalizeOrigin(current);
  }

  const fromEnv =
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ||
    process.env.APP_ORIGIN?.trim();
  if (fromEnv) return normalizeOrigin(fromEnv);

  return SITE_URL;
}

/** Full `/auth/callback?next=…` URL for Supabase emailRedirectTo / redirectTo. */
export function authCallbackRedirectUrl(
  nextPath: string,
  currentOrigin?: string | null,
): string {
  const origin = authEmailRedirectOrigin(currentOrigin);
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
