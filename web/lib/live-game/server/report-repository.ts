import "server-only";

import type { LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";
import type { LiveGameQuestionRow, LiveGameQuestionSetSnapshot } from "@/lib/live-game/question-banks/types";
import type {
  LiveGameAttemptRow,
  LiveGameEncounterResolution,
  LiveGameEncounterRow,
  LiveGameReportEndReason,
  LiveGameReportParticipantRow,
  LiveGameReportRoundRow,
} from "@/lib/live-game/reports/types";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

const ENCOUNTER_SELECT = "id,round_id,challenge_id,player_id,question_id,question_bank,question_type,question_prompt,correct_answer,learning_target_key,learning_target_label,cefr_level,game_action_type,game_object_id,resource_type,recipe_id,opened_at,resolved_at,resolution,system_hints_used,teacher_support_level,help_requested_at";
const ATTEMPT_SELECT = "encounter_id,submission_id,submission_index,selected_answer,is_correct,response_time_ms,contribution,submitted_at";
const ROUND_SELECT = "id,room_id,join_code,round_number,status,class_id,class_title,question_set_title,level,topic,learning_objective,end_reason,summary,started_at,ended_at";

function adminClient() {
  const client = createServiceRoleSupabase();
  if (!client) throw new Error("Live Game reports require SUPABASE_SERVICE_ROLE_KEY.");
  return client;
}

function databaseError(prefix: string, error: { message: string } | null): never {
  throw new Error(`${prefix}: ${error?.message ?? "unknown database error"}`);
}

function accountUserId(playerId: string): string | null {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(playerId) ? playerId : null;
}

async function upsertParticipants(roundId: string, players: LiveGameStorageSnapshot["players"]) {
  const rows = Object.entries(players ?? {}).map(([playerId, player]) => ({
    round_id: roundId,
    player_id: playerId,
    account_user_id: accountUserId(playerId),
    display_name: player.name,
    role: player.role,
    joined_at: new Date(player.joinedAt).toISOString(),
  }));
  if (!rows.length) return;
  const { error } = await adminClient().from("live_game_report_participants").upsert(rows, { onConflict: "round_id,player_id" });
  if (error) databaseError("Could not record Live Game participants", error);
}

export async function ensureActiveLiveGameReportRound(
  storage: LiveGameStorageSnapshot,
  questionSet: LiveGameQuestionSetSnapshot,
): Promise<string> {
  const admin = adminClient();
  const roomId = `wke-live-game-${storage.session.joinCode}`;
  const { data: active, error: activeError } = await admin
    .from("live_game_report_rounds")
    .select("id")
    .eq("room_id", roomId)
    .eq("status", "active")
    .maybeSingle();
  if (activeError) databaseError("Could not read active Live Game report round", activeError);
  if (active?.id) {
    await upsertParticipants(active.id as string, storage.players);
    return active.id as string;
  }

  const { data: latest, error: latestError } = await admin
    .from("live_game_report_rounds")
    .select("round_number")
    .eq("room_id", roomId)
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) databaseError("Could not sequence Live Game report round", latestError);
  const roundNumber = ((latest as { round_number?: number } | null)?.round_number ?? 0) + 1;
  const { data, error } = await admin.from("live_game_report_rounds").insert({
    room_id: roomId,
    join_code: storage.session.joinCode,
    round_number: roundNumber,
    host_user_id: accountUserId(storage.session.hostUserId),
    class_id: storage.session.classId ?? null,
    class_title: storage.session.classTitle ?? null,
    mode_id: storage.session.modeId,
    map_id: storage.session.mapId,
    question_set_id: questionSet.id,
    question_set_version: questionSet.version,
    question_set_title: questionSet.title,
    level: questionSet.level,
    topic: questionSet.topic,
    learning_objective: questionSet.learningObjective,
    duration_minutes: storage.session.durationMinutes,
  }).select("id").single();
  if (error) {
    const { data: raced } = await admin.from("live_game_report_rounds").select("id").eq("room_id", roomId).eq("status", "active").maybeSingle();
    if (!raced?.id) databaseError("Could not create Live Game report round", error);
    await upsertParticipants(raced.id as string, storage.players);
    return raced.id as string;
  }
  const roundId = data.id as string;
  await upsertParticipants(roundId, storage.players);
  return roundId;
}

function correctAnswer(question: LiveGameQuestionRow): unknown {
  if (question.payload.type === "multiple_choice") return question.payload.correctAnswers;
  if (question.payload.type === "deposit_spell") return question.payload.targetWord;
  return question.payload.correctOrder;
}

export async function recordLiveGameQuestionEncounter(input: {
  storage: LiveGameStorageSnapshot;
  questionSet: LiveGameQuestionSetSnapshot;
  challengeId: string;
  playerId: string;
  question: LiveGameQuestionRow;
  gameObjectId: string;
  resourceType?: string | null;
  recipeId?: string | null;
}): Promise<void> {
  const roomId = `wke-live-game-${input.storage.session.joinCode}`;
  const { error } = await adminClient().rpc("open_live_game_question_encounter", {
    p_room_id: roomId,
    p_challenge_id: input.challengeId,
    p_player_id: input.playerId,
    p_question_id: input.question.id,
    p_question_set_id: input.questionSet.id,
    p_question_set_version: input.questionSet.version,
    p_question_bank: input.question.bank,
    p_question_type: input.question.payload.type,
    p_question_prompt: input.question.prompt,
    p_correct_answer: correctAnswer(input.question),
    p_learning_target_key: input.questionSet.id,
    p_learning_target_label: input.questionSet.learningObjective,
    p_cefr_level: input.questionSet.level,
    p_game_action_type: input.question.bank,
    p_game_object_id: input.gameObjectId,
    p_resource_type: input.resourceType ?? null,
    p_recipe_id: input.recipeId ?? null,
  });
  if (error) databaseError("Could not record Live Game question encounter", error);
}

