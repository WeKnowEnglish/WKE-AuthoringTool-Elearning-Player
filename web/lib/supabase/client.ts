import { createBrowserClient } from "@supabase/ssr";

declare global {
  interface Window {
    __WKE_RUNTIME_CONFIG__?: {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };
  }
}

/**
 * Browser Supabase client (student + teacher sign-in).
 * Uses the public anon / publishable key.
 * Never use the service-role key here.
 */
export function createClient() {
  const runtimeConfig =
    typeof window === "undefined" ? undefined : window.__WKE_RUNTIME_CONFIG__;
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    runtimeConfig?.supabaseUrl?.trim() ||
    "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    runtimeConfig?.supabaseAnonKey?.trim() ||
    "";
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for browser auth.",
    );
  }
  return createBrowserClient(url, key, {
    auth: {
      // React Strict Mode can orphan navigator.locks holders; avoid steal cascades in dev.
      lock: async (_name, _acquireTimeout, fn) => fn(),
    },
  });
}
