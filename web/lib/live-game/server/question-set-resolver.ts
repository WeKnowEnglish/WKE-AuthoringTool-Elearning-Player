import "server-only";

import { hashSeed } from "@/lib/live-game/question-banks/hash-seed";
import {
  isCraftOrderCorrect as validateCraftOrder,
  isDepositSpellCorrect as validateDepositSpell,
  isHarvestAnswerCorrect as validateHarvestAnswer,
} from "@/lib/live-game/question-banks/schemas";
import {
  resolveQuestionSetSlug,
  resolveQuestionSetUuid,
} from "@/lib/live-game/question-banks/question-set-ids";
import type {
  LiveGameQuestionBank,
  LiveGameQuestionRow,
  LiveGameQuestionSetSnapshot,
} from "@/lib/live-game/question-banks/types";
import {
  fetchPublishedSetById,
  fetchPublishedSetBySlug,
} from "@/lib/live-game/server/question-set-repository";
import {
  findQuestionInSnapshot,
  getCraftPayload,
  getDepositPayload,
  getHarvestPayload,
} from "@/lib/live-game/server/question-set-snapshot";
import { listPublishedQuestionSetsForHost } from "@/lib/live-game/server/question-set-list";

export class QuestionSetNotFoundError extends Error {
  constructor(readonly ref: string) {
    super(`Question set not found: ${ref}`);
    this.name = "QuestionSetNotFoundError";
  }
}

export class QuestionSetVersionMismatchError extends Error {
  constructor(
    readonly ref: string,
    readonly requestedVersion: number,
    readonly availableVersion: number,
  ) {
    super(
      `Question set ${ref} version mismatch: requested v${requestedVersion}, available v${availableVersion}`,
    );
    this.name = "QuestionSetVersionMismatchError";
  }
}

const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  expiresAt: number;
  snapshot: LiveGameQuestionSetSnapshot;
};

const snapshotCache = new Map<string, CacheEntry>();

function cacheKey(snapshot: LiveGameQuestionSetSnapshot): string {
  return `${snapshot.id}:v${snapshot.version}`;
}

function readCache(ref: string, version?: number): LiveGameQuestionSetSnapshot | null {
  for (const entry of snapshotCache.values()) {
    if (entry.expiresAt <= Date.now()) continue;
    const snapshot = entry.snapshot;
    const matchesRef =
      snapshot.id === ref ||
      snapshot.slug === ref ||
      resolveQuestionSetUuid(ref) === snapshot.id;
    if (!matchesRef) continue;
    if (version != null && snapshot.version !== version) continue;
    return snapshot;
  }
  return null;
}

function writeCache(snapshot: LiveGameQuestionSetSnapshot) {
  snapshotCache.set(cacheKey(snapshot), {
    snapshot,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

async function loadSnapshotFromDb(ref: string): Promise<LiveGameQuestionSetSnapshot | null> {
  const slug = resolveQuestionSetSlug(ref);
  if (slug) {
    const bySlug = await fetchPublishedSetBySlug(slug);
    if (bySlug) return bySlug;
  }
  const uuid = resolveQuestionSetUuid(ref);
  if (uuid) {
    return fetchPublishedSetById(uuid);
  }
  return null;
}

export async function getQuestionSetSnapshot(
  ref: string,
  version?: number,
): Promise<LiveGameQuestionSetSnapshot> {
  const cached = readCache(ref, version);
  if (cached) return cached;

  const fromDb = await loadSnapshotFromDb(ref);
  if (!fromDb) {
    throw new QuestionSetNotFoundError(ref);
  }
  if (version != null && fromDb.version !== version) {
    throw new QuestionSetVersionMismatchError(ref, version, fromDb.version);
  }
  writeCache(fromDb);
  return fromDb;
}

function pickFromBank<T extends LiveGameQuestionRow>(
  rows: T[],
  seed: string,
): T {
  if (rows.length === 0) {
    throw new Error("Cannot pick from an empty question bank");
  }
  return rows[hashSeed(seed) % rows.length]!;
}

export async function pickHarvestQuestion(
  ref: string,
  version: number | undefined,
  seed: string,
): Promise<LiveGameQuestionRow> {
  const snapshot = await getQuestionSetSnapshot(ref, version);
  return pickFromBank(snapshot.harvest, seed);
}

export async function pickDepositQuestion(
  ref: string,
  version: number | undefined,
  seed: string,
): Promise<LiveGameQuestionRow> {
  const snapshot = await getQuestionSetSnapshot(ref, version);
  return pickFromBank(snapshot.deposit, seed);
}

export async function pickCraftQuestion(
  ref: string,
  version: number | undefined,
  seed: string,
): Promise<LiveGameQuestionRow> {
  const snapshot = await getQuestionSetSnapshot(ref, version);
  return pickFromBank(snapshot.craft, seed);
}

export async function getQuestionById(
  ref: string,
  bank: LiveGameQuestionBank,
  questionId: string,
  version?: number,
): Promise<LiveGameQuestionRow | null> {
  const snapshot = await getQuestionSetSnapshot(ref, version);
  return findQuestionInSnapshot(snapshot, bank, questionId);
}

export async function isHarvestAnswerCorrect(
  ref: string,
  questionId: string,
  answer: string,
  version?: number,
): Promise<boolean> {
  const question = await getQuestionById(ref, "harvest", questionId, version);
  if (!question) return false;
  return validateHarvestAnswer(getHarvestPayload(question), answer);
}

export async function isDepositSpellCorrect(
  ref: string,
  questionId: string,
  spelling: string,
  version?: number,
): Promise<boolean> {
  const question = await getQuestionById(ref, "deposit", questionId, version);
  if (!question) return false;
  return validateDepositSpell(getDepositPayload(question), spelling);
}

export async function isCraftOrderCorrect(
  ref: string,
  questionId: string,
  order: readonly string[],
  version?: number,
): Promise<boolean> {
  const question = await getQuestionById(ref, "craft", questionId, version);
  if (!question) return false;
  return validateCraftOrder(getCraftPayload(question), order);
}

export async function getQuestionSetVersion(ref: string): Promise<number> {
  const snapshot = await getQuestionSetSnapshot(ref);
  return snapshot.version;
}

export async function listPublishedQuestionSets() {
  return listPublishedQuestionSetsForHost();
}

/** Test helper — clears in-memory resolver cache. */
export function clearQuestionSetResolverCacheForTests() {
  snapshotCache.clear();
}

/** Drop cached snapshots for a set id or slug (e.g. after publish). */
export function invalidateQuestionSetCache(ref: string): void {
  const uuid = resolveQuestionSetUuid(ref);
  const slug = resolveQuestionSetSlug(ref);
  for (const [key, entry] of snapshotCache) {
    const snapshot = entry.snapshot;
    const matches =
      snapshot.id === ref ||
      snapshot.slug === ref ||
      (uuid != null && snapshot.id === uuid) ||
      (slug != null && snapshot.slug === slug);
    if (matches) {
      snapshotCache.delete(key);
    }
  }
}
