import type { PrimaryVocabularySearchIndexEntry } from "@/lib/vocabulary/primary-candidates";

export type MasterLexiconOverride = {
  id: string;
  primaryTopic: string | null;
  topics: string[];
  primaryStage: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
};

/** Normalize a topic/tag slug: lowercase, spaces → underscores. */
export function normalizeTopicTag(raw: string): string | null {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
  return cleaned.length > 0 ? cleaned : null;
}

export function parseTopicsInput(raw: string): string[] {
  const parts = raw.split(/[,;]+/);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const tag = normalizeTopicTag(part);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= 12) break;
  }
  return out;
}

export function formatTopicsForInput(topics: readonly string[]): string {
  return topics.join(", ");
}

export function applyMasterOverrides(
  entries: readonly PrimaryVocabularySearchIndexEntry[],
  overrides: readonly MasterLexiconOverride[],
): PrimaryVocabularySearchIndexEntry[] {
  if (overrides.length === 0) return [...entries];
  const byId = new Map(overrides.map((o) => [o.id, o]));
  return entries.map((entry) => {
    const override = byId.get(entry.id);
    if (!override) return entry;
    const primaryTopic = override.primaryTopic?.trim() || entry.primaryTopic;
    const topics =
      override.topics.length > 0
        ? override.topics
        : primaryTopic
          ? [primaryTopic]
          : entry.topics;
    const primaryStageCandidate = (override.primaryStage ||
      entry.primaryStageCandidate) as PrimaryVocabularySearchIndexEntry["primaryStageCandidate"];
    return {
      ...entry,
      primaryTopic,
      topics,
      primaryStageCandidate,
    };
  });
}

export function entryMatchesTopicFilter(
  entry: PrimaryVocabularySearchIndexEntry,
  topic: string,
  mode: "primary" | "contains" | "both",
): boolean {
  const t = normalizeTopicTag(topic) ?? topic.trim().toLowerCase();
  if (!t) return true;
  const primary = entry.primaryTopic.toLowerCase();
  const inTopics = entry.topics.some(
    (x) => x.toLowerCase() === t || x.toLowerCase().includes(t) || t.includes(x.toLowerCase()),
  );
  const primaryHit = primary === t || primary.includes(t) || t.includes(primary);
  if (mode === "primary") return primaryHit;
  if (mode === "contains") return inTopics || primaryHit;
  return primaryHit || inTopics;
}
