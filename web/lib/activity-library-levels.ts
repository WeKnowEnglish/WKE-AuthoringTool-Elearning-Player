/** Canonical bands for grouping the activity library (display + sort order). */
export type ActivityLevelBand = "pre_a1" | "a1" | "a2" | "b1" | "other";

export type ActivityLevelSection = {
  band: ActivityLevelBand;
  /** Short label shown in section headers (e.g. p-A1, A1). */
  label: string;
};

/** Section order and titles for the library UI. */
export const ACTIVITY_LEVEL_SECTIONS: ActivityLevelSection[] = [
  { band: "pre_a1", label: "p-A1" },
  { band: "a1", label: "A1" },
  { band: "a2", label: "A2" },
  { band: "b1", label: "B1" },
  { band: "other", label: "Other levels" },
];

function squashLevel(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Map free-text `activity_library_items.level` to a display band.
 * Accepts common variants: pre-a1, p-a1, A1, beginner, etc.
 */
export function normalizeActivityLevelBand(level: string | null | undefined): ActivityLevelBand {
  const s = squashLevel(level ?? "");
  if (!s) return "other";

  const compact = s.replace(/[\s._-]+/g, "");

  if (/^(prea1|pa1)$/i.test(compact)) return "pre_a1";
  if (/^pre[\s_-]*a1$/i.test(s)) return "pre_a1";
  if (/^p[\s_-]*a1$/i.test(s)) return "pre_a1";

  if (s === "beginner" || s === "elementary") return "a1";
  if (s === "intermediate") return "b1";

  if (/\bb1\b/i.test(s)) return "b1";
  if (/\ba2\b/i.test(s)) return "a2";
  if (/\ba1\b/i.test(s)) return "a1";

  return "other";
}

export function groupItemsByActivityLevel<T extends { level?: string | null }>(
  items: T[],
): Map<ActivityLevelBand, T[]> {
  const map = new Map<ActivityLevelBand, T[]>();
  for (const sec of ACTIVITY_LEVEL_SECTIONS) {
    map.set(sec.band, []);
  }
  for (const item of items) {
    const band = normalizeActivityLevelBand(item.level ?? "");
    map.get(band)!.push(item);
  }
  return map;
}
