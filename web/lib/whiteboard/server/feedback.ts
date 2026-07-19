import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export async function persistBoardFeedback(input: {
  submissionId: string;
  teacherId: string;
  message: string;
  feedbackType?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;
  const message = input.message.trim();
  if (!message) return;

  await supabase.from("whiteboard_feedback").insert({
    submission_id: input.submissionId,
    teacher_id: input.teacherId,
    feedback_type: input.feedbackType ?? "return",
    message: message.slice(0, 1000),
    metadata_json: input.metadata ?? {},
  });
}

export async function listFeedbackForSubmission(submissionId: string): Promise<
  {
    id: string;
    message: string;
    feedbackType: string;
    createdAt: string;
  }[]
> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("whiteboard_feedback")
    .select("id, message, feedback_type, created_at")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id as string,
    message: row.message as string,
    feedbackType: row.feedback_type as string,
    createdAt: row.created_at as string,
  }));
}
