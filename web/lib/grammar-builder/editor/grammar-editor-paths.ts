export const GRAMMAR_TEACHER_EDITOR_INDEX_PATH = "/teacher/grammar";

export function grammarTeacherEditorSlugPath(slug: string): string {
  return `${GRAMMAR_TEACHER_EDITOR_INDEX_PATH}/${slug}`;
}
