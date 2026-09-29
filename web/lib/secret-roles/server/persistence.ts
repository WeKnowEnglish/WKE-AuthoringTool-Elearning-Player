import "server-only";

import {
  assignSecretRoles,
  canTransitionSecretRolePhase,
  toSecretRoleStudentView,
  type SecretRoleAssignment,
  type SecretRoleCard,
  type SecretRoleLaunchDraft,
  type SecretRolePhase,
  type SecretRoleRound,
  type SecretRoleStudent,
  type SecretRoleStudentView,
} from "@/lib/secret-roles/domain";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export type SecretRoleResponse = {
  studentId: string;
  answer: string;
  reasoning: string;
  submittedAt: string;
};

export type SecretRoleHostView = {
  round: SecretRoleRound;
  cards: Array<Omit<SecretRoleCard, "copies">>;
  assignments: Array<SecretRoleAssignment & { readyAt: string | null }>;
  responses: SecretRoleResponse[];
};

function requireServiceRoleClient() {
  const supabase = createServiceRoleSupabase();
  if (!supabase) {
    throw new Error("Secret Roles persistence is unavailable. Configure Supabase service access.");
  }
  return supabase;
}

export function createSecretRoleRoundId(nowMs: number = Date.now()): string {
  return `srr_${nowMs}_${Math.random().toString(36).slice(2, 9)}`;
}

function persistedCardId(roundId: string, sourceCardId: string): string {
  return `${roundId}:${sourceCardId}`;
}

function mapRound(row: Record<string, unknown>): SecretRoleRound {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    title: row.title as string,
    scenario: (row.scenario as string) ?? "",
    learningObjective: (row.learning_objective as string) ?? "",
    successCriteria: (row.success_criteria as string) ?? "",
    discussionPrompt: (row.discussion_prompt as string) ?? "",
    phase: row.phase as SecretRolePhase,
  };
}

export async function createSecretRoleRound(input: {
  sessionId: string;
  createdBy: string;
  draft: SecretRoleLaunchDraft;
  students: SecretRoleStudent[];
}): Promise<SecretRoleHostView> {
  const roundId = createSecretRoleRoundId();
  const sourceAssignments = assignSecretRoles({
    students: input.students,
    cards: input.draft.cards,
    seed: roundId,
  });
  const cards = input.draft.cards.map((card, position) => ({
    id: persistedCardId(roundId, card.id),
    title: card.title.trim(),
    private_information: card.privateInformation.trim(),
    mission: card.mission.trim(),
    sentence_frames: card.sentenceFrames.map((frame) => frame.trim()).filter(Boolean),
    position,
  }));
  const assignments = sourceAssignments.map((assignment) => ({
    student_id: assignment.studentId,
    display_name: assignment.displayName,
    card_id: persistedCardId(roundId, assignment.cardId),
  }));
  const supabase = requireServiceRoleClient();
  const { error } = await supabase.rpc("create_secret_role_round", {
    p_round: {
      id: roundId,
      sessionId: input.sessionId,
      createdBy: input.createdBy,
      title: input.draft.title.trim(),
      scenario: input.draft.scenario.trim(),
      learningObjective: input.draft.learningObjective.trim(),
      successCriteria: input.draft.successCriteria.trim(),
      discussionPrompt: input.draft.discussionPrompt.trim(),
      settings: { assignmentStrategy: "deterministic_balanced_v1" },
    },
    p_cards: cards,
    p_assignments: assignments,
  });
  if (error) throw error;
  const view = await getSecretRoleHostView(roundId);
  if (!view) throw new Error("Secret Roles round was created but could not be loaded.");
  return view;
}

export async function getActiveSecretRoleRoundForSession(
  sessionId: string,
): Promise<SecretRoleRound | null> {
  const supabase = requireServiceRoleClient();
  const { data, error } = await supabase
    .from("secret_role_rounds")
    .select("*")
    .eq("session_id", sessionId)
    .neq("phase", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRound(data as Record<string, unknown>) : null;
}

export async function getSecretRoleRound(roundId: string): Promise<SecretRoleRound | null> {
  const supabase = requireServiceRoleClient();
  const { data, error } = await supabase
    .from("secret_role_rounds")
    .select("*")
    .eq("id", roundId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRound(data as Record<string, unknown>) : null;
}

async function listCards(roundId: string): Promise<Array<Omit<SecretRoleCard, "copies">>> {
  const supabase = requireServiceRoleClient();
  const { data, error } = await supabase
    .from("secret_role_cards")
    .select("id,title,private_information,mission,sentence_frames_json")
    .eq("round_id", roundId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    privateInformation: row.private_information as string,
    mission: row.mission as string,
    sentenceFrames: Array.isArray(row.sentence_frames_json)
      ? (row.sentence_frames_json as string[]).filter((item) => typeof item === "string")
      : [],
  }));
}

async function listAssignments(
  roundId: string,
): Promise<Array<SecretRoleAssignment & { readyAt: string | null }>> {
  const supabase = requireServiceRoleClient();
  const { data, error } = await supabase
    .from("secret_role_assignments")
    .select("student_id,display_name,card_id,ready_at")
    .eq("round_id", roundId)
    .order("display_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    studentId: row.student_id as string,
    displayName: row.display_name as string,
    cardId: row.card_id as string,
    readyAt: (row.ready_at as string | null) ?? null,
  }));
}

