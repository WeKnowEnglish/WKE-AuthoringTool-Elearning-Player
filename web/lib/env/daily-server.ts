/**
 * Server-only Daily env — never import from Client Components.
 */
export function isDailyEnabled(): boolean {
  const raw = process.env.DAILY_ENABLED?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
  if (raw === "1" || raw === "true" || raw === "on" || raw === "yes") {
    return Boolean(process.env.DAILY_API_KEY?.trim());
  }
  // Unset → enabled only when API key is present (local convenience).
  return Boolean(process.env.DAILY_API_KEY?.trim());
}

export function getDailyApiKey(): string {
  return process.env.DAILY_API_KEY?.trim() ?? "";
}

export function assertDailyApiKey(): string {
  const key = getDailyApiKey();
  if (!key) {
    throw new Error(
      "Missing DAILY_API_KEY. Add it to .env.local from the Daily dashboard (server-only).",
    );
  }
  return key;
}

/** Safe browser domain host, e.g. your-subdomain.daily.co — no secrets. */
export function getDailyDomain(): string {
  return (
    process.env.DAILY_DOMAIN?.trim() ||
    process.env.NEXT_PUBLIC_DAILY_DOMAIN?.trim() ||
    ""
  );
}
