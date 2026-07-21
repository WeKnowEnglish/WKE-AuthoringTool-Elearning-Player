import type { TeacherTier } from "@/lib/auth/roles";

export const CLASS_HUB_TABS = ["teach", "lesson", "students"] as const;

export type ClassHubTab = (typeof CLASS_HUB_TABS)[number];

const LIGHT_CLASS_HUB_TABS: readonly ClassHubTab[] = ["students"];

/** Tabs visible for a teacher tier. Light teachers only get Students & Homework. */
export function classHubTabsForTier(tier: TeacherTier): readonly ClassHubTab[] {
  return tier === "light" ? LIGHT_CLASS_HUB_TABS : CLASS_HUB_TABS;
}

export function defaultClassHubTab(tier: TeacherTier): ClassHubTab {
  return tier === "light" ? "students" : "teach";
}

export function parseClassHubTab(
  value: string | null | undefined,
  tier: TeacherTier = "plus",
): ClassHubTab {
  const allowed = classHubTabsForTier(tier);
  if (value === "lesson" || value === "students" || value === "teach") {
    if (allowed.includes(value)) return value;
  }
  return defaultClassHubTab(tier);
}

export function classHubTabHref(classId: string, tab: ClassHubTab, tier: TeacherTier = "plus"): string {
  const base = `/teacher/classes/${classId}`;
  const defaultTab = defaultClassHubTab(tier);
  return tab === defaultTab ? base : `${base}?tab=${tab}`;
}
