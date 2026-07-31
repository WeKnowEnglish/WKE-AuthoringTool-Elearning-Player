import { SITE_HOST, SITE_URL } from "@/lib/seo/site";

/**
 * Build a canonical absolute URL with no trailing slash.
 * (Next.js metadata also normalizes the homepage to the apex without `/`.)
 */
export function canonicalUrl(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed || trimmed === "/") {
    return SITE_URL;
  }
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withoutTrailing = withSlash.replace(/\/+$/, "");
  return `${SITE_URL}${withoutTrailing}`;
}

/** True when the request Host should be treated as the production indexable host. */
export function isIndexableHost(hostHeader: string | null | undefined): boolean {
  const host = (hostHeader ?? "").split(":")[0]?.toLowerCase().trim() ?? "";
  if (!host) return false;
  return host === SITE_HOST;
}

/** True when www should 308 to apex. */
export function isWwwHost(hostHeader: string | null | undefined): boolean {
  const host = (hostHeader ?? "").split(":")[0]?.toLowerCase().trim() ?? "";
  return host === `www.${SITE_HOST}`;
}

/**
 * Preview, staging, and non-production hosts should send X-Robots-Tag: noindex, nofollow.
 * Localhost is included so accidental exposure is not indexed.
 */
export function shouldSendPreviewNoindex(
  hostHeader: string | null | undefined,
  vercelEnv: string | undefined = process.env.VERCEL_ENV,
): boolean {
  if (vercelEnv === "preview" || vercelEnv === "development") return true;
  if (isWwwHost(hostHeader)) return true; // before redirect; belt-and-suspenders
  return !isIndexableHost(hostHeader);
}
