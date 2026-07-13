import "server-only";

import { parseQuestionPayload } from "@/lib/live-game/question-banks/schemas";
import type {
  LiveGameQuestionBank,
  LiveGameQuestionPayload,
  LiveGameQuestionRow,
  LiveGameQuestionSetEditorPayload,
  LiveGameQuestionSetRow,
} from "@/lib/live-game/question-banks/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapSetRow } from "@/lib/live-game/server/question-set-access";

type QuestionDbRow = {
  id: string;
  set_id: string;
  bank: LiveGameQuestionBank;
  sort_order: number;
  prompt: string;
  payload: unknown;
  enabled: boolean;
  legacy_source_id: string | null;
};

const SET_COLUMNS =
  "id, slug, title, level, topic, learning_objective, description, version, status, visibility, sort_order, created_by";

const QUESTION_COLUMNS =
  "id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id";

function mapQuestionRow(row: QuestionDbRow): LiveGameQuestionRow {
  return {
    id: row.id,
    setId: row.set_id,
    bank: row.bank,
    sortOrder: row.sort_order,
    prompt: row.prompt,
    payload: parseQuestionPayload(row.payload),
    enabled: row.enabled,
    legacySourceId: row.legacy_source_id,
  };
}

function groupAllQuestionsByBank(questions: LiveGameQuestionRow[]): LiveGameQuestionSetEditorPayload["questions"] {
  const harvest: LiveGameQuestionRow[] = [];
  const deposit: LiveGameQuestionRow[] = [];
  const craft: LiveGameQuestionRow[] = [];
  for (const question of questions) {
    if (question.bank === "harvest") harvest.push(question);
    else if (question.bank === "deposit") deposit.push(question);
    else craft.push(question);
  }
  const sortFn = (a: LiveGameQuestionRow, b: LiveGameQuestionRow) => a.sortOrder - b.sortOrder;
  harvest.sort(sortFn);
  deposit.sort(sortFn);
  craft.sort(sortFn);
  return { harvest, deposit, craft };
}

export async function fetchQuestionSetForEditor(
  supabase: SupabaseClient,
  setId: string,
): Promise<LiveGameQuestionSetEditorPayload | null> {
  const { data: setData, error: setError } = await supabase
    .from("live_game_question_sets")
    .select(SET_COLUMNS)
    .eq("id", setId)
    .maybeSingle();
  if (setError || !setData) return null;

  const { data: questionData, error: questionError } = await supabase
    .from("live_game_questions")
    .select(QUESTION_COLUMNS)
    .eq("set_id", setId)
    .order("bank", { ascending: true })
    .order("sort_order", { ascending: true });
  if (questionError || !questionData) return null;

  const questions = (questionData as QuestionDbRow[]).map(mapQuestionRow);
  return {
    set: mapSetRow(setData),
    questions: groupAllQuestionsByBank(questions),
  };
}

export async function updateQuestionSetMetadata(
  supabase: SupabaseClient,
  setId: string,
  patch: Partial<{
    title: string;
    level: "A1" | "A2";
    topic: string;
    learningObjective: string;
    description: string;
  }>,
): Promise<LiveGameQuestionSetRow | null> {
  const row: Record<string, string> = {};
  if (patch.title != null) row.title = patch.title;
  if (patch.level != null) row.level = patch.level;
  if (patch.topic != null) row.topic = patch.topic;
  if (patch.learningObjective != null) row.learning_objective = patch.learningObjective;
  if (patch.description != null) row.description = patch.description;
  if (Object.keys(row).length === 0) return null;

  row.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("live_game_question_sets")
    .update(row)
    .eq("id", setId)
    .select(SET_COLUMNS)
    .maybeSingle();
  if (error || !data) return null;
  return mapSetRow(data);
}

export async function getMaxSortOrderForBank(
  supabase: SupabaseClient,
  setId: string,
  bank: LiveGameQuestionBank,
): Promise<number> {
  const { data } = await supabase
    .from("live_game_questions")
    .select("sort_order")
    .eq("set_id", setId)
    .eq("bank", bank)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return typeof data?.sort_order === "number" ? data.sort_order : -1;
}

export async function insertQuestionRow(
  supabase: SupabaseClient,
  input: {
    setId: string;
    bank: LiveGameQuestionBank;
    prompt: string;
    payload: LiveGameQuestionPayload;
    enabled?: boolean;
    sortOrder: number;
  },
): Promise<LiveGameQuestionRow | null> {
  const { data, error } = await supabase
    .from("live_game_questions")
    .insert({
      id: crypto.randomUUID(),
      set_id: input.setId,
      bank: input.bank,
      sort_order: input.sortOrder,
      prompt: input.prompt,
      payload: input.payload,
      enabled: input.enabled ?? true,
      legacy_source_id: null,
      updated_at: new Date().toISOString(),
    })
    .select(QUESTION_COLUMNS)
    .single();
  if (error || !data) return null;
  return mapQuestionRow(data as QuestionDbRow);
}

export async function updateQuestionRow(
  supabase: SupabaseClient,
  setId: string,
  questionId: string,
  patch: Partial<{
    prompt: string;
    payload: LiveGameQuestionPayload;
    enabled: boolean;
  }>,
): Promise<LiveGameQuestionRow | null> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.prompt != null) row.prompt = patch.prompt;
  if (patch.payload != null) row.payload = patch.payload;
  if (patch.enabled != null) row.enabled = patch.enabled;

  const { data, error } = await supabase
    .from("live_game_questions")
    .update(row)
    .eq("id", questionId)
    .eq("set_id", setId)
    .select(QUESTION_COLUMNS)
    .maybeSingle();
  if (error || !data) return null;
  return mapQuestionRow(data as QuestionDbRow);
}

export async function deleteQuestionRow(
  supabase: SupabaseClient,
  setId: string,
  questionId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("live_game_questions")
    .delete()
    .eq("id", questionId)
    .eq("set_id", setId);
  return !error;
}

export async function reorderQuestionRows(
  supabase: SupabaseClient,
  setId: string,
  bank: LiveGameQuestionBank,
  items: Array<{ id: string; sortOrder: number }>,
): Promise<boolean> {
  for (const item of items) {
    const { error } = await supabase
      .from("live_game_questions")
      .update({ sort_order: item.sortOrder, updated_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("set_id", setId)
      .eq("bank", bank);
    if (error) return false;
  }
  return true;
}

export async function publishQuestionSetRow(
  supabase: SupabaseClient,
  setId: string,
  nextVersion: number,
): Promise<LiveGameQuestionSetRow | null> {
  const { data, error } = await supabase
    .from("live_game_question_sets")
    .update({
      status: "published",
      version: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", setId)
    .select(SET_COLUMNS)
    .maybeSingle();
  if (error || !data) return null;
  return mapSetRow(data);
}
