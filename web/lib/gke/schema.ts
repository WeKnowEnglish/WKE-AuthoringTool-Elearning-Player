import { z } from "zod";
import { LEARNING_STRAND_IDS } from "@/lib/learning-strands";
import {
  isConceptEdgeId,
  isConceptPrecursorId,
  isErrorCode,
  isGrammarL1Id,
  isGrammarL2Id,
  isGrammarL3Id,
  isGrammarL4Id,
  isValidL4ChildId,
  parseErrorCode,
} from "./id-patterns";

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const cefrLevelSchema = z.enum(["A1", "A2", "B1"]);
export const yleLevelSchema = z.enum(["starters", "movers", "flyers"]);
export const learningStrandIdSchema = z.enum(LEARNING_STRAND_IDS);
export const evidenceModeSchema = z.enum([
  "recognition",
  "recall",
  "production",
  "transfer",
]);
export const publishStatusSchema = z.enum([
  "published",
  "draft",
  "stub",
  "preview",
  "optional",
]);
export const errorSeveritySchema = z.enum(["low", "medium", "high"]);

export const localizedLabelSchema = z
  .object({
    teacher: z.string().min(1).max(120),
    student: z.string().min(1).max(80),
  })
  .strict();

export const standardsRefStubSchema = z
  .object({
    source: z.string().min(1).optional(),
    area: z.string().min(1).optional(),
    note: z.string().min(1).optional(),
  })
  .strict();

export const posterCardRefSchema = z
  .object({
    slug: z.string().regex(slugPattern),
    cardIndex: z.number().int().min(0).max(9),
  })
  .strict();

export const grammarL2IdSchema = z
  .string()
  .refine(isGrammarL2Id, "Must be a grammar L2 ID (grammar.<l1>.<l2>)");

export const grammarL3IdSchema = z
  .string()
  .refine(isGrammarL3Id, "Must be a grammar L3 concept ID");

export const grammarL4IdSchema = z
  .string()
  .refine(isGrammarL4Id, "Must be a grammar L4 micro-skill ID");

export const conceptPrecursorIdSchema = z
  .string()
  .refine(isConceptPrecursorId, "Must be domain_entry or a grammar L3 concept ID");

export const conceptEdgeIdSchema = z
  .string()
  .refine(isConceptEdgeId, "Must be a grammar L3 or L4 ID");

export const errorCodeSchema = z
  .string()
  .refine(isErrorCode, "Must match error.<family>.<specific>");

function addIssue(
  ctx: z.RefinementCtx,
  message: string,
  path: (string | number)[],
): void {
  ctx.addIssue({ code: "custom", message, path });
}

