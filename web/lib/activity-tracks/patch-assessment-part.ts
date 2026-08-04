import type {
  AssessmentDefinition,
  AssessmentPart,
} from "@/lib/assessment/types";

/** Immutable replace of one part inside an AssessmentDefinition. */
export function patchAssessmentDefinitionPart(
  definition: AssessmentDefinition,
  partId: string,
  nextPart: AssessmentPart,
): AssessmentDefinition {
  return {
    ...definition,
    sections: definition.sections.map((section) => ({
      ...section,
      parts: section.parts.map((part) =>
        part.id === partId ? nextPart : part,
      ),
    })),
  };
}

export function splitAssessmentCsv(value: string): string[] {
  return value
    .split(/[,|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
