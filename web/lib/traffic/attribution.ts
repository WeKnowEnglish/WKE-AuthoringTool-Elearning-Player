/**
 * First-touch arrival record. The referring site is only visible on the first
 * document load, so the proxy stores it before later pages replace it.
 */

export const TRAFFIC_ATTR_COOKIE = "wke_attr";
export const TRAFFIC_ATTR_PING_COOKIE = "wke_attr_ping";
export const TRAFFIC_ATTR_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

export type TrafficAttribution = {
  visitorId: string;
  landingPath: string;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  capturedAt: string;
};

export type ArrivalSignals = {
  method: string;
  pathname: string;
  searchParams: URLSearchParams;
  host: string;
  referer: string | null;
  accept: string | null;
  secFetchDest: string | null;
  purpose: string | null;
  nextRouterPrefetch: string | null;
  rsc: string | null;
};

const UTM_KEYS = [
  ["utm_source", "utmSource"],
  ["utm_medium", "utmMedium"],
  ["utm_campaign", "utmCampaign"],
  ["utm_content", "utmContent"],
  ["utm_term", "utmTerm"],
] as const;

export function isDocumentNavigation(signals: ArrivalSignals): boolean {
  const method = signals.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;
  if (signals.pathname.startsWith("/api")) return false;
  if (signals.rsc === "1") return false;
  if (signals.nextRouterPrefetch === "1") return false;
  if ((signals.purpose ?? "").toLowerCase().includes("prefetch")) return false;
  if (signals.secFetchDest === "document") return true;
  if (signals.secFetchDest) return false;
  return (signals.accept ?? "").includes("text/html");
}

export function externalReferrerHost(referer: string | null, siteHost: string): string | null {
  if (!referer) return null;
  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = normalizeHost(url.hostname);
  if (!host || host.length > 253 || !/^[a-z0-9.-]+$/.test(host)) return null;
  const site = normalizeHost(siteHost.split(":")[0] ?? "");
  if (!site) return host;
  if (host === site || host === `www.${site}` || site === `www.${host}`) return null;
  return host;
}

export function sanitizeLandingPath(pathname: string): string {
  const path = pathname.trim();
  if (!path.startsWith("/") || path.includes("..") || /[\u0000-\u001f]/.test(path)) return "/";
  return path.slice(0, 180);
}

export function sanitizeUtm(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim().slice(0, 80);
  if (!value || /[\u0000-\u001f<>"'\\]/.test(value)) return null;
  return value;
}

export function buildAttribution(
  signals: ArrivalSignals,
  visitorId: string,
  capturedAt: string,
): TrafficAttribution {
  const utm = Object.fromEntries(
    UTM_KEYS.map(([queryKey, field]) => [field, sanitizeUtm(signals.searchParams.get(queryKey))]),
  ) as Pick<
    TrafficAttribution,
    "utmSource" | "utmMedium" | "utmCampaign" | "utmContent" | "utmTerm"
  >;
  return {
    visitorId,
    landingPath: sanitizeLandingPath(signals.pathname),
    referrerHost: externalReferrerHost(signals.referer, signals.host),
    capturedAt,
    ...utm,
  };
}

export function serializeAttribution(attr: TrafficAttribution): string {
  const payload = JSON.stringify({
    v: 1,
    id: attr.visitorId,
    path: attr.landingPath,
    ref: attr.referrerHost,
    src: attr.utmSource,
    med: attr.utmMedium,
    cmp: attr.utmCampaign,
    cnt: attr.utmContent,
    term: attr.utmTerm,
    at: attr.capturedAt,
  });
  const bytes = new TextEncoder().encode(payload);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function parseAttributionCookie(raw: string | null | undefined): TrafficAttribution | null {
  if (!raw) return null;
  try {
    const padded = raw.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((raw.length + 3) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    if (parsed.v !== 1) return null;
    const visitorId = typeof parsed.id === "string" ? parsed.id : "";
    if (!/^[0-9a-f-]{16,64}$/i.test(visitorId)) return null;
    const capturedAt = typeof parsed.at === "string" ? parsed.at : "";
    if (!capturedAt || Number.isNaN(Date.parse(capturedAt))) return null;
    return {
      visitorId,
      landingPath: sanitizeLandingPath(typeof parsed.path === "string" ? parsed.path : "/"),
      referrerHost: typeof parsed.ref === "string" ? externalReferrerHost(`https://${parsed.ref}/`, "invalid.local") : null,
      utmSource: sanitizeUtm(typeof parsed.src === "string" ? parsed.src : null),
      utmMedium: sanitizeUtm(typeof parsed.med === "string" ? parsed.med : null),
      utmCampaign: sanitizeUtm(typeof parsed.cmp === "string" ? parsed.cmp : null),
      utmContent: sanitizeUtm(typeof parsed.cnt === "string" ? parsed.cnt : null),
      utmTerm: sanitizeUtm(typeof parsed.term === "string" ? parsed.term : null),
      capturedAt,
    };
  } catch {
    return null;
  }
}

/** Keep the first valid cookie. A corrupt cookie is replaced. */
export function firstTouchAttribution(
  existingCookie: string | null | undefined,
  incoming: TrafficAttribution,
): TrafficAttribution | null {
  if (parseAttributionCookie(existingCookie)) return null;
  return incoming;
}

export function attributionDbFields(attr: TrafficAttribution | null): Record<string, string | null> {
  if (!attr) return {};
  return {
    visitor_id: attr.visitorId,
    landing_path: attr.landingPath,
    referrer_host: attr.referrerHost,
    utm_source: attr.utmSource,
    utm_medium: attr.utmMedium,
    utm_campaign: attr.utmCampaign,
    utm_content: attr.utmContent,
    utm_term: attr.utmTerm,
    attribution_captured_at: attr.capturedAt,
  };
}

export function attributionMissingColumn(message: string): boolean {
  return /referrer_host|landing_path|visitor_id|utm_source|attribution_captured_at|schema cache/i.test(
    message,
  );
}

export function formatTrafficSource(input: {
  referrerHost: string | null;
  landingPath: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}): string | null {
  if (!input.landingPath && !input.referrerHost && !input.utmSource) return null;
  const from = input.referrerHost ?? "direct";
  const landed = input.landingPath ? `landed on ${input.landingPath}` : null;
  const campaign = [input.utmSource, input.utmMedium, input.utmCampaign].filter(Boolean).join(" / ");
  return [from, landed, campaign || null].filter(Boolean).join(" · ");
}

export function attributionEmailLines(attr: TrafficAttribution | null): string[] {
  const line = attr
    ? formatTrafficSource({
        referrerHost: attr.referrerHost,
        landingPath: attr.landingPath,
        utmSource: attr.utmSource,
        utmMedium: attr.utmMedium,
        utmCampaign: attr.utmCampaign,
      })
    : null;
  return line ? ["Where they arrived:", line, ""] : [];
}

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, "");
}
