import type {
  PrimaryVocabularySearchFilters,
  PrimaryVocabularySearchIndexEntry,
} from "./types";

function asArray<T>(value: T | T[] | undefined): T[] | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value : [value];
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function matchesQuery(entry: PrimaryVocabularySearchIndexEntry, query: string): boolean {
  const q = normalizeQuery(query);
  if (!q) return true;
  const haystacks = [
    entry.lemma,
    entry.normalizedLemma,
    entry.id,
    entry.pos,
    entry.primaryStageCandidate,
    entry.cefrBandCandidate,
    entry.primaryTopic,
    entry.vocabularyLane,
    ...entry.topics,
  ];
  return haystacks.some((raw) => {
    const value = raw.toLowerCase();
    if (value.includes(q)) return true;
    const spaced = value.replace(/[_-]+/g, " ");
    if (spaced.includes(q)) return true;
    const collapsed = spaced.replace(/\s+/g, "");
    const qCollapsed = q.replace(/[\s_-]+/g, "");
    return qCollapsed.length >= 2 && collapsed.includes(qCollapsed);
  });
}

function matchesOneOf<T>(value: T, allowed: T[] | undefined): boolean {
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(value);
}

function matchesTopicFilter(
  entry: PrimaryVocabularySearchIndexEntry,
  primaryTopic: string[] | undefined,
  topics: string[] | undefined,
): boolean {
  if (primaryTopic && primaryTopic.length > 0) {
    if (!primaryTopic.includes(entry.primaryTopic)) return false;
  }
  if (topics && topics.length > 0) {
    const hit = topics.some((t) => entry.topics.includes(t) || entry.primaryTopic === t);
    if (!hit) return false;
  }
  return true;
}

/**
 * Filter the slim search index in memory.
 * Designed for teacher pack authoring: fast, descriptor-driven.
 */
export function searchPrimaryVocabularyIndex(
  entries: readonly PrimaryVocabularySearchIndexEntry[],
  filters: PrimaryVocabularySearchFilters = {},
  options?: { limit?: number },
): PrimaryVocabularySearchIndexEntry[] {
  const pos = asArray(filters.pos);
  const stages = asArray(filters.primaryStageCandidate);
  const bands = asArray(filters.cefrBandCandidate);
  const primaryTopic = asArray(filters.primaryTopic);
  const topics = asArray(filters.topics);
  const lanes = asArray(filters.vocabularyLane);
  const status = asArray(filters.status);
  const reviewStatus = asArray(filters.reviewStatus);
  const limit = options?.limit;

  const out: PrimaryVocabularySearchIndexEntry[] = [];
  for (const entry of entries) {
    if (filters.query && !matchesQuery(entry, filters.query)) continue;
    if (!matchesOneOf(entry.pos, pos)) continue;
    if (!matchesOneOf(entry.primaryStageCandidate, stages)) continue;
    if (!matchesOneOf(entry.cefrBandCandidate, bands)) continue;
    if (!matchesTopicFilter(entry, primaryTopic, topics)) continue;
    if (!matchesOneOf(entry.vocabularyLane, lanes)) continue;
    if (!matchesOneOf(entry.status, status)) continue;
    if (!matchesOneOf(entry.reviewStatus, reviewStatus)) continue;
    out.push(entry);
    if (limit != null && out.length >= limit) break;
  }
  return out;
}

/** Distinct facet values for building teacher filter UIs. */
export function collectPrimaryVocabularyFacets(
  entries: readonly PrimaryVocabularySearchIndexEntry[],
): {
  pos: string[];
  primaryStageCandidate: string[];
  cefrBandCandidate: string[];
  primaryTopic: string[];
  vocabularyLane: string[];
  status: string[];
  reviewStatus: string[];
} {
  const sets = {
    pos: new Set<string>(),
    primaryStageCandidate: new Set<string>(),
    cefrBandCandidate: new Set<string>(),
    primaryTopic: new Set<string>(),
    vocabularyLane: new Set<string>(),
    status: new Set<string>(),
    reviewStatus: new Set<string>(),
  };
  for (const e of entries) {
    sets.pos.add(e.pos);
    sets.primaryStageCandidate.add(e.primaryStageCandidate);
    sets.cefrBandCandidate.add(e.cefrBandCandidate);
    sets.primaryTopic.add(e.primaryTopic);
    sets.vocabularyLane.add(e.vocabularyLane);
    sets.status.add(e.status);
    sets.reviewStatus.add(e.reviewStatus);
  }
  const sort = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b));
  return {
    pos: sort(sets.pos),
    primaryStageCandidate: sort(sets.primaryStageCandidate),
    cefrBandCandidate: sort(sets.cefrBandCandidate),
    primaryTopic: sort(sets.primaryTopic),
    vocabularyLane: sort(sets.vocabularyLane),
    status: sort(sets.status),
    reviewStatus: sort(sets.reviewStatus),
  };
}
