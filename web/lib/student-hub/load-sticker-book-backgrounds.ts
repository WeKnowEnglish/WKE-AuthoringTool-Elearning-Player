"use server";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import type { StickerBookBackground } from "@/lib/student-hub/sticker-book-types";

const BACKGROUND_LIMIT = 36;

type MediaRow = {
  id: string;
  public_url: string | null;
  meta_item_name: string | null;
  original_filename: string | null;
};

function labelForRow(row: MediaRow): string {
  const name = row.meta_item_name?.trim();
  if (name) return name;
  const file = row.original_filename?.trim();
  if (file) return file.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  return "Scene";
}

/**
 * Story-style backgrounds from the teacher media library (`meta_tags` includes `background`).
 */
export async function loadStickerBookBackgrounds(): Promise<StickerBookBackground[]> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("media_assets")
    .select("id, public_url, meta_item_name, original_filename")
    .like("content_type", "image/%")
    .contains("meta_tags", ["background"])
    .not("public_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(BACKGROUND_LIMIT);

  if (error || !data?.length) return [];

  const out: StickerBookBackground[] = [];
  for (const row of data as MediaRow[]) {
    const url = row.public_url?.trim();
    if (!url) continue;
    out.push({
      id: row.id,
      url,
      label: labelForRow(row),
    });
  }
  return out;
}
