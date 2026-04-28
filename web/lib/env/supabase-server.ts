/**
 * Server / Edge only — do not import from Client Components.
 * Prefer SUPABASE_* (no NEXT_PUBLIC_) in production so values are not
 * embedded in the browser bundle for code paths that only need the server.
 * Teacher login still needs NEXT_PUBLIC_SUPABASE_* in the browser.
 */
export function getSupabaseServerEnv(): { url: string; anonKey: string } {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "";
  return { url, anonKey };
}

export function assertSupabaseServerEnv(): { url: string; anonKey: string } {
  const env = getSupabaseServerEnv();
  if (!env.url || !env.anonKey) {
    throw new Error(
      "Missing Supabase URL or anon key. Set SUPABASE_URL + SUPABASE_ANON_KEY (recommended on the server) or NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return env;
}
