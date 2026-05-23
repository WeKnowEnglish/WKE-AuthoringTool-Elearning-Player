"use client";

import { getRewards, setRewardsFields } from "@/lib/progress/rewards";
import { getNextWordTierDef, getWordTierDef, MAX_WORD_TIER } from "./tiers";
import type {
  CollectedWord,
  WordCollectionSnapshotV1,
  WordUpgradePreview,
} from "./types";
import { WORD_COLLECTION_STORAGE_KEY } from "./types";

function emptySnapshot(): WordCollectionSnapshotV1 {
  return { schemaVersion: 1, words: {} };
}

function normalizeWordId(wordId: string): string {
  return wordId.trim().toLowerCase();
}

function normalizeSnapshot(raw: unknown): WordCollectionSnapshotV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as WordCollectionSnapshotV1;
  if (r.schemaVersion !== 1 || !r.words || typeof r.words !== "object") return null;
  const words: Record<string, CollectedWord> = {};
  for (const [key, value] of Object.entries(r.words)) {
    if (!value || typeof value !== "object") continue;
    const w = value as CollectedWord;
    if (typeof w.wordId !== "string" || !Number.isFinite(w.count)) continue;
    const id = normalizeWordId(w.wordId);
    words[id] = {
      wordId: id,
      count: Math.max(0, Math.floor(w.count)),
      tier: Math.min(MAX_WORD_TIER, Math.max(1, Math.floor(w.tier))),
      firstCollectedAt: typeof w.firstCollectedAt === "string" ? w.firstCollectedAt : new Date().toISOString(),
      lastCollectedAt: typeof w.lastCollectedAt === "string" ? w.lastCollectedAt : new Date().toISOString(),
    };
  }
  return { schemaVersion: 1, words };
}

function readRaw(): WordCollectionSnapshotV1 {
  if (typeof window === "undefined") return emptySnapshot();
  try {
    const raw = localStorage.getItem(WORD_COLLECTION_STORAGE_KEY);
    if (!raw) return emptySnapshot();
    return normalizeSnapshot(JSON.parse(raw)) ?? emptySnapshot();
  } catch {
    return emptySnapshot();
  }
}

function writeRaw(snapshot: WordCollectionSnapshotV1) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WORD_COLLECTION_STORAGE_KEY, JSON.stringify(snapshot));
}

export function getWordCollection(): WordCollectionSnapshotV1 {
  return readRaw();
}

export function listCollectedWords(): CollectedWord[] {
  const snap = readRaw();
  return Object.values(snap.words).sort((a, b) => b.lastCollectedAt.localeCompare(a.lastCollectedAt));
}

/**
 * Add loot copies for a word. New words start at tier 1.
 * Explore battles and other activities should call this when granting word loot.
 */
export function grantWordLoot(wordId: string, count = 1): CollectedWord | null {
  const id = normalizeWordId(wordId);
  if (!id || count < 1) return null;
  const snap = readRaw();
  const now = new Date().toISOString();
  const existing = snap.words[id];
  const next: CollectedWord = existing
    ? {
        ...existing,
        count: existing.count + count,
        lastCollectedAt: now,
      }
    : {
        wordId: id,
        count,
        tier: 1,
        firstCollectedAt: now,
        lastCollectedAt: now,
      };
  writeRaw({ ...snap, words: { ...snap.words, [id]: next } });
  return next;
}

export function getUpgradePreview(wordId: string): WordUpgradePreview {
  const id = normalizeWordId(wordId);
  const entry = readRaw().words[id];
  if (!entry) {
    return {
      canUpgrade: false,
      currentTier: 0,
      nextTier: null,
      missingCount: 0,
      goldCost: 0,
      atMaxTier: false,
    };
  }
  const nextDef = getNextWordTierDef(entry.tier);
  if (!nextDef) {
    return {
      canUpgrade: false,
      currentTier: entry.tier,
      nextTier: null,
      missingCount: 0,
      goldCost: 0,
      atMaxTier: true,
    };
  }
  const missingCount = Math.max(0, nextDef.minCount - entry.count);
  const gold = getRewards().gold;
  const canUpgrade = missingCount === 0 && gold >= nextDef.goldCost;
  return {
    canUpgrade,
    currentTier: entry.tier,
    nextTier: nextDef.tier,
    missingCount,
    goldCost: nextDef.goldCost,
    atMaxTier: false,
  };
}

export function upgradeWord(wordId: string): { ok: true; word: CollectedWord } | { ok: false; reason: string } {
  const preview = getUpgradePreview(wordId);
  if (preview.atMaxTier) return { ok: false, reason: "max_tier" };
  if (!preview.nextTier) return { ok: false, reason: "not_found" };
  if (preview.missingCount > 0) return { ok: false, reason: "need_more_copies" };
  const rewards = getRewards();
  if (rewards.gold < preview.goldCost) return { ok: false, reason: "need_gold" };

  const id = normalizeWordId(wordId);
  const snap = readRaw();
  const entry = snap.words[id];
  if (!entry) return { ok: false, reason: "not_found" };

  setRewardsFields({ gold: rewards.gold - preview.goldCost });
  const updated: CollectedWord = { ...entry, tier: preview.nextTier };
  writeRaw({ ...snap, words: { ...snap.words, [id]: updated } });
  return { ok: true, word: updated };
}

export function getTierDefForWord(wordId: string) {
  const id = normalizeWordId(wordId);
  const entry = readRaw().words[id];
  if (!entry) return undefined;
  return getWordTierDef(entry.tier);
}
