import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import {
  PRIMARY_A2_ASSESSMENT_PILOT,
  type AssessmentDefinition,
} from "@/lib/assessment";
import { parseAssessmentDefinition } from "@/lib/assessment/parse-definition";

export type PrimaryA2AssessmentPayload = Extract<
  ClassHomeworkPayload,
  { type: "primary_a2_assessment" }
>;

/**
 * Prefer an embedded Track Builder freeze; fall back to the in-repo fixture
 * for Class Hub pointer-only assigns.
 */
export function resolveHomeworkAssessmentDefinition(
  payload: PrimaryA2AssessmentPayload,
): AssessmentDefinition {
  if (payload.document) {
    const parsed = parseAssessmentDefinition(payload.document);
    if (parsed) return parsed;
  }
  return PRIMARY_A2_ASSESSMENT_PILOT;
}
