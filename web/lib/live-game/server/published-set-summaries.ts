/**
 * Published question-set summary loading for the teacher host setup page.
 *
 * Preferred strategy: one SQL RPC with grouped bank counts.
 * Fallback: two queries (sets metadata + one batched set_id/bank select).
 * Never N+1 (one awaited query per set).
 */

import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import type {
  LiveGameQuestionBank,
  LiveGameQuestionSetSummaryFromDb,
} from "@/lib/live-game/question-banks/types";

export type PublishedSetSummaryQueryStrategy =
  | "rpc_aggregate"
  | "two_query_batch"
  | "empty_service"
  | "empty_result";

export type FetchPublishedSetSummariesMeta = {
  summaries: LiveGameQuestionSetSummaryFromDb[];
  queryCount: number;
  queryStrategy: PublishedSetSummaryQueryStrategy;
  resultCount: number;
};

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

type RpcSummaryRow = {
  id: string;
  slug: string;
  title: string;
  level: "A1" | "A2";
  topic: string;
  learning_objective: string;
  description: string;
  version: number;
  visibility: "system" | "teacher";
  sort_order: number;
  harvest_count: number;
  deposit_count: number;
  craft_count: number;
};

const SET_COLUMNS =
  "id, slug, title, level, topic, learning_objective, description, version, status, visibility, sort_order";

function mapRowToSummary(
  raw: {
    id: string;
    slug: string;
    title: string;
    level: "A1" | "A2";
    topic: string;
    learningObjective: string;
    description: string;
    version: number;
    visibility: "system" | "teacher";
    harvestCount: number;
    depositCount: number;
    craftCount: number;
  },
): LiveGameQuestionSetSummaryFromDb {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    level: raw.level,
    topic: raw.topic,
    learningObjective: raw.learningObjective,
    description: raw.description,
    version: raw.version,
    visibility: raw.visibility,
    harvestCount: raw.harvestCount,
    depositCount: raw.depositCount,
    craftCount: raw.craftCount,
  };
}

function mapRpcRow(row: RpcSummaryRow): LiveGameQuestionSetSummaryFromDb {
  return mapRowToSummary({
    id: row.id,
    slug: row.slug,
    title: row.title,
    level: row.level,
    topic: row.topic,
    learningObjective: row.learning_objective,
    description: row.description,
    version: row.version,
    visibility: row.visibility,
    harvestCount: Number(row.harvest_count) || 0,
    depositCount: Number(row.deposit_count) || 0,
    craftCount: Number(row.craft_count) || 0,
  });
}

/**
 * Batched fallback: 1 sets query + 1 bank-row query (no per-set await).
 * Transfers only `{ set_id, bank }` — never prompts or payloads.
 */
async function fetchSummariesTwoQueryBatch(
  client: NonNullable<ReturnType<typeof createServiceRoleSupabase>>,
): Promise<FetchPublishedSetSummariesMeta> {
  const { data: sets, error } = await client
    .from("live_game_question_sets")
    .select(SET_COLUMNS)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error || !sets) {
    return {
      summaries: [],
      queryCount: 1,
      queryStrategy: "empty_result",
      resultCount: 0,
    };
  }

  const setRows = sets as QuestionSetDbRow[];
  if (setRows.length === 0) {
    return {
      summaries: [],
      queryCount: 1,
      queryStrategy: "empty_result",
      resultCount: 0,
    };
  }

  const setIds = setRows.map((row) => row.id);
  const { data: bankRows, error: bankError } = await client
    .from("live_game_questions")
    .select("set_id, bank")
    .eq("enabled", true)
    .in("set_id", setIds);

  const countsBySet = new Map<string, { harvest: number; deposit: number; craft: number }>();
  for (const id of setIds) {
    countsBySet.set(id, { harvest: 0, deposit: 0, craft: 0 });
  }

  if (!bankError && bankRows) {
    for (const row of bankRows as Array<{ set_id: string; bank: LiveGameQuestionBank }>) {
      const counts = countsBySet.get(row.set_id);
      if (!counts) continue;
      if (row.bank === "harvest" || row.bank === "deposit" || row.bank === "craft") {
        counts[row.bank] += 1;
      }
    }
  }

  const summaries = setRows.map((rawSet) => {
    const counts = countsBySet.get(rawSet.id) ?? { harvest: 0, deposit: 0, craft: 0 };
    return mapRowToSummary({
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
  });

  return {
    summaries,
    queryCount: 2,
    queryStrategy: "two_query_batch",
    resultCount: summaries.length,
  };
}

async function fetchSummariesViaRpc(
  client: NonNullable<ReturnType<typeof createServiceRoleSupabase>>,
): Promise<FetchPublishedSetSummariesMeta | null> {
  const { data, error } = await client.rpc("list_live_game_published_question_set_summaries");
  if (error || !data) {
    return null;
  }

  const summaries = (data as RpcSummaryRow[]).map(mapRpcRow);
  return {
    summaries,
    queryCount: 1,
    queryStrategy: "rpc_aggregate",
    resultCount: summaries.length,
  };
}

export async function fetchPublishedSetSummariesWithMeta(): Promise<FetchPublishedSetSummariesMeta> {
  const client = createServiceRoleSupabase();
  if (!client) {
    return {
      summaries: [],
      queryCount: 0,
      queryStrategy: "empty_service",
      resultCount: 0,
    };
  }

  const viaRpc = await fetchSummariesViaRpc(client);
  if (viaRpc) return viaRpc;

  return fetchSummariesTwoQueryBatch(client);
}

/** @deprecated Prefer fetchPublishedSetSummariesWithMeta when query strategy is needed. */
export async function fetchPublishedSetSummaries(): Promise<LiveGameQuestionSetSummaryFromDb[]> {
  const result = await fetchPublishedSetSummariesWithMeta();
  return result.summaries;
}

/** Pure helper used by tests to assert summary payload safety. */
export function publishedSetSummaryContainsQuestionContent(
  value: unknown,
): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const forbidden = [
    "prompt",
    "payload",
    "options",
    "answer",
    "answerKey",
    "correctIndex",
    "harvest",
    "deposit",
    "craft",
    "questions",
  ];
  return forbidden.some((key) => key in record);
}
