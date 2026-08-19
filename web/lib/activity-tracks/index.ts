export type {
  ActivityTrackAssessmentOrigin,
  ActivityTrackDocument,
  ActivityTrackGradedOrigin,
  ActivityTrackLevel,
  ActivityTrackMode,
  ActivityTrackPart,
  ActivityTrackPartCatalogEntry,
  ActivityTrackPartKind,
  ActivityTrackPartSource,
} from "@/lib/activity-tracks/types";
export {
  ACTIVITY_TRACK_DOCUMENT_VERSION,
  ACTIVITY_TRACK_MODE_COPY,
  ACTIVITY_TRACK_PART_CATALOG,
  createEmptyActivityTrack,
  createEmptyPart,
  isPartKindAllowedForMode,
  partHasHomeworkContent,
  partHasTemplateContent,
  partLabelForKind,
  renumberParts,
} from "@/lib/activity-tracks/types";
export { seedPracticeComposition } from "@/lib/activity-tracks/seed-practice";
export {
  gradedPartKindsForOrigin,
  gradedSecondarySlotTaken,
  resetGradedPartsFromOrigin,
  seedBlankGradedCollection,
  seedGradedFromTemplate,
  seedGradedPartFromKind,
  summarizeTemplateSection,
  type GradedTemplateChoice,
} from "@/lib/activity-tracks/seed-graded";
export {
  resetAssessmentFromOrigin,
  seedAssessmentFromTemplate,
} from "@/lib/activity-tracks/seed-assessment";
export {
  patchAssessmentDefinitionPart,
  splitAssessmentCsv,
} from "@/lib/activity-tracks/patch-assessment-part";
export {
  deleteActivityTrackDraft,
  getActivityTrackDraft,
  listActivityTrackDrafts,
  saveActivityTrackDraft,
} from "@/lib/activity-tracks/draft-storage";
export {
  loadActivityTrackDraft,
  listActivityTrackDraftsWithSync,
  persistActivityTrackDraft,
  removeActivityTrackDraft,
  type ActivityTrackDraftSaveResult,
} from "@/lib/activity-tracks/draft-sync";
