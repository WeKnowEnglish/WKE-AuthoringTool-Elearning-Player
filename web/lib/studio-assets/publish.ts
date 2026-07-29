import "server-only";

import { createHash } from "crypto";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { isTeacher } from "@/lib/auth/roles";
import { assertSupabaseServerEnv } from "@/lib/env/supabase-server";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import type {
  PublishStudioAssetResult,
  StudioAssetKind,
} from "@/lib/studio-assets/types";
import {
  STUDIO_MEDIA_BUCKET,
  assertStudioAssetAllowed,
  inferStudioAssetKind,
  parseStudioAssetMeta,
  sanitizeStudioFilename,
} from "@/lib/studio-assets/validate";
import { bridgeStudioPublishToMediaLibrary } from "@/lib/studio-assets/bridge-to-media-library";

function computeSha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseContentSha256(formData: FormData): string | null {
  const raw = formData.get("content_sha256");
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(value) ? value : null;
}

function rowToPublishResult(
  row: {
    id: unknown;
    public_url: unknown;
    storage_path: unknown;
    kind: unknown;
    content_type: unknown;
    original_filename: unknown;
    byte_size: unknown;
  },
  fallbackByteSize: number,
  reused: boolean,
): PublishStudioAssetResult {
  return {
    id: row.id as string,
    public_url: row.public_url as string,
    storage_path: row.storage_path as string,
    kind: row.kind as StudioAssetKind,
    content_type: row.content_type as string,
    original_filename: row.original_filename as string,
    byte_size: Number(row.byte_size) || fallbackByteSize,
    reused,
  };
}

function looksLikeJwt(token: string): boolean {
  const parts = token.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

function teacherClientFromAccessToken(accessToken: string): SupabaseClient {
  const { url, anonKey } = assertSupabaseServerEnv();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function bearerFromAuthorizationHeader(request: Request): string {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return "";
  if (authHeader.startsWith("Bearer ") || authHeader.startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  return "";
}

async function resolveTeacherFromAccessToken(accessToken: string): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  if (!looksLikeJwt(accessToken)) {
    throw new StudioAssetAuthError(
      "Teacher authentication failed: access token is not a valid session JWT.",
    );
  }

  const { url, anonKey } = assertSupabaseServerEnv();
  // Validate JWT with Auth API first (no global Authorization needed).
  const probe = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error,
  } = await probe.auth.getUser(accessToken);

  if (error) {
    throw new StudioAssetAuthError(
      `Teacher authentication failed: ${error.message}`,
    );
  }
  if (!user) {
    throw new StudioAssetAuthError("Teacher authentication failed: no user for this session.");
  }
  if (!isTeacher(user)) {
    throw new StudioAssetAuthError(
      `This account is not a teacher (${user.email ?? user.id}).`,
    );
  }

  return {
    supabase: teacherClientFromAccessToken(accessToken),
    user,
  };
}

/**
 * Resolve a teacher-scoped Supabase client from:
 * 1) Authorization Bearer token (cross-origin Studio)
 * 2) optional multipart `access_token` field (header fallback)
 * 3) cookie session (same-origin / manual testing)
 */
export async function resolveStudioTeacherClient(
  request: Request,
  formAccessToken?: string | null,
): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  const bearer =
    bearerFromAuthorizationHeader(request) || formAccessToken?.trim() || "";

  if (bearer) {
    return resolveTeacherFromAccessToken(bearer);
  }

  const supabase = await createCookieClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user || !isTeacher(user)) {
    throw new StudioAssetAuthError(
      "Teacher authentication required. Sign in to EDU Studio with your Lesson Player teacher account, then retry.",
    );
  }
  return { supabase: supabase as unknown as SupabaseClient, user };
}

export class StudioAssetAuthError extends Error {
  readonly status = 401;
  constructor(message: string) {
    super(message);
    this.name = "StudioAssetAuthError";
  }
}

export class StudioAssetValidationError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "StudioAssetValidationError";
  }
}

