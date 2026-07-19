import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import {
  submissionSnapshotId,
  type DocumentSubmissionSnapshot,
  type DocumentSubmissionType,
} from "@/lib/document-activity/snapshot";

export async function persistDocumentSubmission(input: {
  roundId: string;
  documentId: string;
  ownerType: "student" | "group" | "class";
  ownerId: string;
  contributorIds: string[];
  revision: number;
  submissionType: DocumentSubmissionType;
  contentJson: unknown;
  plainText: string;
  wordCount: number;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;

  const submittedAt = new Date().toISOString();
  await supabase.from("document_submissions").upsert(
    {
      id: submissionSnapshotId(input.roundId, input.documentId, input.revision),
      round_id: input.roundId,
      document_id: input.documentId,
      owner_type: input.ownerType,
      owner_id: input.ownerId,
      contributor_ids: input.contributorIds,
      revision: input.revision,
      submission_type: input.submissionType,
      content_json: input.contentJson ?? {},
      plain_text: input.plainText,
      word_count: input.wordCount,
      submitted_at: submittedAt,
    },
    { onConflict: "round_id,document_id,revision" },
  );
}

export async function listDocumentSubmissions(
  roundId: string,
): Promise<DocumentSubmissionSnapshot[]> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("document_submissions")
    .select(
      "round_id, document_id, owner_type, owner_id, contributor_ids, revision, submission_type, content_json, plain_text, word_count, submitted_at",
    )
    .eq("round_id", roundId)
    .order("submitted_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    roundId: row.round_id as string,
    documentId: row.document_id as string,
    ownerType: row.owner_type as DocumentSubmissionSnapshot["ownerType"],
    ownerId: row.owner_id as string,
    contributorIds: (row.contributor_ids as string[]) ?? [],
    revision: row.revision as number,
    submissionType: row.submission_type as DocumentSubmissionType,
    contentJson: row.content_json,
    plainText: (row.plain_text as string) ?? "",
    wordCount: (row.word_count as number) ?? 0,
    submittedAt: row.submitted_at as string,
  }));
}
