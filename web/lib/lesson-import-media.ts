/**
 * Track A: optional `media_bindings` on lesson screen import maps
 * `media_assets.id` (UUID) → `public_url` into story/start/interaction payloads
 * before Zod validation and DB insert.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type LessonImportScreenMediaBindings = {
  /** Optional root story/start image (and optional legacy story video). */
  root?: {
    image_url?: string;
    video_url?: string;
  };
  /** Story page id → background (or page-level video). */
  pages?: Record<
    string,
    {
      background_image_url?: string;
      video_url?: string;
    }
  >;
  /** Story item id (any page) → media asset UUID for `image_url`. */
  items?: Record<string, string>;
  /** Cast entry id → media asset UUID for default `cast[].image_url`. */
  cast?: Record<string, string>;
};

function isUuid(s: string): boolean {
  return typeof s === "string" && UUID_RE.test(s.trim());
}

function assertUuid(value: string, context: string): string {
  const t = value.trim();
  if (!isUuid(t)) {
    throw new Error(
      `media_bindings: ${context} must be a media_assets UUID, got "${value.slice(0, 48)}${value.length > 48 ? "…" : ""}"`,
    );
  }
  return t;
}

/** Collect every media_assets id referenced in bindings (deduped). */
export function collectMediaBindingAssetIds(
  bindingsRoot: unknown,
): { screenIndex: number; bindings: LessonImportScreenMediaBindings }[] {
  if (bindingsRoot == null) return [];
  if (typeof bindingsRoot !== "object" || Array.isArray(bindingsRoot)) {
    throw new Error('media_bindings must be a JSON object keyed by screen index, e.g. { "0": { ... } }');
  }
  const out: { screenIndex: number; bindings: LessonImportScreenMediaBindings }[] = [];
  for (const [k, v] of Object.entries(bindingsRoot as Record<string, unknown>)) {
    if (!/^\d+$/.test(k)) {
      throw new Error(`media_bindings: invalid screen key "${k}" (use "0", "1", … matching screens[] order)`);
    }
    const screenIndex = Number(k);
    if (v == null) continue;
    if (typeof v !== "object" || Array.isArray(v)) {
      throw new Error(`media_bindings[${k}] must be an object`);
    }
    const b = v as Record<string, unknown>;
    const slot: LessonImportScreenMediaBindings = {};
    if (b.root != null) {
      if (typeof b.root !== "object" || Array.isArray(b.root)) {
        throw new Error(`media_bindings[${k}].root must be an object`);
      }
      const r = b.root as Record<string, unknown>;
      slot.root = {};
      if (r.image_url != null) {
        if (typeof r.image_url !== "string") throw new Error(`media_bindings[${k}].root.image_url must be a string`);
        slot.root.image_url = assertUuid(r.image_url, `screens[${k}].root.image_url`);
      }
      if (r.video_url != null) {
        if (typeof r.video_url !== "string") throw new Error(`media_bindings[${k}].root.video_url must be a string`);
        slot.root.video_url = assertUuid(r.video_url, `screens[${k}].root.video_url`);
      }
      if (Object.keys(slot.root).length === 0) delete slot.root;
    }
    if (b.pages != null) {
      if (typeof b.pages !== "object" || Array.isArray(b.pages)) {
        throw new Error(`media_bindings[${k}].pages must be an object keyed by page id`);
      }
      slot.pages = {};
      for (const [pageId, pageSlot] of Object.entries(b.pages as Record<string, unknown>)) {
        if (pageSlot == null) continue;
        if (typeof pageSlot !== "object" || Array.isArray(pageSlot)) {
          throw new Error(`media_bindings[${k}].pages["${pageId}"] must be an object`);
        }
        const p = pageSlot as Record<string, unknown>;
        const ps: NonNullable<LessonImportScreenMediaBindings["pages"]>[string] = {};
        if (p.background_image_url != null) {
          if (typeof p.background_image_url !== "string") {
            throw new Error(`media_bindings[${k}].pages["${pageId}"].background_image_url must be a string`);
          }
          ps.background_image_url = assertUuid(
            p.background_image_url,
            `screens[${k}].pages["${pageId}"].background_image_url`,
          );
        }
        if (p.video_url != null) {
          if (typeof p.video_url !== "string") {
            throw new Error(`media_bindings[${k}].pages["${pageId}"].video_url must be a string`);
          }
          ps.video_url = assertUuid(p.video_url, `screens[${k}].pages["${pageId}"].video_url`);
        }
        if (Object.keys(ps).length > 0) slot.pages[pageId] = ps;
      }
      if (Object.keys(slot.pages).length === 0) delete slot.pages;
    }
    if (b.items != null) {
      if (typeof b.items !== "object" || Array.isArray(b.items)) {
        throw new Error(`media_bindings[${k}].items must be an object keyed by story item id`);
      }
      slot.items = {};
      for (const [itemId, assetId] of Object.entries(b.items as Record<string, unknown>)) {
        if (assetId == null) continue;
        if (typeof assetId !== "string") {
          throw new Error(`media_bindings[${k}].items["${itemId}"] must be a string (media_assets UUID)`);
        }
        slot.items[itemId] = assertUuid(assetId, `screens[${k}].items["${itemId}"]`);
      }
      if (Object.keys(slot.items).length === 0) delete slot.items;
    }
    if (b.cast != null) {
      if (typeof b.cast !== "object" || Array.isArray(b.cast)) {
        throw new Error(`media_bindings[${k}].cast must be an object keyed by cast entry id`);
      }
      slot.cast = {};
      for (const [castId, assetId] of Object.entries(b.cast as Record<string, unknown>)) {
        if (assetId == null) continue;
        if (typeof assetId !== "string") {
          throw new Error(`media_bindings[${k}].cast["${castId}"] must be a string (media_assets UUID)`);
        }
        slot.cast[castId] = assertUuid(assetId, `screens[${k}].cast["${castId}"]`);
      }
      if (Object.keys(slot.cast).length === 0) delete slot.cast;
    }
    if (slot.root || slot.pages || slot.items || slot.cast) {
      out.push({ screenIndex, bindings: slot });
    }
  }
  return out.sort((a, b) => a.screenIndex - b.screenIndex);
}

