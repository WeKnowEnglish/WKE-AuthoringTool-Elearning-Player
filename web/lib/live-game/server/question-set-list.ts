import "server-only";

import type {
  LiveGameQuestionSetCard,
  LiveGameQuestionSetSummaryFromDb,
} from "@/lib/live-game/question-banks/types";
import { totalQuestionCount } from "@/lib/live-game/question-banks/question-set-card-utils";
import { fetchPublishedSetSummaries } from "@/lib/live-game/server/question-set-repository";

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

export async function listPublishedQuestionSetsForHost(): Promise<LiveGameQuestionSetCard[]> {
  const fromDb = await fetchPublishedSetSummaries();
  return fromDb.map(mapSummaryToCard);
}