async function listResponses(roundId: string): Promise<SecretRoleResponse[]> {
  const supabase = requireServiceRoleClient();
  const { data, error } = await supabase
    .from("secret_role_responses")
    .select("student_id,answer,reasoning,submitted_at")
    .eq("round_id", roundId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    studentId: row.student_id as string,
    answer: row.answer as string,
    reasoning: row.reasoning as string,
    submittedAt: row.submitted_at as string,
  }));
}

export async function getSecretRoleHostView(roundId: string): Promise<SecretRoleHostView | null> {
  const round = await getSecretRoleRound(roundId);
  if (!round) return null;
  const [cards, assignments, responses] = await Promise.all([
    listCards(roundId),
    listAssignments(roundId),
    listResponses(roundId),
  ]);
  return { round, cards, assignments, responses };
}

export async function getSecretRoleStudentView(
  roundId: string,
  studentId: string,
): Promise<SecretRoleStudentView | null> {
  const round = await getSecretRoleRound(roundId);
  if (!round) return null;
  const supabase = requireServiceRoleClient();
  const { data: assignment, error: assignmentError } = await supabase
    .from("secret_role_assignments")
    .select("student_id,display_name,card_id")
    .eq("round_id", roundId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (assignmentError) throw assignmentError;
  if (!assignment) return null;
  const { data: card, error: cardError } = await supabase
    .from("secret_role_cards")
    .select("id,title,private_information,mission,sentence_frames_json")
    .eq("round_id", roundId)
    .eq("id", assignment.card_id as string)
    .maybeSingle();
  if (cardError) throw cardError;
  if (!card) return null;
  const view = toSecretRoleStudentView({
    round,
    cards: [{
      id: card.id as string,
      title: card.title as string,
      privateInformation: card.private_information as string,
      mission: card.mission as string,
      sentenceFrames: Array.isArray(card.sentence_frames_json)
        ? (card.sentence_frames_json as string[]).filter((item) => typeof item === "string")
        : [],
      copies: 1,
    }],
    assignments: [{
      studentId: assignment.student_id as string,
      displayName: assignment.display_name as string,
      cardId: assignment.card_id as string,
    }],
    studentId,
  });
  if (
    view &&
    (round.phase === "reveal" || round.phase === "debrief" || round.phase === "completed")
  ) {
    view.revealedRoles = await listCards(roundId);
  }
  return view;
}

export async function markSecretRoleReady(roundId: string, studentId: string): Promise<void> {
  const supabase = requireServiceRoleClient();
  const { error } = await supabase
    .from("secret_role_assignments")
    .update({ ready_at: new Date().toISOString() })
    .eq("round_id", roundId)
    .eq("student_id", studentId);
  if (error) throw error;
}

export async function assignSecretRoleLateJoiner(input: {
  roundId: string;
  student: SecretRoleStudent;
}): Promise<SecretRoleHostView> {
  const view = await getSecretRoleHostView(input.roundId);
  if (!view) throw new Error("Secret Roles round not found.");
  if (view.round.phase === "completed") throw new Error("This round is complete.");
  if (view.assignments.some((assignment) => assignment.studentId === input.student.id)) {
    return view;
  }
  const counts = new Map(view.cards.map((card) => [card.id, 0]));
  view.assignments.forEach((assignment) => {
    counts.set(assignment.cardId, (counts.get(assignment.cardId) ?? 0) + 1);
  });
  const selected = [...view.cards].sort(
    (a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0),
  )[0];
  if (!selected) throw new Error("No role card is available for the late joiner.");
  const supabase = requireServiceRoleClient();
  const { error } = await supabase.from("secret_role_assignments").insert({
    round_id: input.roundId,
    student_id: input.student.id.trim(),
    display_name: input.student.displayName.trim(),
    card_id: selected.id,
  });
  if (error) throw error;
  const updated = await getSecretRoleHostView(input.roundId);
  if (!updated) throw new Error("Late-join assignment could not be loaded.");
  return updated;
}

export async function submitSecretRoleResponse(input: {
  roundId: string;
  studentId: string;
  answer: string;
  reasoning: string;
}): Promise<void> {
  const round = await getSecretRoleRound(input.roundId);
  if (!round || round.phase !== "decision") {
    throw new Error("Responses are only open during the Decision phase.");
  }
  const supabase = requireServiceRoleClient();
  const { error } = await supabase.from("secret_role_responses").upsert({
    round_id: input.roundId,
    student_id: input.studentId,
    answer: input.answer.trim().slice(0, 500),
    reasoning: input.reasoning.trim().slice(0, 1000),
    submitted_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function transitionSecretRolePhase(
  roundId: string,
  next: SecretRolePhase,
): Promise<SecretRoleRound> {
  const current = await getSecretRoleRound(roundId);
  if (!current) throw new Error("Secret Roles round not found.");
  if (!canTransitionSecretRolePhase(current.phase, next)) {
    throw new Error(`Cannot move from ${current.phase} to ${next}.`);
  }
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { phase: next, updated_at: now };
  if (next === "discussion") patch.opened_at = now;
  if (next === "reveal") patch.revealed_at = now;
  if (next === "completed") patch.completed_at = now;
  const supabase = requireServiceRoleClient();
  const { data, error } = await supabase
    .from("secret_role_rounds")
    .update(patch)
    .eq("id", roundId)
    .eq("phase", current.phase)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("The round changed; refresh and try again.");
  return mapRound(data as Record<string, unknown>);
}