export function gatherAllBindingUuids(
  structured: { screenIndex: number; bindings: LessonImportScreenMediaBindings }[],
): string[] {
  const ids = new Set<string>();
  for (const { bindings: b } of structured) {
    if (b.root?.image_url) ids.add(b.root.image_url);
    if (b.root?.video_url) ids.add(b.root.video_url);
    for (const p of Object.values(b.pages ?? {})) {
      if (p.background_image_url) ids.add(p.background_image_url);
      if (p.video_url) ids.add(p.video_url);
    }
    for (const u of Object.values(b.items ?? {})) {
      ids.add(u);
    }
    for (const u of Object.values(b.cast ?? {})) {
      ids.add(u);
    }
  }
  return [...ids];
}

export async function fetchMediaPublicUrlsByIds(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from("media_assets")
    .select("id, public_url")
    .in("id", ids);
  if (error) throw new Error(`media library lookup failed: ${error.message}`);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const id = row.id as string;
    const url = (row.public_url as string)?.trim();
    if (id && url) map.set(id, url);
  }
  const missing = ids.filter((id) => !map.has(id));
  if (missing.length > 0) {
    throw new Error(
      `media_bindings: unknown or inaccessible media_assets id(s): ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? ", …" : ""}`,
    );
  }
  return map;
}

function applyUrl(
  urlById: Map<string, string>,
  assetId: string | undefined,
  label: string,
): string {
  if (!assetId) return "";
  const url = urlById.get(assetId);
  if (!url?.trim()) {
    throw new Error(`media_bindings: internal error, missing URL for asset ${assetId} (${label})`);
  }
  return url.trim();
}

