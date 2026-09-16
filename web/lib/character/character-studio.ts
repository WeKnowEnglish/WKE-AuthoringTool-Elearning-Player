import type { CharacterCategory, CharacterStudioSource } from "./character-types";

/** Public folder for Shape Builder GLB part exports. */
export const STUDIO_PART_PUBLIC_ROOT = "/characters/parts";

/**
 * Shape Builder → student editor contract:
 *
 * 1. Author one wearable (hair, shirt, …) as a named group in Shape Builder.
 * 2. Keep Y-up. Origin can stay wherever you modeled it — the loader
 *    recenters the mesh and pins it to the body socket.
 * 3. Export GLB (named groups are preserved).
 * 4. Save as `web/public/characters/parts/{category}/{id}.glb`.
 * 5. Set `studio: studioPartSource(category, id, "Group Name")` on the
 *    matching registry row. Missing/invalid files fall back to the
 *    procedural recipe with the same id.
 *
 * Preferred group names: Hair, Face, Top, Bottom, Shoes, Accessory, Body.
 * Tint applies to every mesh in the group unless a mesh has
 * `userData.wkeTint === "none"` (for soles, lenses, clips).
 */
export function studioGlbSrc(category: CharacterCategory, id: string): string {
  return `${STUDIO_PART_PUBLIC_ROOT}/${category}/${id}.glb`;
}

export function studioPartSource(
  category: CharacterCategory,
  id: string,
  objectName?: string,
): CharacterStudioSource {
  return {
    kind: "glb",
    src: studioGlbSrc(category, id),
    objectName,
  };
}
