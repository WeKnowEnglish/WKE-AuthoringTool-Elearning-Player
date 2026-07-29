export const CLASSROOM_TABS = [
  "stream",
  "schedule",
  "noticeboard",
  "materials",
] as const;

export type ClassroomTabId = (typeof CLASSROOM_TABS)[number];

/** Tabs teachers can turn on/off for students. Stream is always on. */
export const OPTIONAL_CLASSROOM_TABS = [
  "schedule",
  "noticeboard",
  "materials",
] as const;

export type OptionalClassroomTabId = (typeof OPTIONAL_CLASSROOM_TABS)[number];

export const CLASSROOM_TAB_LABELS: Record<ClassroomTabId, string> = {
  stream: "Stream",
  schedule: "Schedule",
  noticeboard: "Noticeboard",
  materials: "Materials",
};

export type StudentClassroomTabSettings = {
  schedule: boolean;
  noticeboard: boolean;
  materials: boolean;
};

export const DEFAULT_STUDENT_CLASSROOM_TAB_SETTINGS: StudentClassroomTabSettings =
  {
    schedule: false,
    noticeboard: false,
    materials: false,
  };

export function normalizeStudentClassroomTabSettings(
  value: Partial<StudentClassroomTabSettings> | null | undefined,
): StudentClassroomTabSettings {
  return {
    schedule: Boolean(value?.schedule),
    noticeboard: Boolean(value?.noticeboard),
    materials: Boolean(value?.materials),
  };
}

export function visibleClassroomTabs(
  settings: StudentClassroomTabSettings = DEFAULT_STUDENT_CLASSROOM_TAB_SETTINGS,
): ClassroomTabId[] {
  return CLASSROOM_TABS.filter((tab) => {
    if (tab === "stream") return true;
    return settings[tab];
  });
}

export function parseClassroomTab(
  value: string | null | undefined,
  settings: StudentClassroomTabSettings = DEFAULT_STUDENT_CLASSROOM_TAB_SETTINGS,
): ClassroomTabId {
  if (value && (CLASSROOM_TABS as readonly string[]).includes(value)) {
    const tab = value as ClassroomTabId;
    if (tab === "stream" || settings[tab]) return tab;
  }
  return "stream";
}

export function isClassroomTabVisible(
  tab: ClassroomTabId,
  settings: StudentClassroomTabSettings = DEFAULT_STUDENT_CLASSROOM_TAB_SETTINGS,
): boolean {
  if (tab === "stream") return true;
  return settings[tab];
}
