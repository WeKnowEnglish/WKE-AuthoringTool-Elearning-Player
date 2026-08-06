import { z } from "zod";

export const speakingReportStatusSchema = z.enum([
  "draft",
  "ready_for_review",
  "approved",
  "discarded",
]);

export type SpeakingReportStatus = z.infer<typeof speakingReportStatusSchema>;

const shortText = z.string().trim().min(1).max(240);
const narrativeText = z.string().trim().min(1).max(4000);

export const speakingReportStudentNoteSchema = z.object({
  studentId: z.string().trim().min(1).max(80).nullable(),
  displayName: shortText,
  matchedInTranscript: z.boolean(),
  mentionCount: z.number().int().min(0).max(10_000),
  participation: z.enum(["not_heard", "brief", "active", "strong"]),
  note: narrativeText,
  evidenceQuotes: z.array(z.string().trim().min(1).max(280)).max(4),
});

export const speakingReportSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  sessionTitle: shortText,
  classTitle: shortText.nullable(),
  generatedLabel: shortText,
  classSummary: narrativeText,
  keyMoments: z
    .array(
      z.object({
        title: shortText,
        detail: narrativeText,
      }),
    )
    .max(8),
  studentNotes: z.array(speakingReportStudentNoteSchema).max(40),
  followUps: z.array(narrativeText).max(10),
  teacherCaveat: narrativeText,
});

export type SpeakingReportSnapshot = z.infer<typeof speakingReportSnapshotSchema>;
export type SpeakingReportStudentNote = z.infer<
  typeof speakingReportStudentNoteSchema
>;

export type SpeakingReport = {
  id: string;
  sessionId: string;
  classId: string | null;
  teacherId: string;
  sourceTranscriptId: string | null;
  status: SpeakingReportStatus;
  snapshot: SpeakingReportSnapshot;
  generationMethod: "heuristic" | "llm";
  generatedAt: string;
  reviewedAt: string | null;
  approvedAt: string | null;
  discardedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function speakingReportStatusLabel(status: SpeakingReportStatus): string {
  if (status === "ready_for_review") return "Ready for review";
  if (status === "approved") return "Approved";
  if (status === "discarded") return "Discarded";
  return "Draft";
}
