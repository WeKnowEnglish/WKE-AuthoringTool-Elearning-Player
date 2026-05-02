"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Jimp, intToRGBA } from "jimp";
import { requireTeacher } from "@/lib/actions/teacher";

const BUCKET = "lesson_media";
const MAX_BYTES = 10 * 1024 * 1024;
const PHASH_DISTANCE_THRESHOLD = 8;
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
const VIDEO_ALLOWED = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);
export type MediaKind = "image" | "audio" | "video";
type MediaKindFilter = MediaKind | "all";
type Countability = "countable" | "uncountable" | "both" | "na";

export type MediaAssetRow = {
  id: string;
  storage_path: string;
  public_url: string;
  original_filename: string;
  content_type: string;
  uploaded_by: string;
  created_at: string;
  sha256_hash?: string | null;
  phash?: string | null;
  meta_categories?: string[] | null;
  meta_tags?: string[] | null;
  meta_alternative_names?: string[] | null;
  meta_plural?: string | null;
  meta_countability?: Countability | null;
  meta_level?: string | null;
  meta_word_type?: string | null;
  meta_skills?: string[] | null;
  meta_past_tense?: string | null;
  meta_notes?: string | null;
  meta_item_name?: string | null;
};

function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "image";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "image";
}

function normalizeListValue(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeAndDedupList(items: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    const normalized = normalizeListValue(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized.slice(0, 64));
  }
  return out.slice(0, 40);
}

function parseCsvField(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== "string") return [];
  return normalizeAndDedupList(value.split(","));
}

function normalizeOptionalText(
  value: FormDataEntryValue | string | null | undefined,
  max = 80,
): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, max) : null;
}

function ensureCountability(input: string | null): Countability {
  if (
    input === "countable" ||
    input === "uncountable" ||
    input === "both" ||
    input === "na"
  ) {
    return input;
  }
  return "na";
}

function computeSha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function computeImageDHashHex(bytes: Uint8Array): Promise<string | null> {
  try {
    const img = await Jimp.read(Buffer.from(bytes));
    // Jimp spells this as "greyscale" (UK spelling) in its types.
    img.resize({ w: 9, h: 8 }).greyscale();
    let bits = "";
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const left = intToRGBA(img.getPixelColor(x, y)).r;
        const right = intToRGBA(img.getPixelColor(x + 1, y)).r;
        bits += left > right ? "1" : "0";
      }
    }
    const asBigInt = BigInt(`0b${bits}`);
    return asBigInt.toString(16).padStart(16, "0");
  } catch {
    return null;
  }
}

function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;
  let dist = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = parseInt(a[i]!, 16);
    const bv = parseInt(b[i]!, 16);
    const xor = av ^ bv;
    dist += (xor & 1) + ((xor >> 1) & 1) + ((xor >> 2) & 1) + ((xor >> 3) & 1);
  }
  return dist;
}

export type UploadTeacherMediaResult = {
  url: string;
  id: string;
  duplicate_status?: "uploaded" | "exact_duplicate_reused" | "near_duplicate_reused";
};

export type DuplicateHandling = "delete_duplicate" | "keep_both";

export type UploadTeacherMediaBulkItemResult = {
  filename: string;
  status: "success" | "error";
  message?: string;
  url?: string;
  id?: string;
  duplicate_status?: "uploaded" | "exact_duplicate_reused" | "near_duplicate_reused";
};

export type UploadTeacherMediaBulkResult = {
  successCount: number;
  failureCount: number;
  items: UploadTeacherMediaBulkItemResult[];
};

export type MediaDuplicateIssue = {
  index: number;
  filename: string;
  duplicate_kind: "exact" | "near";
  existing_id: string;
  existing_url: string;
  existing_filename: string;
};

