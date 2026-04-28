import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-only (teacher sign-in). Uses the public anon / publishable key.
 * Never use the service-role key here. Student pages do not import this file.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for browser auth.",
    );
  }
  return createBrowserClient(url, key);
}
