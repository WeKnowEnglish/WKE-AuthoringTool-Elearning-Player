const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)(\?|$)/i;
const IMAGE_KEY_HINT =
  /^(image|imageurl|image_url|picture|pictureurl|picture_url|src|url|cover|thumbnail|thumb|asseturl|asset_url)$/i;

function looksLikeHttpsImage(value: string): boolean {
  if (!value.startsWith("https://")) return false;
  if (value.length > 2000) return false;
  if (IMAGE_EXT.test(value)) return true;
  // studio_media / supabase public URLs often omit extensions in the path
  if (/\/storage\/v1\/object\/public\//i.test(value)) return true;
  if (/studio_media/i.test(value)) return true;
  return false;
}

/**
 * Walk frozen pack JSON and return the first https image URL suitable for a tile cover.
 */
export function extractCoverImageUrlFromPack(pack: unknown): string | null {
  const seen = new Set<object>();

  function walk(node: unknown, parentKey: string | null): string | null {
    if (typeof node === "string") {
      if (looksLikeHttpsImage(node)) return node;
      if (parentKey && IMAGE_KEY_HINT.test(parentKey) && node.startsWith("https://")) {
        return node;
      }
      return null;
    }
    if (!node || typeof node !== "object") return null;
    if (seen.has(node as object)) return null;
    seen.add(node as object);

    if (Array.isArray(node)) {
      for (const child of node) {
        const hit = walk(child, parentKey);
        if (hit) return hit;
      }
      return null;
    }

    const record = node as Record<string, unknown>;
    // Prefer known image keys first
    for (const [key, value] of Object.entries(record)) {
      if (IMAGE_KEY_HINT.test(key) && typeof value === "string") {
        const hit = walk(value, key);
        if (hit) return hit;
      }
    }
    for (const [key, value] of Object.entries(record)) {
      if (IMAGE_KEY_HINT.test(key)) continue;
      const hit = walk(value, key);
      if (hit) return hit;
    }
    return null;
  }

  return walk(pack, null);
}
