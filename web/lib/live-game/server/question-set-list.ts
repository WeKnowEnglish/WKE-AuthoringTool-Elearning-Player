import "server-only";

import type {
  LiveGameQuestionSetCard,
  LiveGameQuestionSetSummaryFromDb,
} from "@/lib/live-game/question-banks/types";
import { totalQuestionCount } from "@/lib/live-game/question-banks/question-set-card-utils";
import {
  fetchPublishedSetSummariesWithMeta,
  type PublishedSetSummaryQueryStrategy,
} from "@/lib/live-game/server/published-set-summaries";

function mapSummaryToCard(summary: LiveGameQuestionSetSummaryFromDb): LiveGameQuestionSetCard {
  return {
    id: summary.id,
    slug: summary.slug,
    title: summary.title,
    level: summary.level,
    topic: summary.topic,
    learningObjective: summary.learningObjective,
    description: summary.description,
    version: summary.version,
    visibility: summary.visibility,
    harvestCount: summary.harvestCount,
    depositCount: summary.depositCount,
    craftCount: summary.craftCount,
    questionCount: totalQuestionCount(summary),
  };
}

export type ListPublishedQuestionSetsForHostResult = {
  sets: LiveGameQuestionSetCard[];
  queryCount: number;
  queryStrategy: PublishedSetSummaryQueryStrategy;
  resultCount: number;
};

export async function listPublishedQuestionSetsForHostWithMeta(): Promise<ListPublishedQuestionSetsForHostResult> {
  const fromDb = await fetchPublishedSetSummariesWithMeta();
  const sets = fromDb.summaries.map(mapSummaryToCard);
  return {
    sets,
    queryCount: fromDb.queryCount,
    queryStrategy: fromDb.queryStrategy,
    resultCount: sets.length,
  };
}

export async function listPublishedQuestionSetsForHost(): Promise<LiveGameQuestionSetCard[]> {
  const result = await listPublishedQuestionSetsForHostWithMeta();
  return result.sets;
}
