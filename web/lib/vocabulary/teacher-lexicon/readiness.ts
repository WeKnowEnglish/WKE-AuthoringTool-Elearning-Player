import type { TeacherLexiconEntry } from "./types";

/** Light “ready for class” gate — no mastery binding yet. */
export function isTeacherLexiconReadyForClass(entry: TeacherLexiconEntry): boolean {
  if (entry.archivedAt || entry.status === "archived") return false;
  return entry.status === "ready";
}

/** Suggest marking ready when a short English meaning exists. */
export function teacherLexiconEnrichmentHints(entry: TeacherLexiconEntry): {
  hasDefinitionEn: boolean;
  hasDefinitionVi: boolean;
  hasTopic: boolean;
  suggestedReady: boolean;
} {
  const hasDefinitionEn = Boolean(entry.learnerDefinitionEn?.trim());
  const hasDefinitionVi = Boolean(entry.learnerMeaningVi?.trim());
  const hasTopic = Boolean(entry.primaryTopic?.trim());
  return {
    hasDefinitionEn,
    hasDefinitionVi,
    hasTopic,
    suggestedReady: hasDefinitionEn,
  };
}