/**
 * Mutates `payload` in place for the given screen bindings and resolved URLs.
 */
/** Reject story-only slots on start/interaction screens (catch authoring mistakes early). */
export function assertBindingsMatchScreenType(
  screenType: string,
  bindings: LessonImportScreenMediaBindings,
  screenIndex: number,
): void {
  if (screenType === "story") return;
  if (bindings.pages && Object.keys(bindings.pages).length > 0) {
    throw new Error(
      `media_bindings[${screenIndex}]: "pages" is only valid when screens[${screenIndex}].screen_type is "story".`,
    );
  }
  if (bindings.items && Object.keys(bindings.items).length > 0) {
    throw new Error(
      `media_bindings[${screenIndex}]: "items" is only valid when screens[${screenIndex}].screen_type is "story".`,
    );
  }
  if (bindings.cast && Object.keys(bindings.cast).length > 0) {
    throw new Error(
      `media_bindings[${screenIndex}]: "cast" is only valid when screens[${screenIndex}].screen_type is "story".`,
    );
  }
  if (bindings.root?.video_url && screenType !== "story") {
    throw new Error(
      `media_bindings[${screenIndex}]: root.video_url is only supported for story screens.`,
    );
  }
}

export function applyMediaBindingsToPayload(
  screenType: string,
  payload: Record<string, unknown>,
  bindings: LessonImportScreenMediaBindings,
  urlById: Map<string, string>,
): void {
  if (screenType === "start") {
    if (bindings.root?.image_url) {
      payload.image_url = applyUrl(urlById, bindings.root.image_url, "start.image_url");
    }
    return;
  }

  if (screenType === "interaction") {
    if (bindings.root?.image_url) {
      payload.image_url = applyUrl(urlById, bindings.root.image_url, "interaction.image_url");
    }
    return;
  }

  if (screenType !== "story") return;

  const pages = payload.pages;
  if (bindings.pages && Object.keys(bindings.pages).length > 0) {
    if (!Array.isArray(pages) || pages.length === 0) {
      throw new Error(
        'media_bindings: story "pages" slots require a non-empty payload.pages array on that screen.',
      );
    }
  }
  if (bindings.items && Object.keys(bindings.items).length > 0) {
    if (!Array.isArray(pages) || pages.length === 0) {
      throw new Error(
        'media_bindings: story "items" slots require a non-empty payload.pages array on that screen.',
      );
    }
  }

  if (bindings.root?.image_url) {
    payload.image_url = applyUrl(urlById, bindings.root.image_url, "story.image_url");
  }
  if (bindings.root?.video_url) {
    payload.video_url = applyUrl(urlById, bindings.root.video_url, "story.video_url");
  }

  if (bindings.pages && Array.isArray(pages)) {
    const pageById = new Map<string, Record<string, unknown>>();
    for (const pg of pages) {
      if (pg && typeof pg === "object" && !Array.isArray(pg) && typeof (pg as { id?: unknown }).id === "string") {
        pageById.set((pg as { id: string }).id, pg as Record<string, unknown>);
      }
    }
    for (const [pageId, slot] of Object.entries(bindings.pages)) {
      const page = pageById.get(pageId);
      if (!page) {
        throw new Error(
          `media_bindings: story page id "${pageId}" not found on this story screen (check pages[].id).`,
        );
      }
      if (slot.background_image_url) {
        page.background_image_url = applyUrl(
          urlById,
          slot.background_image_url,
          `story page ${pageId} background_image_url`,
        );
      }
      if (slot.video_url) {
        page.video_url = applyUrl(urlById, slot.video_url, `story page ${pageId} video_url`);
      }
    }
  }

  if (bindings.items && Array.isArray(pages)) {
    const appliedItemIds = new Set<string>();
    for (const pg of pages) {
      if (!pg || typeof pg !== "object" || Array.isArray(pg)) continue;
      const items = (pg as { items?: unknown }).items;
      if (!Array.isArray(items)) continue;
      for (const it of items) {
        if (!it || typeof it !== "object" || Array.isArray(it)) continue;
        const row = it as { id?: unknown; kind?: unknown };
        if (typeof row.id !== "string") continue;
        const assetId = bindings.items[row.id];
        if (!assetId) continue;
        const kind = (row.kind as string | undefined) ?? "image";
        if (kind !== "image") {
          throw new Error(
            `media_bindings: item "${row.id}" is kind "${kind}" — image bindings apply only to image items.`,
          );
        }
        (it as { image_url: string }).image_url = applyUrl(urlById, assetId, `story item ${row.id}`);
        appliedItemIds.add(row.id);
      }
    }
    for (const itemId of Object.keys(bindings.items)) {
      if (!appliedItemIds.has(itemId)) {
        throw new Error(
          `media_bindings: story item id "${itemId}" was not found as an image item on any page in this story screen.`,
        );
      }
    }
  }

  if (bindings.cast && Object.keys(bindings.cast).length > 0) {
    const castArr = payload.cast;
    if (!Array.isArray(castArr) || castArr.length === 0) {
      throw new Error(
        'media_bindings: story "cast" slots require a non-empty payload.cast array on that screen.',
      );
    }
    const appliedCastIds = new Set<string>();
    for (const row of castArr) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const c = row as { id?: unknown };
      if (typeof c.id !== "string") continue;
      const assetId = bindings.cast[c.id];
      if (!assetId) continue;
      (row as { image_url: string }).image_url = applyUrl(urlById, assetId, `cast entry ${c.id}`);
      appliedCastIds.add(c.id);
    }
    for (const castId of Object.keys(bindings.cast)) {
      if (!appliedCastIds.has(castId)) {
        throw new Error(
          `media_bindings: cast id "${castId}" was not found in payload.cast on this story screen.`,
        );
      }
    }
  }
}