export async function publishStudioAssetFromFormData(
  supabase: SupabaseClient,
  user: User,
  formData: FormData,
): Promise<PublishStudioAssetResult> {
  const file = formData.get("file");
  if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
    throw new StudioAssetValidationError('Missing file field "file".');
  }
  const f = file as File;
  const contentType = (f.type || "application/octet-stream").trim().toLowerCase();

  let kind: StudioAssetKind;
  let meta: Record<string, unknown>;
  try {
    kind = inferStudioAssetKind(
      contentType,
      typeof formData.get("kind") === "string" ? String(formData.get("kind")) : null,
    );
    assertStudioAssetAllowed(kind, contentType, f.size);
    meta = parseStudioAssetMeta(formData.get("meta"));
  } catch (error) {
    throw new StudioAssetValidationError(
      error instanceof Error ? error.message : "Invalid upload.",
    );
  }

  const bytes = new Uint8Array(await f.arrayBuffer());
  const contentSha256 = parseContentSha256(formData) ?? computeSha256Hex(bytes);

  const { data: existing, error: existingErr } = await supabase
    .from("studio_assets")
    .select(
      "id, public_url, storage_path, kind, content_type, original_filename, byte_size",
    )
    .eq("uploaded_by", user.id)
    .eq("content_sha256", contentSha256)
    .maybeSingle();

  if (existingErr) {
    const hint =
      /content_sha256|schema cache|does not exist/i.test(existingErr.message)
        ? " Apply migration web/supabase/migrations/071_studio_assets_content_sha256.sql."
        : "";
    throw new Error(`${existingErr.message}${hint}`);
  }
  if (existing) {
    const reused = rowToPublishResult(existing, f.size, true);
    return bridgeStudioPublishToMediaLibrary({
      supabase,
      user,
      bytes,
      contentSha256,
      contentType,
      kind,
      originalFilename: f.name.slice(0, 260) || sanitizeStudioFilename(f.name),
      meta,
      studioResult: reused,
    });
  }

  const assetId = crypto.randomUUID();
  const safe = sanitizeStudioFilename(f.name);
  const storagePath = `${user.id}/${assetId}/${safe}`;

  const { error: upErr } = await supabase.storage
    .from(STUDIO_MEDIA_BUCKET)
    .upload(storagePath, bytes, { contentType, upsert: false });
  if (upErr) {
    const hint =
      /bucket|not found|studio_media/i.test(upErr.message)
        ? " Apply migration web/supabase/migrations/069_studio_assets.sql."
        : "";
    throw new Error(`${upErr.message}${hint}`);
  }

  const { data: pub } = supabase.storage.from(STUDIO_MEDIA_BUCKET).getPublicUrl(storagePath);
  const publicUrl = pub.publicUrl;

  const { data: row, error: insErr } = await supabase
    .from("studio_assets")
    .insert({
      id: assetId,
      storage_path: storagePath,
      public_url: publicUrl,
      kind,
      content_type: contentType,
      original_filename: f.name.slice(0, 260) || safe,
      byte_size: f.size,
      uploaded_by: user.id,
      content_sha256: contentSha256,
      meta,
    })
    .select("id, public_url, storage_path, kind, content_type, original_filename, byte_size")
    .single();

  if (insErr || !row) {
    // Race: another upload with the same hash won — reuse that row.
    if (/duplicate|unique/i.test(insErr?.message ?? "")) {
      await supabase.storage.from(STUDIO_MEDIA_BUCKET).remove([storagePath]);
      const { data: raced } = await supabase
        .from("studio_assets")
        .select(
          "id, public_url, storage_path, kind, content_type, original_filename, byte_size",
        )
        .eq("uploaded_by", user.id)
        .eq("content_sha256", contentSha256)
        .maybeSingle();
      if (raced) {
        return bridgeStudioPublishToMediaLibrary({
          supabase,
          user,
          bytes,
          contentSha256,
          contentType,
          kind,
          originalFilename: f.name.slice(0, 260) || safe,
          meta,
          studioResult: rowToPublishResult(raced, f.size, true),
        });
      }
    }
    // Best-effort cleanup so failed catalog writes don't leave orphans.
    await supabase.storage.from(STUDIO_MEDIA_BUCKET).remove([storagePath]);
    const hint =
      /studio_assets|schema cache|does not exist/i.test(insErr?.message ?? "")
        ? " Apply migration web/supabase/migrations/069_studio_assets.sql."
        : /content_sha256/i.test(insErr?.message ?? "")
          ? " Apply migration web/supabase/migrations/071_studio_assets_content_sha256.sql."
          : "";
    throw new Error(`${insErr?.message ?? "Could not save studio asset."}${hint}`);
  }

  return bridgeStudioPublishToMediaLibrary({
    supabase,
    user,
    bytes,
    contentSha256,
    contentType,
    kind,
    originalFilename: f.name.slice(0, 260) || safe,
    meta,
    studioResult: rowToPublishResult(row, f.size, false),
  });
}
