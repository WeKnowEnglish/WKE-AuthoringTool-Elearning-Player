import type {
  AssessmentDefinition,
  AssessmentPart,
  AssessmentSection,
} from "@/lib/assessment/types";
import { normalizeAssessmentDefinition } from "@/lib/assessment/normalize-definition";

function parseAssessmentPart(raw: unknown): AssessmentPart | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.kind !== "string") return null;
  if (typeof row.title !== "string" || typeof row.instructions !== "string") return null;
  if (typeof row.partNumber !== "number") return null;
  if (!row.activity || typeof row.activity !== "object" || Array.isArray(row.activity)) {
    return null;
  }
  return raw as AssessmentPart;
}

function parseAssessmentSection(raw: unknown): AssessmentSection | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;
  if (typeof row.description !== "string") return null;
  if (!Array.isArray(row.parts)) return null;
  const parts = row.parts
    .map(parseAssessmentPart)
    .filter((part): part is AssessmentPart => Boolean(part));
  if (parts.length === 0) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    parts,
  };
}

/** Structural parse for frozen / draft AssessmentDefinition JSON. */
export function parseAssessmentDefinition(raw: unknown): AssessmentDefinition | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (row.schemaVersion !== 1) return null;
  if (typeof row.id !== "string" || typeof row.contentVersion !== "string") return null;
  if (typeof row.title !== "string" || typeof row.level !== "string") return null;
  if (typeof row.audience !== "string") return null;
  if (typeof row.estimatedMinutes !== "number") return null;
  if (!Array.isArray(row.sections)) return null;
  const sections = row.sections
    .map(parseAssessmentSection)
    .filter((section): section is AssessmentSection => Boolean(section));
  if (sections.length === 0) return null;
  return normalizeAssessmentDefinition({
    schemaVersion: 1,
    id: row.id,
    contentVersion: row.contentVersion,
    title: row.title,
    level: row.level,
    audience: row.audience,
    estimatedMinutes: row.estimatedMinutes,
    sections,
  });
}
