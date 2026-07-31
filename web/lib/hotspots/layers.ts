import type { HotspotElement } from "@/lib/hotspots/types";

export type LayerReorderDirection = "forward" | "backward" | "front" | "back";

/** Effective stack index; missing values fall back to tabOrder then list index. */
export function effectiveZIndex(hotspot: HotspotElement, index: number): number {
  if (typeof hotspot.zIndex === "number" && Number.isFinite(hotspot.zIndex)) {
    return hotspot.zIndex;
  }
  if (typeof hotspot.tabOrder === "number" && Number.isFinite(hotspot.tabOrder)) {
    return hotspot.tabOrder;
  }
  return index;
}

/** Ascending = back → front (paint order). */
export function sortHotspotsBackToFront(hotspots: HotspotElement[]): HotspotElement[] {
  return [...hotspots]
    .map((hotspot, index) => ({ hotspot, index, z: effectiveZIndex(hotspot, index) }))
    .sort((a, b) => a.z - b.z || a.index - b.index)
    .map((entry) => entry.hotspot);
}

/** Descending = front → back (tray left = front). */
export function sortHotspotsFrontToBack(hotspots: HotspotElement[]): HotspotElement[] {
  return sortHotspotsBackToFront(hotspots).reverse();
}

export function nextZIndex(hotspots: HotspotElement[]): number {
  if (hotspots.length === 0) return 0;
  let max = -1;
  hotspots.forEach((hotspot, index) => {
    max = Math.max(max, effectiveZIndex(hotspot, index));
  });
  return max + 1;
}

/**
 * Swap / bump zIndex so `id` moves in the stack.
 * forward = toward front (higher z), backward = toward back (lower z).
 * Returns a map of id → new zIndex for every hotspot that changed (renormalized 0..n-1).
 */
export function reorderZIndex(
  hotspots: HotspotElement[],
  id: string,
  direction: LayerReorderDirection,
): Record<string, number> | null {
  const ordered = sortHotspotsBackToFront(hotspots);
  const from = ordered.findIndex((hotspot) => hotspot.id === id);
  if (from < 0) return null;

  let to = from;
  if (direction === "forward") to = Math.min(ordered.length - 1, from + 1);
  else if (direction === "backward") to = Math.max(0, from - 1);
  else if (direction === "front") to = ordered.length - 1;
  else to = 0;

  if (to === from) return null;

  const next = [...ordered];
  const [moved] = next.splice(from, 1);
  if (!moved) return null;
  next.splice(to, 0, moved);

  const updates: Record<string, number> = {};
  next.forEach((hotspot, index) => {
    if (hotspot.zIndex !== index) updates[hotspot.id] = index;
  });
  return Object.keys(updates).length > 0 ? updates : null;
}