export async function uploadTeacherMedia(
  formData: FormData,
  kind: MediaKind = "image",
  duplicateHandling: DuplicateHandling = "delete_duplicate",
): Promise<UploadTeacherMediaResult> {
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
  const allowed =
    kind === "audio" ? AUDIO_ALLOWED
    : kind === "video" ? VIDEO_ALLOWED
    : IMAGE_ALLOWED;
  if (!allowed.has(contentType)) {
    if (kind === "audio") {
      throw new Error("Only MP3, WAV, OGG, WebM, M4A, MP4, or AAC audio is allowed");
    }
    if (kind === "video") {
      throw new Error("Only MP4, WebM, OGG, or MOV video is allowed");
    }
    throw new Error("Only JPEG, PNG, WebP, or GIF images are allowed");
  }

  const bytes = new Uint8Array(await f.arrayBuffer());
  const sha256Hash = computeSha256Hex(bytes);

  let phash: string | null = null;
  if (kind === "image") {
    if (duplicateHandling === "delete_duplicate") {
      const { data: existingExact, error: exactErr } = await supabase
        .from("media_assets")
        .select("id,public_url")
        .eq("sha256_hash", sha256Hash)
        .like("content_type", "image/%")
        .limit(1)
        .maybeSingle();
      if (exactErr) throw new Error(exactErr.message);
      if (existingExact) {
        revalidatePath("/teacher/media");
        return {
          id: existingExact.id as string,
          url: existingExact.public_url as string,
          duplicate_status: "exact_duplicate_reused",
        };
      }
    }

    phash = await computeImageDHashHex(bytes);
    if (phash) {
      const { data: candidates, error: candErr } = await supabase
        .from("media_assets")
        .select("id,public_url,original_filename,phash")
        .like("content_type", "image/%")
        .not("phash", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (candErr) throw new Error(candErr.message);
      for (const c of candidates ?? []) {
        const candidateHash = (c.phash as string | null) ?? null;
        if (!candidateHash) continue;
        const dist = hammingDistanceHex(phash, candidateHash);
        if (dist <= PHASH_DISTANCE_THRESHOLD) {
          if (duplicateHandling === "delete_duplicate") {
            revalidatePath("/teacher/media");
            return {
              id: c.id as string,
              url: c.public_url as string,
              duplicate_status: "near_duplicate_reused",
            };
          }
          break;
        }
      }
    }
  }

  const safe = sanitizeFilename(f.name);
  const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
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
      sha256_hash: sha256Hash,
      phash,
    })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);

  revalidatePath("/teacher/media");
  return { url: publicUrl, id: row.id as string, duplicate_status: "uploaded" };
}