export async function recordLiveGameQuestionAttempt(input: {
  challengeId: string;
  submissionId: string;
  selectedAnswer: unknown;
  correct: boolean;
  responseTimeMs: number | null;
  contribution?: Record<string, unknown>;
}): Promise<void> {
  const admin = adminClient();
  const { error } = await admin.rpc("record_live_game_question_attempt", {
    p_challenge_id: input.challengeId,
    p_submission_id: input.submissionId,
    p_selected_answer: input.selectedAnswer,
    p_is_correct: input.correct,
    p_response_time_ms: input.responseTimeMs,
    p_contribution: input.contribution ?? {},
  });
  if (error) databaseError("Could not record Live Game attempt", error);
}

export async function resolveLiveGameQuestionEncounter(challengeId: string, resolution: Exclude<LiveGameEncounterResolution, "open">) {
  const now = new Date().toISOString();
  const { error } = await adminClient().from("live_game_question_encounters").update({ resolution, resolved_at: now, updated_at: now }).eq("challenge_id", challengeId).eq("resolution", "open");
  if (error) databaseError("Could not resolve Live Game encounter", error);
}

function finalResources(summary: Record<string, unknown>) {
  const pool = summary.resourcePool;
  if (!pool || typeof pool !== "object") return {};
  return Object.fromEntries(Object.entries(pool).filter((entry): entry is [string, number] => typeof entry[1] === "number"));
}

export async function finalizeLiveGameReportRound(input: {
  storage: LiveGameStorageSnapshot;
  questionSet: LiveGameQuestionSetSnapshot;
  reason: LiveGameReportEndReason;
  endedAt?: number;
}): Promise<void> {
  const admin = adminClient();
  const roomId = `wke-live-game-${input.storage.session.joinCode}`;
  const { data: activeRound, error: activeRoundError } = await admin
    .from("live_game_report_rounds")
    .select("id")
    .eq("room_id", roomId)
    .eq("status", "active")
    .maybeSingle();
  if (activeRoundError) databaseError("Could not read active Live Game report round", activeRoundError);

  // Starting a round owns report creation. A repeated or concurrent completion
  // request must be idempotent; creating here would produce a newer empty round
  // that hides the real evidence in the completed report.
  if (!activeRound?.id) return;
  const roundId = activeRound.id as string;
  await upsertParticipants(roundId, input.storage.players);
  const endedAt = new Date(input.endedAt ?? Date.now()).toISOString();
  const summary = {
    resourcePool: input.storage.resourcePool ?? {},
    craftedItems: input.storage.craftedItems ?? {},
    objectiveCompleted: input.storage.session.objectiveCompleted,
  };
  const { error } = await admin.rpc("finalize_live_game_report_round", {
    p_round_id: roundId,
    p_end_reason: input.reason,
    p_ended_at: endedAt,
    p_summary: summary,
  });
  if (error) databaseError("Could not finalize Live Game report round", error);
}

export async function loadLatestCompletedLiveGameReportRound(roomId: string): Promise<LiveGameReportRoundRow | null> {
  const { data, error } = await adminClient().from("live_game_report_rounds").select(ROUND_SELECT).eq("room_id", roomId).eq("status", "completed").order("round_number", { ascending: false }).limit(1).maybeSingle();
  if (error) databaseError("Could not read Live Game report round", error);
  return (data as LiveGameReportRoundRow | null) ?? null;
}

export async function loadLatestLiveGameReportRound(roomId: string): Promise<LiveGameReportRoundRow | null> {
  const { data, error } = await adminClient().from("live_game_report_rounds").select(ROUND_SELECT).eq("room_id", roomId).order("round_number", { ascending: false }).limit(1).maybeSingle();
  if (error) databaseError("Could not read latest Live Game report round", error);
  return (data as LiveGameReportRoundRow | null) ?? null;
}

export async function loadLiveGameReportEvidence(roundId: string) {
  const admin = adminClient();
  const [participantsResult, encountersResult, attemptsResult] = await Promise.all([
    admin.from("live_game_report_participants").select("player_id,display_name,role").eq("round_id", roundId),
    admin.from("live_game_question_encounters").select(ENCOUNTER_SELECT).eq("round_id", roundId).order("opened_at", { ascending: true }),
    admin.from("live_game_question_attempts").select(`${ATTEMPT_SELECT},live_game_question_encounters!inner(round_id)`).eq("live_game_question_encounters.round_id", roundId).order("submitted_at", { ascending: true }),
  ]);
  if (participantsResult.error) databaseError("Could not read report participants", participantsResult.error);
  if (encountersResult.error) databaseError("Could not read report encounters", encountersResult.error);
  if (attemptsResult.error) databaseError("Could not read report attempts", attemptsResult.error);
  const attempts = (attemptsResult.data ?? []).map((row) => {
    const attempt = { ...(row as Record<string, unknown>) };
    delete attempt.live_game_question_encounters;
    return attempt as LiveGameAttemptRow;
  });
  return {
    participants: (participantsResult.data as LiveGameReportParticipantRow[] | null) ?? [],
    encounters: (encountersResult.data as LiveGameEncounterRow[] | null) ?? [],
    attempts,
  };
}

export function readFinalResources(round: LiveGameReportRoundRow) {
  return finalResources(round.summary);
}
