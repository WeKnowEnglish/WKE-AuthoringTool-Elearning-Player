import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { parseQuestionPayload } from "@/lib/live-game/question-banks/schemas";
import type {
  LiveGameQuestionBank,
  LiveGameQuestionRow,
  LiveGameQuestionSetSnapshot,
  LiveGameQuestionSetSummaryFromDb,
} from "@/lib/live-game/question-banks/types";

type QuestionSetDbRow = {
  id: string;
  slug: string;
  title: string;
  level: "A1" | "A2";
  topic: string;
  learning_objective: string;
  description: string;
  version: number;
  status: "draft" | "published";
  visibility: "system" | "teacher";
  sort_order: number;
};

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
  "id, slug, title, level, topic, learning_objective, description, version, status, visibility, sort_order";

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

function groupQuestionsByBank(questions: LiveGameQuestionRow[]): {
  harvest: LiveGameQuestionRow[];
  deposit: LiveGameQuestionRow[];
  craft: LiveGameQuestionRow[];
} {
  const harvest: LiveGameQuestionRow[] = [];
  const deposit: LiveGameQuestionRow[] = [];
  const craft: LiveGameQuestionRow[] = [];
  for (const question of questions) {
    if (!question.enabled) continue;
    if (question.bank === "harvest") harvest.push(question);
    else if (question.bank === "deposit") deposit.push(question);
    else craft.push(question);
  }
  harvest.sort((a, b) => a.sortOrder - b.sortOrder);
  deposit.sort((a, b) => a.sortOrder - b.sortOrder);
  craft.sort((a, b) => a.sortOrder - b.sortOrder);
  return { harvest, deposit, craft };
}

function mapSnapshot(setRow: QuestionSetDbRow, questions: LiveGameQuestionRow[]): LiveGameQuestionSetSnapshot {
  const banks = groupQuestionsByBank(questions);
  return {
    id: setRow.id,
    slug: setRow.slug,
    title: setRow.title,
    level: setRow.level,
    topic: setRow.topic,
    learningObjective: setRow.learning_objective,
    description: setRow.description,
    version: setRow.version,
    status: setRow.status,
    visibility: setRow.visibility,
    sortOrder: setRow.sort_order,
    harvest: banks.harvest,
    deposit: banks.deposit,
    craft: banks.craft,
  };
}

async function readPublishedSet(
  filter: { column: "id" | "slug"; value: string },
): Promise<LiveGameQuestionSetSnapshot | null> {
  const client = createServiceRoleSupabase();
  if (!client) {
    return null;
  }

  let setQuery = client
    .from("live_game_question_sets")
    .select(SET_COLUMNS)
    .eq("status", "published")
    .eq(filter.column, filter.value);

  const { data: setData, error: setError } = await setQuery.maybeSingle();
  if (setError || !setData) {
    return null;
  }

  const setRow = setData as QuestionSetDbRow;
  const { data: questionData, error: questionError } = await client
    .from("live_game_questions")
    .select(QUESTION_COLUMNS)
    .eq("set_id", setRow.id)
    .order("bank", { ascending: true })
    .order("sort_order", { ascending: true });

  if (questionError || !questionData) {
    return null;
  }

  const questions = (questionData as QuestionDbRow[]).map(mapQuestionRow);
  return mapSnapshot(setRow, questions);
}

export async function fetchPublishedSetBySlug(
  slug: string,
): Promise<LiveGameQuestionSetSnapshot | null> {
  return readPublishedSet({ column: "slug", value: slug });
}

export async function fetchPublishedSetById(
  id: string,
): Promise<LiveGameQuestionSetSnapshot | null> {
  return readPublishedSet({ column: "id", value: id });
}

export async function fetchPublishedSetSummaries(): Promise<LiveGameQuestionSetSummaryFromDb[]> {
  const client = createServiceRoleSupabase();
  if (!client) {
    return [];
  }

  const { data: sets, error } = await client
    .from("live_game_question_sets")
    .select(SET_COLUMNS)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error || !sets) {
    return [];
  }

  const summaries: LiveGameQuestionSetSummaryFromDb[] = [];
  for (const rawSet of sets as QuestionSetDbRow[]) {
    const { data: questions, error: questionError } = await client
      .from("live_game_questions")
      .select("bank")
      .eq("set_id", rawSet.id)
      .eq("enabled", true);

    if (questionError || !questions) continue;

    const counts = { harvest: 0, deposit: 0, craft: 0 };
    for (const row of questions as Array<{ bank: LiveGameQuestionBank }>) {
      counts[row.bank] += 1;
    }

    summaries.push({
      id: rawSet.id,
      slug: rawSet.slug,
      title: rawSet.title,
      level: rawSet.level,
      topic: rawSet.topic,
      learningObjective: rawSet.learning_objective,
      description: rawSet.description,
      version: rawSet.version,
      visibility: rawSet.visibility,
      harvestCount: counts.harvest,
      depositCount: counts.deposit,
      craftCount: counts.craft,
    });
  }

  return summaries;
}
