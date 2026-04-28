"use server";

import { requireTeacher } from "@/lib/actions/teacher";

const BUCKET = "lesson_media";
const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const AUDIO_ALLOWED = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
]);
type MediaKind = "image" | "audio";

export type MediaAssetRow = {
  id: string;
  storage_path: string;
  public_url: string;
  original_filename: string;
  content_type: string;
  uploaded_by: string;
  created_at: string;
};

function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "image";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "image";
}

export async function uploadTeacherMedia(
  formData: FormData,
  kind: MediaKind = "image",
): Promise<{ url: string; id: string }> {
  const supabase = await requireTeacher();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const file = formData.get("file");
  if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
    throw new Error("No file uploaded");
  }
  const f = file as File;
  if (f.size > MAX_BYTES) {
    throw new Error("File too large (max 10 MB)");
  }
  const contentType = f.type || "application/octet-stream";
  const allowed = kind === "audio" ? AUDIO_ALLOWED : IMAGE_ALLOWED;
  if (!allowed.has(contentType)) {
    if (kind === "audio") {
      throw new Error("Only MP3, WAV, OGG, WebM, M4A, MP4, or AAC audio is allowed");
    }
    throw new Error("Only JPEG, PNG, WebP, or GIF images are allowed");
  }

  const safe = sanitizeFilename(f.name);
  const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
  const bytes = new Uint8Array(await f.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const { data: row, error: insErr } = await supabase
    .from("media_assets")
    .insert({
      storage_path: path,
      public_url: publicUrl,
      original_filename: f.name.slice(0, 255),
      content_type: contentType,
      uploaded_by: user.id,
    })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);

  return { url: publicUrl, id: row.id as string };
}

export async function listTeacherMedia(kind: MediaKind = "image"): Promise<MediaAssetRow[]> {
  const supabase = await requireTeacher();
  let q = supabase
    .from("media_assets")
    .select("id,storage_path,public_url,original_filename,content_type,uploaded_by,created_at")
    .order("created_at", { ascending: false });
  q = q.like("content_type", kind === "audio" ? "audio/%" : "image/%");
  const { data, error } = await q.limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as MediaAssetRow[];
}
