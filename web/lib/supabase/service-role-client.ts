import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for trusted server-only reads (e.g. resolving media library URLs for students).
 * Returns null when `SUPABASE_SERVICE_ROLE_KEY` is unset — callers should degrade gracefully.
 */
export function createServiceRoleSupabase(): SupabaseClient | null {
  const url =
    process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
