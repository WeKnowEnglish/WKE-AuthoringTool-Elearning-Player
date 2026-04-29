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
export type MediaKind = "image" | "audio";
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
  duplicate_status?: "uploaded" | "exact_duplicate_reused";
};

export async function uploadTeacherMedia(
  formData: FormData,
  kind: MediaKind = "image",
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
  const allowed = kind === "audio" ? AUDIO_ALLOWED : IMAGE_ALLOWED;
  if (!allowed.has(contentType)) {
    if (kind === "audio") {
      throw new Error("Only MP3, WAV, OGG, WebM, M4A, MP4, or AAC audio is allowed");
    }
    throw new Error("Only JPEG, PNG, WebP, or GIF images are allowed");
  }

  const bytes = new Uint8Array(await f.arrayBuffer());
  const sha256Hash = computeSha256Hex(bytes);

  let phash: string | null = null;
  if (kind === "image") {
    const { data: existingExact, error: exactErr } = await supabase
      .from("media_assets")
      .select("id,public_url")
      .eq("sha256_hash", sha256Hash)
      .like("content_type", "image/%")
      .limit(1)
      .maybeSingle();
    if (exactErr) throw new Error(exactErr.message);
    if (existingExact) {
      return {
        id: existingExact.id as string,
        url: existingExact.public_url as string,
        duplicate_status: "exact_duplicate_reused",
      };
    }

    phash = await computeImageDHashHex(bytes);
    if (phash) {
      const { data: candidates, error: candErr } = await supabase
        .from("media_assets")
        .select("id,original_filename,phash")
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
          const nearName = (c.original_filename as string | null) ?? "existing image";
          throw new Error(`Near-duplicate image detected (similar to "${nearName}").`);
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

  return { url: publicUrl, id: row.id as string, duplicate_status: "uploaded" };
}

type SearchTeacherMediaParams = {
  q?: string;
  kind?: MediaKindFilter;
  level?: string;
  wordType?: string;
  countability?: Countability | "all";
  tags?: string[];
  categories?: string[];
  skills?: string[];
  limit?: number;
};

function listIncludesAll(haystack: string[] | null | undefined, needles: string[]): boolean {
  if (needles.length === 0) return true;
  const set = new Set((haystack ?? []).map((x) => normalizeListValue(x)));
  return needles.every((n) => set.has(normalizeListValue(n)));
}

function matchesQuery(row: MediaAssetRow, q: string): boolean {
  const needle = normalizeListValue(q);
  if (!needle) return true;
  const searchParts = [
    row.meta_item_name ?? "",
    row.original_filename,
    row.public_url,
    row.meta_plural ?? "",
    row.meta_level ?? "",
    row.meta_word_type ?? "",
    row.meta_past_tense ?? "",
    row.meta_notes ?? "",
    ...(row.meta_tags ?? []),
    ...(row.meta_categories ?? []),
    ...(row.meta_alternative_names ?? []),
    ...(row.meta_skills ?? []),
  ];
  return normalizeListValue(searchParts.join(" ")).includes(needle);
}

export async function searchTeacherMedia(
  params: SearchTeacherMediaParams = {},
): Promise<MediaAssetRow[]> {
  const supabase = await requireTeacher();
  const kind = params.kind ?? "all";
  const maxRows = Math.min(Math.max(params.limit ?? 200, 1), 1000);

  let q = supabase
    .from("media_assets")
    .select(
      "id,storage_path,public_url,original_filename,content_type,uploaded_by,created_at,sha256_hash,phash,meta_categories,meta_tags,meta_alternative_names,meta_plural,meta_countability,meta_level,meta_word_type,meta_skills,meta_past_tense,meta_notes,meta_item_name",
    )
    .order("created_at", { ascending: false })
    .limit(maxRows);

  if (kind === "image") q = q.like("content_type", "image/%");
  if (kind === "audio") q = q.like("content_type", "audio/%");

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const level = normalizeOptionalText(params.level, 40);
  const wordType = normalizeOptionalText(params.wordType, 40);
  const countability = params.countability ?? "all";
  const tags = normalizeAndDedupList(params.tags ?? []);
  const categories = normalizeAndDedupList(params.categories ?? []);
  const skills = normalizeAndDedupList(params.skills ?? []);
  const query = params.q?.trim() ?? "";

  return ((data ?? []) as unknown as MediaAssetRow[]).filter((row) => {
    if (level && normalizeListValue(row.meta_level ?? "") !== normalizeListValue(level)) return false;
    if (wordType && normalizeListValue(row.meta_word_type ?? "") !== normalizeListValue(wordType)) return false;
    if (countability !== "all" && (row.meta_countability ?? "na") !== countability) return false;
    if (!listIncludesAll(row.meta_tags, tags)) return false;
    if (!listIncludesAll(row.meta_categories, categories)) return false;
    if (!listIncludesAll(row.meta_skills, skills)) return false;
    return matchesQuery(row, query);
  });
}

export async function listTeacherMedia(kind: MediaKind = "image"): Promise<MediaAssetRow[]> {
  return searchTeacherMedia({ kind, limit: 200 });
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
    .single();
  if (error) throw new Error(error.message);
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
