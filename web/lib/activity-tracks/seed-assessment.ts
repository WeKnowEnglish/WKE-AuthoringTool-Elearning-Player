import {
  PRIMARY_A2_ASSESSMENT_ID,
  PRIMARY_A2_ASSESSMENT_PILOT,
} from "@/lib/assessment/sample-primary-a2";
import {
  ACTIVITY_TRACK_DOCUMENT_VERSION,
  type ActivityTrackDocument,
} from "@/lib/activity-tracks/types";

/** Clone the Primary A2 (Flyers-shaped) assessment into an Assessment track draft. */
export function seedAssessmentFromTemplate(input: {
  trackId: string;
  title: string;
}): ActivityTrackDocument {
  const definition = structuredClone(PRIMARY_A2_ASSESSMENT_PILOT);
  const title = input.title.trim() || definition.title;
  definition.title = title;
  const now = new Date().toISOString();

  return {
    version: ACTIVITY_TRACK_DOCUMENT_VERSION,
    id: input.trackId,
    mode: "assessment",
    title,
    instructions: definition.audience,
    level: "primary",
    estimatedMinutes: definition.estimatedMinutes,
    vocabListId: null,
    parts: [],
    practiceComposition: null,
    gradedOrigin: null,
    assessmentDefinition: definition,
    assessmentOrigin: {
      definitionId: PRIMARY_A2_ASSESSMENT_ID,
      contentVersion: PRIMARY_A2_ASSESSMENT_PILOT.contentVersion,
    },
    libraryId: null,
    bankActivityId: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Re-clone the origin fixture into an existing assessment draft (keeps track id/title). */
export function resetAssessmentFromOrigin(
  doc: ActivityTrackDocument,
): ActivityTrackDocument {
  if (doc.mode !== "assessment" || !doc.assessmentOrigin) return doc;
  const seeded = seedAssessmentFromTemplate({
    trackId: doc.id,
    title: doc.title,
  });
  return {
    ...doc,
    instructions: seeded.instructions,
    level: seeded.level,
    estimatedMinutes: seeded.estimatedMinutes,
    assessmentDefinition: seeded.assessmentDefinition,
    assessmentOrigin: seeded.assessmentOrigin,
    parts: [],
    practiceComposition: null,
    gradedOrigin: null,
  };
}
