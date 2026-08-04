import type { ActivityTrackDocument } from "@/lib/activity-tracks/types";
import {
  assessmentProgress,
  PRIMARY_A2_ASSESSMENT_ID,
  type AssessmentDefinition,
} from "@/lib/assessment";
import { listAssessmentAssignIssues } from "@/lib/assessment/assign-readiness";
import { bumpAssessmentContentVersion } from "@/lib/assessment/bump-content-version";
import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import { parseAssessmentDefinition } from "@/lib/assessment/parse-definition";

/**
 * Clone the track's AssessmentDefinition for homework assign.
 * Syncs title, bumps contentVersion, and rejects packs with assign blockers.
 */
export function buildAssessmentTrackFreezeDocument(
  doc: ActivityTrackDocument,
): AssessmentDefinition {
  if (doc.mode !== "assessment" || !doc.assessmentDefinition) {
    throw new Error("Only Assessment tracks with a definition can be frozen.");
  }
  const definition = structuredClone(doc.assessmentDefinition);
  const title = doc.title.trim() || definition.title;
  definition.title = title;
  definition.contentVersion = bumpAssessmentContentVersion(
    definition.contentVersion,
  );
  const parsed = parseAssessmentDefinition(definition);
  if (!parsed) {
    throw new Error("Assessment definition failed validation before freeze.");
  }
  const issues = listAssessmentAssignIssues(parsed);
  if (issues.length > 0) {
    const preview = issues
      .slice(0, 3)
      .map((issue) => `${issue.partTitle}: ${issue.message}`)
      .join(" · ");
    const more =
      issues.length > 3 ? ` (+${issues.length - 3} more)` : "";
    throw new Error(`Fix before assign — ${preview}${more}`);
  }
  return parsed;
}

export function freezeAssessmentTrackHomeworkPayload(input: {
  document: ActivityTrackDocument;
}): Extract<ClassHomeworkPayload, { type: "primary_a2_assessment" }> {
  const definition = buildAssessmentTrackFreezeDocument(input.document);
  return {
    type: "primary_a2_assessment",
    definitionId: PRIMARY_A2_ASSESSMENT_ID,
    contentVersion: definition.contentVersion,
    title: definition.title,
    itemCount: assessmentProgress(definition, {}).total,
    frozenAt: new Date().toISOString(),
    document: definition as unknown as Record<string, unknown>,
    trackId: input.document.id,
  };
}
