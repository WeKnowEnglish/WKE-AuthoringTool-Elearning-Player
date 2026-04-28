import type { LessonRow, ModuleRow } from "@/lib/data/catalog";

export function modulesSorted(modules: ModuleRow[]) {
  return [...modules].sort((a, b) => a.order_index - b.order_index);
}

export function isModuleUnlocked(
  module: ModuleRow,
  allModules: ModuleRow[],
  allLessons: LessonRow[],
  completedLessonIds: string[],
): boolean {
  if (module.unlock_strategy === "always_open") return true;
  if (module.unlock_strategy === "manual") return module.manual_unlocked === true;

  const sameCourse = allModules.filter((m) => m.course_id === module.course_id);
  if (sameCourse.length === 0) return true;

  const sorted = modulesSorted(sameCourse);
  const idx = sorted.findIndex((m) => m.id === module.id);
  if (idx <= 0) return true;
  const prev = sorted[idx - 1];
  const prevLessons = allLessons.filter((l) => l.module_id === prev.id);
  if (prevLessons.length === 0) return true;
  return prevLessons.every((l) => completedLessonIds.includes(l.id));
}

export function lessonsForModule(lessons: LessonRow[], moduleId: string) {
  return lessons
    .filter((l) => l.module_id === moduleId)
    .sort((a, b) => a.order_index - b.order_index);
}
