"use server";

import { createClient } from "@/lib/supabase/server";
import { validateSecondarySentenceQuality } from "@/lib/secondary/secondary-sentence-quality-check";
import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";

function validateSentenceForWordItem(wordItemId: string, sentenceText: string) {
  const vocab = getSecondaryVocabItemById(wordItemId);
  return validateSecondarySentenceQuality({
    text: sentenceText,
    targetWord: vocab?.word ?? wordItemId,
    lemma: vocab?.lemma,
    partOfSpeech: vocab?.partOfSpeech,
  });
}

export type SubmitSecondarySentenceInput = {
  wordItemId: string;
  sentenceText: string;
  dateKey: string;
  sessionWordSetHash?: string | null;
};

export type SubmitSecondarySentenceResult =
  | { ok: true; submissionId: string; alreadySubmitted: boolean }
  | { ok: false; error: string };

export async function submitSecondarySentenceSubmission(
  input: SubmitSecondarySentenceInput,
): Promise<SubmitSecondarySentenceResult> {
  const wordItemId = input.wordItemId.trim();
  const dateKey = input.dateKey.trim();

  if (!wordItemId || !dateKey) {
    return { ok: false, error: "Missing word or session day." };
  }

  const quality = validateSentenceForWordItem(wordItemId, input.sentenceText);
  if (!quality.ok) {
    return { ok: false, error: quality.message };
  }

  const normalized = quality.normalized;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sign in to send sentences to your teacher." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("student_sentence_submissions")
    .select("id")
    .eq("student_id", user.id)
    .eq("word_item_id", wordItemId)
    .eq("date_key", dateKey)
    .eq("activity_key", "secondary_sentence")
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { ok: false, error: existingError.message };
  }

  if (existing?.id) {
    return { ok: true, submissionId: String(existing.id), alreadySubmitted: true };
  }

  const { data: row, error: insertError } = await supabase
    .from("student_sentence_submissions")
    .insert({
      student_id: user.id,
      word_item_id: wordItemId,
      sentence_text: normalized,
      activity_key: "secondary_sentence",
      date_key: dateKey,
      session_word_set_hash: input.sessionWordSetHash?.trim() || null,
      status: "submitted",
    })
    .select("id")
    .single();

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  return { ok: true, submissionId: String(row.id), alreadySubmitted: false };
}

export type ResubmitSecondarySentenceInput = {
  wordItemId: string;
  sentenceText: string;
  dateKey: string;
  sessionWordSetHash?: string | null;
};

export type ResubmitSecondarySentenceResult =
  | { ok: true; submissionId: string; supersedesId: string }
  | { ok: false; error: string };

export async function resubmitSecondarySentenceSubmission(
  input: ResubmitSecondarySentenceInput,
): Promise<ResubmitSecondarySentenceResult> {
  const wordItemId = input.wordItemId.trim();
  const dateKey = input.dateKey.trim();

  if (!wordItemId || !dateKey) {
    return { ok: false, error: "Missing word or session day." };
  }

  const quality = validateSentenceForWordItem(wordItemId, input.sentenceText);
  if (!quality.ok) {
    return { ok: false, error: quality.message };
  }

  const normalized = quality.normalized;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sign in to send your revised sentence." };
  }

  const { data, error } = await supabase.rpc("resubmit_student_sentence_submission", {
    p_word_item_id: wordItemId,
    p_date_key: dateKey,
    p_sentence_text: normalized,
    p_session_word_set_hash: input.sessionWordSetHash?.trim() || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data || typeof data !== "object" || !("ok" in data) || data.ok !== true) {
    return { ok: false, error: "Could not send revised sentence." };
  }

  const submissionId =
    "submissionId" in data && data.submissionId ? String(data.submissionId) : "";
  const supersedesId =
    "supersedesId" in data && data.supersedesId ? String(data.supersedesId) : "";

  if (!submissionId || !supersedesId) {
    return { ok: false, error: "Could not send revised sentence." };
  }

  return { ok: true, submissionId, supersedesId };
}

export type StudentSentenceSubmissionStatus =
  | "submitted"
  | "approved"
  | "needs_revision"
  | "superseded";

export type StudentSentenceSubmissionView = {
  id: string;
  wordItemId: string;
  sentenceText: string;
  dateKey: string;
  status: StudentSentenceSubmissionStatus;
  teacherComment: string | null;
  submittedAt: string;
  reviewedAt: string | null;
};

export async function getMySentenceSubmissionsForDate(
  dateKey: string,
): Promise<StudentSentenceSubmissionView[]> {
  const trimmedDateKey = dateKey.trim();
  if (!trimmedDateKey) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("student_sentence_submissions")
    .select(
      "id, word_item_id, sentence_text, date_key, status, teacher_comment, submitted_at, reviewed_at",
    )
    .eq("student_id", user.id)
    .eq("date_key", trimmedDateKey)
    .eq("activity_key", "secondary_sentence")
    .order("submitted_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    wordItemId: String(row.word_item_id),
    sentenceText: String(row.sentence_text),
    dateKey: String(row.date_key),
    status: row.status as StudentSentenceSubmissionStatus,
    teacherComment: row.teacher_comment ? String(row.teacher_comment) : null,
    submittedAt: String(row.submitted_at),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
  }));
}
