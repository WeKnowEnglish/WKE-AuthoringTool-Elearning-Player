import "server-only";
import { randomBytes } from "node:crypto";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { parseQuestionPayload } from "@/lib/live-game/question-banks/schemas";
import type { LiveGameQuestionBank, LiveGameQuestionPayload } from "@/lib/live-game/question-banks/types";
import { ENGLISH_CRAFT_CHALLENGE_TTL_MS } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { LIVE_GAME_AWARD_CLAIM_LEASE_MS } from "@/lib/live-game/server/challenge-lifecycle";

export type LiveGameChallengeStatus = "active" | "awarding" | "awarded" | "expired";

export type LiveGameChallengeRecord = {
  challengeId: string;
  roomId: string;
  playerId: string;
  nodeId: string;
  questionId: string;
  questionSetId: string | null;
  questionSetVersion: number | null;
  questionBank: LiveGameQuestionBank | null;
  validationPayload: LiveGameQuestionPayload | null;
  expiresAt: number;
  status: LiveGameChallengeStatus;
};

type ChallengeRow = {
  id: string;
  room_id: string;
  player_id: string;
  node_id: string;
  question_id: string;
  question_set_id: string | null;
  question_set_version: number | null;
  question_bank: LiveGameQuestionBank | null;
  validation_payload: unknown | null;
  expires_at: string;
  status: LiveGameChallengeStatus;
};

const CHALLENGE_SELECT =
  "id,room_id,player_id,node_id,question_id,question_set_id,question_set_version,question_bank,validation_payload,expires_at,status";

function requireChallengeDatabase() {
  const supabase = createServiceRoleSupabase();
  if (!supabase) {
    throw new Error("Live-game challenges require SUPABASE_SERVICE_ROLE_KEY.");
  }
  return supabase;
}

function toRecord(row: ChallengeRow): LiveGameChallengeRecord {
  return {
    challengeId: row.id,
    roomId: row.room_id,
    playerId: row.player_id,
    nodeId: row.node_id,
    questionId: row.question_id,
    questionSetId: row.question_set_id,
    questionSetVersion: row.question_set_version,
    questionBank: row.question_bank,
    validationPayload: row.validation_payload == null ? null : parseQuestionPayload(row.validation_payload),
    expiresAt: new Date(row.expires_at).getTime(),
    status: row.status,
  };
}

async function expireOldChallenges(roomId: string, playerId: string, nodeId: string) {
  const supabase = requireChallengeDatabase();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("live_game_challenges")
    .update({ status: "expired", updated_at: now })
    .eq("room_id", roomId)
    .eq("player_id", playerId)
    .eq("node_id", nodeId)
    .in("status", ["active", "awarding"])
    .lte("expires_at", now);
  if (error) throw new Error(`Could not expire live-game challenges: ${error.message}`);
}

export async function findActiveChallengeForPlayerNode(input: {
  roomId: string;
  playerId: string;
  nodeId: string;
}): Promise<LiveGameChallengeRecord | null> {
  await expireOldChallenges(input.roomId, input.playerId, input.nodeId);
  const supabase = requireChallengeDatabase();
  const { data, error } = await supabase
    .from("live_game_challenges")
    .select(CHALLENGE_SELECT)
    .eq("room_id", input.roomId)
    .eq("player_id", input.playerId)
    .eq("node_id", input.nodeId)
    .in("status", ["active", "awarding"])
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error(`Could not read live-game challenge: ${error.message}`);
  return data ? toRecord(data as ChallengeRow) : null;
}

export async function createLiveGameChallenge(input: {
  roomId: string;
  playerId: string;
  nodeId: string;
  questionId: string;
  questionSetId: string;
  questionSetVersion: number;
  questionBank: LiveGameQuestionBank;
  validationPayload: LiveGameQuestionPayload;
}): Promise<LiveGameChallengeRecord> {
  const supabase = requireChallengeDatabase();
  const now = Date.now();
  const { data, error } = await supabase
    .rpc("issue_live_game_challenge", {
      p_id: `ch_${randomBytes(12).toString("hex")}`,
      p_room_id: input.roomId,
      p_player_id: input.playerId,
      p_node_id: input.nodeId,
      p_question_id: input.questionId,
      p_question_set_id: input.questionSetId,
      p_question_set_version: input.questionSetVersion,
      p_question_bank: input.questionBank,
      p_validation_payload: input.validationPayload,
      p_expires_at: new Date(now + ENGLISH_CRAFT_CHALLENGE_TTL_MS).toISOString(),
    })
    .single();
  if (error) throw new Error(`Could not create live-game challenge: ${error.message}`);
  return toRecord(data as ChallengeRow);
}

