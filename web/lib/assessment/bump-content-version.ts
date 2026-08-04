/**
 * Bump AssessmentDefinition.contentVersion so student progress keys
 * (`id:contentVersion`) don't collide after teacher edits + re-assign.
 */
export function bumpAssessmentContentVersion(current: string): string {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const base = current
    .replace(/\.edit-\d+(-\d+)?$/, "")
    .replace(/\.edit-\d{4}-\d{2}-\d{2}T[\d-]+$/, "")
    .trim();
  return `${base || "assessment"}.edit-${stamp}`;
}
