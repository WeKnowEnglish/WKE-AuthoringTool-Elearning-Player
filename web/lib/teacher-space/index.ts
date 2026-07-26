export type {
  PublicTeacherSpacePage,
  TeacherSpaceFormat,
  TeacherSpaceItemDetail,
  TeacherSpaceItemSummary,
  TeacherSpaceRow,
  TeacherSpaceSummary,
} from "@/lib/teacher-space/types";
export {
  assertValidTeacherSpaceHandle,
  normalizeTeacherSpaceHandle,
  suggestHandleFromEmail,
  RESERVED_TEACHER_SPACE_HANDLES,
} from "@/lib/teacher-space/handle";
export {
  teacherSpacePlayPath,
  teacherSpacePublicPath,
  teacherSpaceSettingsPath,
} from "@/lib/teacher-space/paths";
export { freezeStudioPackForSpace } from "@/lib/teacher-space/freeze";
export { extractCoverImageUrlFromPack } from "@/lib/teacher-space/extract-cover";
export {
  CLASSROOM_THEME_IDS,
  CLASSROOM_THEMES,
  classroomThemeStyle,
  isClassroomThemeId,
  resolveClassroomTheme,
  type ClassroomTheme,
  type ClassroomThemeId,
} from "@/lib/teacher-space/themes";
