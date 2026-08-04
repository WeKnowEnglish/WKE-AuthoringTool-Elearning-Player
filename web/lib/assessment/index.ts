export * from "@/lib/assessment/types";
export * from "@/lib/assessment/progress";
export * from "@/lib/assessment/sample-primary-a2";
export { parseAssessmentDefinition } from "@/lib/assessment/parse-definition";
export {
  assessmentDefinitionNeedsNormalize,
  normalizeAssessmentDefinition,
  normalizeAssessmentPart,
} from "@/lib/assessment/normalize-definition";
export { bumpAssessmentContentVersion } from "@/lib/assessment/bump-content-version";
export {
  listAssessmentAssignIssues,
  type AssessmentAssignIssue,
} from "@/lib/assessment/assign-readiness";
export { shuffleAssessmentDisplay } from "@/lib/assessment/shuffle-display";