/** One file + kind + duplicate_handling (for incremental / single uploads). */
export async function uploadTeacherMediaSingleFromForm(
  formData: FormData,
): Promise<UploadTeacherMediaBulkItemResult> {
  const kind = ((formData.get("kind") as MediaKind | null) ?? "image") as MediaKind;
  const duplicateHandling =
    (formData.get("duplicate_handling") as DuplicateHandling | null) ?? "delete_duplicate";
  const file = formData.get("file");
  if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
    return { filename: "", status: "error", message: "No file uploaded" };
  }
  const f = file as File;
  try {
    const result = await uploadTeacherMedia(formData, kind, duplicateHandling);
    return {
      filename: f.name,
      status: "success",
      url: result.url,
      id: result.id,
      duplicate_status: result.duplicate_status ?? "uploaded",
    };
  } catch (error) {
    return {
      filename: f.name,
      status: "error",
      message: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

export async function uploadTeacherMediaBulkFromForm(
  formData: FormData,
): Promise<UploadTeacherMediaBulkResult> {
  const kind = ((formData.get("kind") as MediaKind | null) ?? "image") as MediaKind;
  const defaultDuplicateHandling =
    (formData.get("duplicate_handling") as DuplicateHandling | null) ?? "delete_duplicate";
  const files = [...formData.getAll("files"), ...formData.getAll("file")].filter(
    (entry): entry is File => entry instanceof File,
  );
  if (files.length === 0) {
    throw new Error("No files uploaded");
  }

  const items: UploadTeacherMediaBulkItemResult[] = [];
  for (const [index, file] of files.entries()) {
    const single = new FormData();
    single.set("file", file);
    const perItemDecision = formData.get(`duplicate_decision_${index}`);
    const duplicateHandling =
      perItemDecision === "keep_new" ? "keep_both"
      : perItemDecision === "keep_existing" ? "delete_duplicate"
      : defaultDuplicateHandling;
    try {
      const result = await uploadTeacherMedia(single, kind, duplicateHandling);
      items.push({
        filename: file.name,
        status: "success",
        url: result.url,
        id: result.id,
        duplicate_status: result.duplicate_status ?? "uploaded",
      });
    } catch (error) {
      items.push({
        filename: file.name,
        status: "error",
        message: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }

  const successCount = items.filter((item) => item.status === "success").length;
  const failureCount = items.length - successCount;
  return { successCount, failureCount, items };
}

export async function inspectTeacherMediaBulkDuplicates(
  formData: FormData,
): Promise<MediaDuplicateIssue[]> {
  const kind = ((formData.get("kind") as MediaKind | null) ?? "image") as MediaKind;
  const files = [...formData.getAll("files"), ...formData.getAll("file")].filter(
    (entry): entry is File => entry instanceof File,
  );
  if (files.length === 0) return [];

  const supabase = await requireTeacher();
  const issues: MediaDuplicateIssue[] = [];

  for (const [index, file] of files.entries()) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const sha256Hash = computeSha256Hex(bytes);

    const contentLike =
      kind === "audio" ? "audio/%"
      : kind === "video" ? "video/%"
      : "image/%";

    const { data: exact, error: exactErr } = await supabase
      .from("media_assets")
      .select("id,public_url,original_filename")
      .eq("sha256_hash", sha256Hash)
      .like("content_type", contentLike)
      .limit(1)
      .maybeSingle();
    if (exactErr) throw new Error(exactErr.message);
    if (exact) {
      issues.push({
        index,
        filename: file.name,
        duplicate_kind: "exact",
        existing_id: exact.id as string,
        existing_url: exact.public_url as string,
        existing_filename: (exact.original_filename as string | null) ?? "existing file",
      });
      continue;
    }

    if (kind !== "image") continue;

    const phash = await computeImageDHashHex(bytes);
    if (!phash) continue;

    const { data: candidates, error: candErr } = await supabase
      .from("media_assets")
      .select("id,public_url,original_filename,phash")
      .like("content_type", "image/%")
      .not("phash", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);
    if (candErr) throw new Error(candErr.message);

    for (const candidate of candidates ?? []) {
      const candidateHash = (candidate.phash as string | null) ?? null;
      if (!candidateHash) continue;
      const dist = hammingDistanceHex(phash, candidateHash);
      if (dist <= PHASH_DISTANCE_THRESHOLD) {
        issues.push({
          index,
          filename: file.name,
          duplicate_kind: "near",
          existing_id: candidate.id as string,
          existing_url: candidate.public_url as string,
          existing_filename: (candidate.original_filename as string | null) ?? "existing image",
        });
        break;
      }
    }
  }

  return issues;
}

export type SearchTeacherMediaParams = {
  q?: string;
  kind?: MediaKindFilter;
  level?: string;
  wordType?: string;
  countability?: Countability | "all";
  tags?: string[];
  categories?: string[];
  skills?: string[];
  limit?: number;
  /** Zero-based offset for pagination (default 0). */
  offset?: number;
};

export type SearchTeacherMediaResult = {
  rows: MediaAssetRow[];
  total: number;
};

function parseRpcTotal(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function searchTeacherMedia(
  params: SearchTeacherMediaParams = {},
): Promise<SearchTeacherMediaResult> {
  const supabase = await requireTeacher();
  const kind = params.kind ?? "all";
  const limit = Math.min(Math.max(params.limit ?? 200, 1), 1000);
  const offset = Math.max(params.offset ?? 0, 0);

  const countability = params.countability ?? "all";
  const tags = normalizeAndDedupList(params.tags ?? []);
  const categories = normalizeAndDedupList(params.categories ?? []);
  const skills = normalizeAndDedupList(params.skills ?? []);
  const levelRaw = normalizeOptionalText(params.level, 40);
  const wordTypeRaw = normalizeOptionalText(params.wordType, 40);

  const { data, error } = await supabase.rpc("teacher_search_media_assets", {
    p_kind: kind,
    p_q: params.q?.trim() ?? "",
    p_level: levelRaw ?? "",
    p_word_type: wordTypeRaw ?? "",
    p_countability: countability,
    p_tags: tags,
    p_categories: categories,
    p_skills: skills,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    const hint =
      /teacher_search_media_assets|42883|function.*does not exist/i.test(`${error.message} ${error.code ?? ""}`) ?
        " Run migration web/supabase/migrations/016_teacher_search_media_assets.sql in the Supabase SQL editor."
      : "";
    throw new Error(`${error.message}${hint}`);
  }

  const payload = data as { total?: unknown; items?: unknown } | null;
  const total = parseRpcTotal(payload?.total);
  const items = (Array.isArray(payload?.items) ? payload?.items : []) as MediaAssetRow[];
  return { rows: items, total };
}

export async function listTeacherMedia(kind: MediaKind = "image"): Promise<MediaAssetRow[]> {
  const { rows } = await searchTeacherMedia({ kind, limit: 200 });
  return rows;
}

type UpdateTeacherMediaMetadataInput = {
  id: string;
  itemName?: string | null;
  categories?: string[];
  tags?: string[];
  alternativeNames?: string[];
  plural?: string | null;
  countability?: Countability;
  level?: string | null;
  wordType?: string | null;
  skills?: string[];
  pastTense?: string | null;
  notes?: string | null;
};

export async function updateTeacherMediaMetadata(
  input: UpdateTeacherMediaMetadataInput,
): Promise<MediaAssetRow> {
  const supabase = await requireTeacher();
  const categories = normalizeAndDedupList(input.categories ?? []);
  const tags = normalizeAndDedupList(input.tags ?? []);
  const alternativeNames = normalizeAndDedupList(input.alternativeNames ?? []);
  const skills = normalizeAndDedupList(input.skills ?? []);
  const itemName = input.itemName ? normalizeOptionalText(input.itemName, 120) : null;
  const plural = input.plural ? normalizeOptionalText(input.plural, 80) : null;
  const level = input.level ? normalizeOptionalText(input.level, 40) : null;
  const wordType = input.wordType ? normalizeOptionalText(input.wordType, 40) : null;
  const pastTense = input.pastTense ? normalizeOptionalText(input.pastTense, 80) : null;
  const notes = input.notes ? normalizeOptionalText(input.notes, 500) : null;

  const { data, error } = await supabase
    .from("media_assets")
    .update({
      meta_item_name: itemName,
      meta_categories: categories,
      meta_tags: tags,
      meta_alternative_names: alternativeNames,
      meta_plural: plural,
      meta_countability: input.countability ?? "na",
      meta_level: level,
      meta_word_type: wordType,
      meta_skills: skills,
      meta_past_tense: pastTense,
      meta_notes: notes,
    })
    .eq("id", input.id)
    .select(
      "id,storage_path,public_url,original_filename,content_type,uploaded_by,created_at,sha256_hash,phash,meta_categories,meta_tags,meta_alternative_names,meta_plural,meta_countability,meta_level,meta_word_type,meta_skills,meta_past_tense,meta_notes,meta_item_name",
    )
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error(
      "Could not update this media item. It may not exist, or you may not have permission to edit it.",
    );
  }
  revalidatePath("/teacher/media");
  return data as unknown as MediaAssetRow;
}

export async function updateTeacherMediaMetadataFromForm(formData: FormData): Promise<void> {
  const id = normalizeOptionalText(formData.get("id"), 100);
  if (!id) throw new Error("Missing media id");
  await updateTeacherMediaMetadata({
    id,
    itemName: normalizeOptionalText(formData.get("item_name"), 120),
    categories: parseCsvField(formData.get("categories")),
    tags: parseCsvField(formData.get("tags")),
    alternativeNames: parseCsvField(formData.get("alternative_names")),
    plural: normalizeOptionalText(formData.get("plural"), 80),
    countability: ensureCountability(normalizeOptionalText(formData.get("countability"), 20)),
    level: normalizeOptionalText(formData.get("level"), 40),
    wordType: normalizeOptionalText(formData.get("word_type"), 40),
    skills: parseCsvField(formData.get("skills")),
    pastTense: normalizeOptionalText(formData.get("past_tense"), 80),
    notes: normalizeOptionalText(formData.get("notes"), 500),
  });
}

export async function deleteTeacherMedia(assetId: string): Promise<void> {
  const supabase = await requireTeacher();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: row, error: rowErr } = await supabase
    .from("media_assets")
    .select("id,storage_path,uploaded_by")
    .eq("id", assetId)
    .single();
  if (rowErr) throw new Error(rowErr.message);
  if (!row) throw new Error("Media not found");
  if ((row.uploaded_by as string) !== user.id) {
    throw new Error("You can only delete your own media.");
  }

  const storagePath = row.storage_path as string;
  const { error: storageErr } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (storageErr) throw new Error(storageErr.message);

  const { error: delErr } = await supabase.from("media_assets").delete().eq("id", assetId);
  if (delErr) throw new Error(delErr.message);

  revalidatePath("/teacher/media");
}
