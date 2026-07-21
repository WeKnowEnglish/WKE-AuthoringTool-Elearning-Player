import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import type {
  WordCardsParticipationMode,
  WordCardsRuntimePhase,
} from "@/lib/word-cards/domain";

export async function upsertWordCardRoundMeta(input: {
  roundId: string;
  sessionId: string;
  joinCode: string;
  liveblocksRoomId: string;
  createdBy: string;
  participationMode: WordCardsParticipationMode;
  phase: WordCardsRuntimePhase;
  wordList: string[];
  settings: unknown;
  openedAt?: string | null;
  collectedAt?: string | null;
  completedAt?: string | null;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;

  const row: Record<string, unknown> = {
    id: input.roundId,
    session_id: input.sessionId,
    join_code: input.joinCode.toUpperCase(),
    liveblocks_room_id: input.liveblocksRoomId,
    created_by: input.createdBy,
    participation_mode: input.participationMode,
    phase: input.phase,
    word_list_json: input.wordList,
    settings_json: input.settings,
    updated_at: new Date().toISOString(),
  };
  if (input.openedAt !== undefined) row.opened_at = input.openedAt;
  if (input.collectedAt !== undefined) row.collected_at = input.collectedAt;
  if (input.completedAt !== undefined) row.completed_at = input.completedAt;

  await supabase.from("word_card_rounds").upsert(row, { onConflict: "id" });
}

export type WordCardRoundRecord = {
  id: string;
  sessionId: string;
  joinCode: string;
  liveblocksRoomId: string;
  createdBy: string;
  participationMode: WordCardsParticipationMode;
  phase: WordCardsRuntimePhase;
  wordList: string[];
  settings: unknown;
};

function mapRound(data: Record<string, unknown>): WordCardRoundRecord {
  return {
    id: data.id as string,
    sessionId: data.session_id as string,
    joinCode: String(data.join_code ?? "").toUpperCase(),
    liveblocksRoomId: data.liveblocks_room_id as string,
    createdBy: data.created_by as string,
    participationMode: data.participation_mode as WordCardsParticipationMode,
    phase: data.phase as WordCardsRuntimePhase,
    wordList: Array.isArray(data.word_list_json)
      ? (data.word_list_json as string[])
      : [],
    settings: data.settings_json,
  };
}

export async function getWordCardRoundById(roundId: string): Promise<WordCardRoundRecord | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("word_card_rounds")
    .select(
      "id, session_id, join_code, liveblocks_room_id, created_by, participation_mode, phase, word_list_json, settings_json",
    )
    .eq("id", roundId)
    .maybeSingle();

  if (error || !data) return null;
  return mapRound(data as Record<string, unknown>);
}

export async function getWordCardRoundByJoinCode(
  joinCode: string,
): Promise<WordCardRoundRecord | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("word_card_rounds")
    .select(
      "id, session_id, join_code, liveblocks_room_id, created_by, participation_mode, phase, word_list_json, settings_json",
    )
    .eq("join_code", joinCode.toUpperCase())
    .maybeSingle();

  if (error || !data) return null;
  return mapRound(data as Record<string, unknown>);
}

export async function getActiveWordCardRoundForSession(
  sessionId: string,
): Promise<WordCardRoundRecord | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("word_card_rounds")
    .select(
      "id, session_id, join_code, liveblocks_room_id, created_by, participation_mode, phase, word_list_json, settings_json",
    )
    .eq("session_id", sessionId)
    .neq("phase", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapRound(data as Record<string, unknown>);
}

export type WordCardSubmissionType = "manual" | "teacher_collect" | "resubmission";

export async function persistWordCardSubmission(input: {
  roundId: string;
  cardId: string;
  ownerType: string;
  ownerId: string;
  revision: number;
  submissionType: WordCardSubmissionType;
  assignedWord: string;
  definition: string;
  exampleSentence: string;
  drawing: unknown;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;

  const id = `${input.roundId}:${input.cardId}:${input.revision}`;
  await supabase.from("word_card_submissions").upsert(
    {
      id,
      round_id: input.roundId,
      card_id: input.cardId,
      owner_type: input.ownerType,
      owner_id: input.ownerId,
      revision: input.revision,
      submission_type: input.submissionType,
      assigned_word: input.assignedWord,
      definition: input.definition,
      example_sentence: input.exampleSentence,
      drawing_json: input.drawing ?? { strokes: [] },
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "round_id,card_id,revision" },
  );
}
