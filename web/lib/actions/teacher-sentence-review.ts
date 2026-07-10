"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getClassRoster } from "@/lib/data/teacher-classes";
import {
  applyTeacherSentenceApprovalToRecords,
  buildTeacherSentenceApprovalEvidence,
  masteryRecordsToUpsertRows,
  rowsToRecordMap,
} from "@/lib/mastery/teacher-sentence-assessment";
import { fetchMasteryRecordsForTeacher, requireTeacherUser } from "@/lib/mastery/teacher-queries";
import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";

export type ReviewSecondarySentenceInput = {
  classId: string;
  submissionId: string;
  outcome: "approve" | "needs_revision";
  comment?: string | null;
};

export type ReviewSecondarySentenceResult =
  | { ok: true; alreadyReviewed?: boolean }
  | { ok: false; error: string };

export async function reviewSecondarySentenceSubmission(
  input: ReviewSecondarySentenceInput,
): Promise<ReviewSecondarySentenceResult> {
  await requireTeacherUser();

  const submissionId = input.submissionId.trim();
  const classId = input.classId.trim();
  const comment = input.comment?.trim() ?? null;

  if (!submissionId || !classId) {
    return { ok: false, error: "Missing review context." };
  }

  if (input.outcome !== "approve" && input.outcome !== "needs_revision") {
    return { ok: false, error: "Invalid review outcome." };
  }

  if (comment && comment.length > 500) {
    return { ok: false, error: "Comment is too long." };
  }

  const roster = await getClassRoster(classId);
  const supabase = await createClient();

  const { data: submission, error: submissionError } = await supabase
    .from("student_sentence_submissions")
    .select("id, student_id, word_item_id, date_key, status")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError) {
    return { ok: false, error: submissionError.message };
  }

  if (!submission) {
    return { ok: false, error: "Submission not found." };
  }

  const studentId = String(submission.student_id);
  if (!roster.some((student) => student.studentId === studentId)) {
    return { ok: false, error: "Student is not on this class roster." };
  }

  if (submission.status === "approved") {
    return { ok: true, alreadyReviewed: true };
  }

  if (submission.status !== "submitted") {
    return { ok: false, error: "This submission is not waiting for review." };
  }

  if (input.outcome === "needs_revision") {
    const { data, error } = await supabase.rpc("record_teacher_sentence_assessment", {
      p_submission_id: submissionId,
      p_outcome: "needs_revision",
      p_comment: comment,
      p_evidence: null,
      p_mastery_records: null,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    if (data && typeof data === "object" && "ok" in data && data.ok === true) {
      revalidatePath(`/teacher/classes/${classId}`);
      revalidatePath(`/teacher/classes/${classId}/students/${studentId}`);
      return { ok: true };
    }

    return { ok: false, error: "Could not save revision request." };
  }

  const vocabItem = getSecondaryVocabItemById(String(submission.word_item_id));
  const reviewedAt = new Date();
  const evidence = buildTeacherSentenceApprovalEvidence({
    studentId,
    submissionId,
    wordItemId: String(submission.word_item_id),
    dateKey: String(submission.date_key),
    lemma: vocabItem?.lemma ?? vocabItem?.word ?? null,
    reviewedAt,
  });

  const masteryRows = await fetchMasteryRecordsForTeacher(studentId);
  const existingRecords = rowsToRecordMap(masteryRows);
  const updatedRecords = applyTeacherSentenceApprovalToRecords(existingRecords, evidence);
  const upsertRows = masteryRecordsToUpsertRows(studentId, updatedRecords);

  const { data, error } = await supabase.rpc("record_teacher_sentence_assessment", {
    p_submission_id: submissionId,
    p_outcome: "approve",
    p_comment: comment,
    p_evidence: evidence,
    p_mastery_records: upsertRows,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data || typeof data !== "object" || !("ok" in data) || data.ok !== true) {
    return { ok: false, error: "Could not record approval." };
  }

  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath(`/teacher/classes/${classId}/students/${studentId}`);

  return {
    ok: true,
    alreadyReviewed:
      "alreadyReviewed" in data && data.alreadyReviewed === true ? true : undefined,
  };
}