function pageBackgroundNeedsLibraryFallback(url: unknown): boolean {
  if (url == null) return true;
  const s = String(url).trim();
  if (s === "") return true;
  const lo = s.toLowerCase();
  return lo.includes("placehold.co") || lo.includes("via.placeholder");
}

/**
 * When a story page has no `media_bindings.pages[pageId].background_image_url` slot and the current
 * URL is empty or a placeholder, set `background_image_url` from the newest library asset whose
 * `meta_tags` includes `background`.
 */
export async function fillUnmappedStoryPageBackgrounds(
  supabase: SupabaseClient,
  storyPayload: Record<string, unknown>,
  bindings: LessonImportScreenMediaBindings | undefined,
): Promise<void> {
  const pages = storyPayload.pages;
  if (!Array.isArray(pages) || pages.length === 0) return;
  const boundBg = new Set<string>();
  for (const pid of Object.keys(bindings?.pages ?? {})) {
    if (bindings!.pages![pid]?.background_image_url) boundBg.add(pid);
  }
  let fallbackUrl: string | null | undefined;
  for (const pg of pages) {
    if (!pg || typeof pg !== "object" || Array.isArray(pg)) continue;
    const page = pg as { id?: unknown; background_image_url?: unknown };
    if (typeof page.id !== "string") continue;
    if (boundBg.has(page.id)) continue;
    if (!pageBackgroundNeedsLibraryFallback(page.background_image_url)) continue;
    if (fallbackUrl === undefined) {
      fallbackUrl = await fetchFirstBackgroundTaggedPublicUrl(supabase);
    }
    if (fallbackUrl) {
      page.background_image_url = fallbackUrl;
    }
  }
}

async function fetchFirstBackgroundTaggedPublicUrl(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase
    .from("media_assets")
    .select("public_url")
    .contains("meta_tags", ["background"])
    .not("public_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const u = (data as { public_url?: string | null }).public_url?.trim();
  return u || null;
}