export const conceptRecordSchema = z
  .object({
    id: grammarL3IdSchema,
    level: z.literal(3),
    parentId: grammarL2IdSchema,
    label: localizedLabelSchema,
    function: z.string().min(1).max(120),
    cefr: z.array(cefrLevelSchema).min(1),
    yle: z.array(yleLevelSchema).min(1).optional(),
    strands: z.array(learningStrandIdSchema).min(1),
    teachOrder: z.number().int().min(1).max(99),
    posterSlug: z.string().regex(slugPattern).optional(),
    precursorIds: z.array(conceptPrecursorIdSchema),
    successorIds: z.array(grammarL3IdSchema),
    contrastIds: z.array(conceptEdgeIdSchema),
    status: publishStatusSchema,
    standardsRef: standardsRefStubSchema.optional(),
    notes: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((record, ctx) => {
    if (!record.id.startsWith(`${record.parentId}.`)) {
      addIssue(ctx, "id must start with parentId + '.'", ["id"]);
    }

    if (record.status === "published" && !record.posterSlug) {
      addIssue(ctx, "posterSlug is required when status is published", ["posterSlug"]);
    }

    if (record.precursorIds.includes(record.id)) {
      addIssue(ctx, "precursorIds must not include self", ["precursorIds"]);
    }
    if (record.successorIds.includes(record.id)) {
      addIssue(ctx, "successorIds must not include self", ["successorIds"]);
    }
    if (record.contrastIds.includes(record.id)) {
      addIssue(ctx, "contrastIds must not include self", ["contrastIds"]);
    }
  });

export const microSkillRecordSchema = z
  .object({
    id: grammarL4IdSchema,
    level: z.literal(4),
    parentConceptId: grammarL3IdSchema,
    label: localizedLabelSchema,
    l5Descriptor: z.string().min(1).max(200),
    posterCardRef: posterCardRefSchema.optional(),
    evidenceModes: z.array(evidenceModeSchema).min(1),
    errorCodes: z.array(errorCodeSchema).optional(),
    tags: z.array(z.string().min(1)).optional(),
    status: publishStatusSchema,
    standardsRef: standardsRefStubSchema.optional(),
    notes: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((record, ctx) => {
    if (!isValidL4ChildId(record.id, record.parentConceptId)) {
      addIssue(
        ctx,
        "id must be parentConceptId + '.' + single L4 segment",
        ["id"],
      );
    }

    if (record.status === "published" && !record.posterCardRef) {
      addIssue(ctx, "posterCardRef is required when status is published", ["posterCardRef"]);
    }
  });

export const errorRecordSchema = z
  .object({
    id: errorCodeSchema,
    family: z.string().min(1),
    label: z.string().min(1).max(80),
    wrongExample: z.string().min(1).optional(),
    correctExample: z.string().min(1).optional(),
    relatedL4Ids: z.array(grammarL4IdSchema).min(1),
    severity: errorSeveritySchema.optional(),
    notes: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((record, ctx) => {
    const parsed = parseErrorCode(record.id);
    if (!parsed) {
      addIssue(ctx, "id must be a valid error code", ["id"]);
      return;
    }
    if (record.family !== parsed.family) {
      addIssue(ctx, "family must match the middle segment of id", ["family"]);
    }
  });

export const gkeDateSchema = z.string().regex(isoDatePattern, "Must be YYYY-MM-DD");

export const gkeRecordsEnvelopeSchema = <T extends z.ZodTypeAny>(recordSchema: T) =>
  z
    .object({
      schemaVersion: z.literal(1),
      generatedAt: gkeDateSchema,
      records: z.array(recordSchema),
    })
    .strict();

export const conceptsExportSchema = gkeRecordsEnvelopeSchema(conceptRecordSchema);
export const microSkillsExportSchema = gkeRecordsEnvelopeSchema(microSkillRecordSchema);
export const errorsExportSchema = gkeRecordsEnvelopeSchema(errorRecordSchema);

export const domainSystemNodeSchema = z
  .object({
    id: grammarL2IdSchema,
    level: z.literal(2),
    label: localizedLabelSchema,
    status: publishStatusSchema,
    notes: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((record, ctx) => {
    const l1Prefix = record.id.split(".").slice(0, 2).join(".");
    if (!record.id.startsWith(`${l1Prefix}.`)) {
      addIssue(ctx, "L2 id must extend its L1 domain prefix", ["id"]);
    }
  });

export const domainNodeSchema = z
  .object({
    id: z.string().refine(isGrammarL1Id, "Must be grammar.<l1> for L1 domain"),
    level: z.literal(1),
    label: localizedLabelSchema,
    cefrSpan: z.array(cefrLevelSchema).min(1),
    status: publishStatusSchema,
    systems: z.array(domainSystemNodeSchema),
    notes: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((record, ctx) => {
    for (const system of record.systems) {
      if (!system.id.startsWith(`${record.id}.`)) {
        addIssue(ctx, `system ${system.id} must be under domain ${record.id}`, ["systems"]);
      }
    }
  });

export const domainsIndexSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: gkeDateSchema,
    domains: z.array(domainNodeSchema),
  })
  .strict();

export type LocalizedLabel = z.infer<typeof localizedLabelSchema>;
export type ConceptRecord = z.infer<typeof conceptRecordSchema>;
export type MicroSkillRecord = z.infer<typeof microSkillRecordSchema>;
export type ErrorRecord = z.infer<typeof errorRecordSchema>;
export type DomainSystemNode = z.infer<typeof domainSystemNodeSchema>;
export type DomainNode = z.infer<typeof domainNodeSchema>;
export type ConceptsExport = z.infer<typeof conceptsExportSchema>;
export type MicroSkillsExport = z.infer<typeof microSkillsExportSchema>;
export type ErrorsExport = z.infer<typeof errorsExportSchema>;
export type DomainsIndex = z.infer<typeof domainsIndexSchema>;
