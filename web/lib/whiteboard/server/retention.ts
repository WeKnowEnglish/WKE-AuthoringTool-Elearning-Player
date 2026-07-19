import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

const DEFAULT_RETENTION_DAYS = 90;

/** Mark rounds past retention for cleanup (does not delete Liveblocks rooms). */
export async function markExpiredWhiteboardRounds(now = new Date()): Promise<number> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return 0;

  const { data: rounds } = await supabase
    .from("whiteboard_rounds")
    .select("id, retention_until, archived_at, updated_at")
    .is("archived_at", null)
    .limit(200);

  let marked = 0;
  for (const row of rounds ?? []) {
    const retentionUntil = row.retention_until
      ? new Date(row.retention_until as string)
      : addDays(new Date(row.updated_at as string), DEFAULT_RETENTION_DAYS);
    if (retentionUntil > now) continue;
    const { error } = await supabase
      .from("whiteboard_rounds")
      .update({
        archived_at: now.toISOString(),
        retention_until: retentionUntil.toISOString(),
      })
      .eq("id", row.id as string);
    if (!error) marked += 1;
  }
  return marked;
}

/** Clear heavy preview_data_url blobs for archived rounds (keeps preview_path). */
export async function scrubArchivedPreviewDataUrls(limit = 100): Promise<number> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return 0;

  const { data: rounds } = await supabase
    .from("whiteboard_rounds")
    .select("id")
    .not("archived_at", "is", null)
    .limit(50);

  if (!rounds?.length) return 0;
  const roundIds = rounds.map((r) => r.id as string);

  const { data: rows } = await supabase
    .from("whiteboard_submissions")
    .select("id")
    .in("round_id", roundIds)
    .not("preview_data_url", "is", null)
    .limit(limit);

  let scrubbed = 0;
  for (const row of rows ?? []) {
    const { error } = await supabase
      .from("whiteboard_submissions")
      .update({ preview_data_url: null })
      .eq("id", row.id as string);
    if (!error) scrubbed += 1;
  }
  return scrubbed;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
