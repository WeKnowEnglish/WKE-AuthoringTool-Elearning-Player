import {
  PRIMARY_A2_ASSESSMENT_ID,
  PRIMARY_A2_ASSESSMENT_PILOT,
  buildPrimaryA2ReadingWritingOnly,
} from "@/lib/assessment/sample-primary-a2";
import {
  ACTIVITY_TRACK_DOCUMENT_VERSION,
  type ActivityTrackDocument,
} from "@/lib/activity-tracks/types";

export type AssessmentSeedPaper = "full" | "reading-writing";

function definitionForPaper(
  paper: AssessmentSeedPaper,
  title: string,
): ReturnType<typeof buildPrimaryA2ReadingWritingOnly> {
  if (paper === "full") {
    const definition = structuredClone(PRIMARY_A2_ASSESSMENT_PILOT);
    definition.title = title.trim() || definition.title;
    return definition;
  }
  return buildPrimaryA2ReadingWritingOnly({
    title: title.trim() || undefined,
  });
}

/**
 * Clone the Primary A2 (Flyers-shaped) assessment into an Assessment track draft.
 * Defaults to Reading & Writing only so class tests can ship without Listening/Speaking.
 */
export function seedAssessmentFromTemplate(input: {
  trackId: string;
  title: string;
  /** @default "reading-writing" */
  paper?: AssessmentSeedPaper;
}): ActivityTrackDocument {
  const paper = input.paper ?? "reading-writing";
  const definition = definitionForPaper(paper, input.title);
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
      contentVersion: definition.contentVersion,
      paper,
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
  const paper = doc.assessmentOrigin.paper ?? "reading-writing";
  const seeded = seedAssessmentFromTemplate({
    trackId: doc.id,
    title: doc.title,
    paper,
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
