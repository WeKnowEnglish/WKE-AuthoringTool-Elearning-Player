import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

const BUCKET = "whiteboard-exports";

export async function ensureWhiteboardExportBucket(): Promise<boolean> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return false;
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) return true;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 5_000_000,
  });
  return !error;
}

export async function uploadWhiteboardPreview(input: {
  roundId: string;
  boardId: string;
  revision: number;
  png: Buffer;
}): Promise<string | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;
  await ensureWhiteboardExportBucket();

  const path = `${input.roundId}/${input.boardId}/r${input.revision}.png`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, input.png, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) return null;
  return path;
}

export async function downloadWhiteboardPreview(path: string): Promise<Buffer | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
}

export function whiteboardPreviewPublicPath(path: string): string {
  return `/api/whiteboard/preview?path=${encodeURIComponent(path)}`;
}
