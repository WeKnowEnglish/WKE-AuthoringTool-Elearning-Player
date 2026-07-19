import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export type WhiteboardRoundHistoryItem = {
  id: string;
  joinCode: string;
  phase: string;
  mode: string;
  title: string;
  sessionId: string | null;
  archivedAt: string | null;
  updatedAt: string;
  submissionCount: number;
};

export async function listClassWhiteboardHistory(
  classId: string,
): Promise<WhiteboardRoundHistoryItem[]> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return [];

  const { data: rounds } = await supabase
    .from("whiteboard_rounds")
    .select("id, join_code, phase, mode, prompt_json, session_id, archived_at, updated_at")
    .eq("class_id", classId)
    .order("updated_at", { ascending: false })
    .limit(40);

  if (!rounds?.length) return [];

  const roundIds = rounds.map((r) => r.id as string);
  const { data: submissions } = await supabase
    .from("whiteboard_submissions")
    .select("round_id")
    .in("round_id", roundIds);

  const counts = new Map<string, number>();
  for (const row of submissions ?? []) {
    const id = row.round_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return rounds.map((row) => {
    const prompt = row.prompt_json as { title?: string } | null;
    return {
      id: row.id as string,
      joinCode: row.join_code as string,
      phase: row.phase as string,
      mode: row.mode as string,
      title: prompt?.title?.trim() || "Whiteboard round",
      sessionId: (row.session_id as string | null) ?? null,
      archivedAt: (row.archived_at as string | null) ?? null,
      updatedAt: row.updated_at as string,
      submissionCount: counts.get(row.id as string) ?? 0,
    };
  });
}

export async function getRoundReviewBundle(roundId: string): Promise<{
  round: {
    id: string;
    joinCode: string;
    phase: string;
    title: string;
    instructions: string;
    archivedAt: string | null;
    classId: string | null;
  };
  submissions: {
    id: string;
    boardId: string;
    ownerType: string;
    ownerId: string;
    revision: number;
    previewPath: string | null;
    previewDataUrl: string | null;
    submittedAt: string;
  }[];
} | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;

  const { data: round } = await supabase
    .from("whiteboard_rounds")
    .select("id, join_code, phase, prompt_json, archived_at, class_id")
    .eq("id", roundId)
    .maybeSingle();

  if (!round) return null;

  const prompt = round.prompt_json as { title?: string; instructions?: string } | null;
  const { data: submissions } = await supabase
    .from("whiteboard_submissions")
    .select(
      "id, board_id, owner_type, owner_id, revision, preview_path, preview_data_url, submitted_at",
    )
    .eq("round_id", roundId)
    .order("submitted_at", { ascending: false });

  return {
    round: {
      id: round.id as string,
      joinCode: round.join_code as string,
      phase: round.phase as string,
      title: prompt?.title?.trim() || "Whiteboard round",
      instructions: prompt?.instructions?.trim() || "",
      archivedAt: (round.archived_at as string | null) ?? null,
      classId: (round.class_id as string | null) ?? null,
    },
    submissions: (submissions ?? []).map((row) => ({
      id: row.id as string,
      boardId: row.board_id as string,
      ownerType: row.owner_type as string,
      ownerId: row.owner_id as string,
      revision: row.revision as number,
      previewPath: (row.preview_path as string | null) ?? null,
      previewDataUrl: (row.preview_data_url as string | null) ?? null,
      submittedAt: row.submitted_at as string,
    })),
  };
}