export async function getLiveGameChallenge(
  challengeId: string,
): Promise<LiveGameChallengeRecord | null> {
  const supabase = requireChallengeDatabase();
  const { data, error } = await supabase
    .from("live_game_challenges")
    .select(CHALLENGE_SELECT)
    .eq("id", challengeId)
    .maybeSingle();
  if (error) throw new Error(`Could not read live-game challenge: ${error.message}`);
  if (!data) return null;
  const record = toRecord(data as ChallengeRow);
  if (record.status === "expired") return null;
  if (record.status !== "awarded" && record.expiresAt <= Date.now()) return null;
  return record;
}

export async function markChallengeSkipped(challengeId: string): Promise<boolean> {
  const supabase = requireChallengeDatabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("live_game_challenges")
    .update({ status: "expired", updated_at: now })
    .eq("id", challengeId)
    .eq("status", "active")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Could not skip live-game challenge: ${error.message}`);
  return data != null;
}

export type ClaimChallengeResult =
  | { kind: "claimed"; challenge: LiveGameChallengeRecord }
  | { kind: "awarded"; challenge: LiveGameChallengeRecord }
  | { kind: "processing"; challenge: LiveGameChallengeRecord }
  | { kind: "missing" };

export async function claimLiveGameChallengeAward(
  challengeId: string,
): Promise<ClaimChallengeResult> {
  const supabase = requireChallengeDatabase();
  const now = new Date();
  const nowIso = now.toISOString();
  const staleIso = new Date(now.getTime() - LIVE_GAME_AWARD_CLAIM_LEASE_MS).toISOString();

  const { data: active, error: activeError } = await supabase
    .from("live_game_challenges")
    .update({ status: "awarding", claim_started_at: nowIso, updated_at: nowIso })
    .eq("id", challengeId)
    .eq("status", "active")
    .gt("expires_at", nowIso)
    .select(CHALLENGE_SELECT)
    .maybeSingle();
  if (activeError) throw new Error(`Could not claim live-game challenge: ${activeError.message}`);
  if (active) return { kind: "claimed", challenge: toRecord(active as ChallengeRow) };

  const current = await getLiveGameChallenge(challengeId);
  if (!current) return { kind: "missing" };
  if (current.status === "awarded") return { kind: "awarded", challenge: current };
  if (current.status !== "awarding") return { kind: "missing" };

  const { data: reclaimed, error: reclaimError } = await supabase
    .from("live_game_challenges")
    .update({ claim_started_at: nowIso, updated_at: nowIso })
    .eq("id", challengeId)
    .eq("status", "awarding")
    .lt("claim_started_at", staleIso)
    .select(CHALLENGE_SELECT)
    .maybeSingle();
  if (reclaimError) {
    throw new Error(`Could not reclaim live-game challenge: ${reclaimError.message}`);
  }
  return reclaimed ?
      { kind: "claimed", challenge: toRecord(reclaimed as ChallengeRow) }
    : { kind: "processing", challenge: current };
}

export async function markChallengeAwarded(challengeId: string): Promise<void> {
  const supabase = requireChallengeDatabase();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("live_game_challenges")
    .update({ status: "awarded", awarded_at: now, updated_at: now })
    .eq("id", challengeId)
    .in("status", ["awarding", "awarded"]);
  if (error) throw new Error(`Could not complete live-game challenge: ${error.message}`);
}

export async function expireLiveGameRoomChallenges(roomId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await requireChallengeDatabase()
    .from("live_game_challenges")
    .update({ status: "expired", updated_at: now })
    .eq("room_id", roomId)
    .in("status", ["active", "awarding"]);
  if (error) throw new Error(`Could not close live-game challenges: ${error.message}`);
}
