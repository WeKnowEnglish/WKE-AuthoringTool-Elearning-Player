"use client";

import { getWorldWordDiscoverySummary } from "@/lib/explore/area-discovery";
import { WORLD_1_SIMPLE } from "@/lib/worlds/world-1-simple";
import type { ExplorationNode, WorldDef, WorldId } from "@/lib/worlds/types";

export const WORLD_EXPLORATION_STORAGE_KEY = "wke-world-exploration-v1";

export type ExplorationSnapshotV1 = {
  schemaVersion: 1;
  touched: Record<string, true>;
};

export type WorldExplorationSummary = {
  worldId: WorldId;
  /** Words discovered in explore areas (world_1) or legacy nodes touched. */
  touchedCount: number;
  totalCount: number;
  percent: number;
  /** Area/level indices (1-based) with at least one discovery word found. */
  levelsWithProgress: number[];
  /** Area/level indices fully discovered (all required words collected). */
  areasComplete: number[];
};

const WORLDS_BY_ID: Record<WorldId, WorldDef> = {
  world_1: WORLD_1_SIMPLE,
};

export function explorationNodeKey(node: ExplorationNode): string {
  switch (node.kind) {
    case "explore_area":
      return `explore_area:${node.areaId}`;
    case "vocab_set":
      return `vocab_set:${node.setId}`;
    case "vocab_hub":
      return `vocab_hub:${node.hubId}`;
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
  }
}

export function flattenExplorationNodes(world: WorldDef): ExplorationNode[] {
  const nodes: ExplorationNode[] = [...(world.explorationHubNodes ?? [])];
  for (const level of world.levels) {
    nodes.push(...level.explorationNodes);
  }
  return nodes;
}

export function flattenExplorationKeys(world: WorldDef): string[] {
  return flattenExplorationNodes(world).map(explorationNodeKey);
}

export function getWorldDef(worldId: WorldId): WorldDef {
  return WORLDS_BY_ID[worldId];
}

function emptyExplorationSnapshot(): ExplorationSnapshotV1 {
  return { schemaVersion: 1, touched: {} };
}

function normalizeExplorationSnapshot(raw: unknown): ExplorationSnapshotV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as ExplorationSnapshotV1;
  if (r.schemaVersion !== 1 || !r.touched || typeof r.touched !== "object") return null;
  const touched: Record<string, true> = {};
  for (const [key, value] of Object.entries(r.touched)) {
    if (value === true) touched[key] = true;
  }
  return { schemaVersion: 1, touched };
}

export function getExplorationSnapshot(): ExplorationSnapshotV1 {
  if (typeof window === "undefined") return emptyExplorationSnapshot();
  try {
    const raw = localStorage.getItem(WORLD_EXPLORATION_STORAGE_KEY);
    if (!raw) return emptyExplorationSnapshot();
    return normalizeExplorationSnapshot(JSON.parse(raw)) ?? emptyExplorationSnapshot();
  } catch {
    return emptyExplorationSnapshot();
  }
}

function writeExplorationSnapshot(snapshot: ExplorationSnapshotV1) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WORLD_EXPLORATION_STORAGE_KEY, JSON.stringify(snapshot));
}

export function isExplorationNodeTouched(key: string, snapshot?: ExplorationSnapshotV1): boolean {
  const s = snapshot ?? getExplorationSnapshot();
  return s.touched[key] === true;
}

/** Idempotent: returns true if the node was newly marked. */
export function markExplorationNode(
  node: ExplorationNode,
  snapshot?: ExplorationSnapshotV1,
): boolean {
  const key = explorationNodeKey(node);
  const s = snapshot ? { ...snapshot, touched: { ...snapshot.touched } } : getExplorationSnapshot();
  if (s.touched[key]) return false;
  s.touched[key] = true;
  writeExplorationSnapshot(s);
  return true;
}

export function markExplorationNodeKey(key: string): boolean {
  const s = getExplorationSnapshot();
  if (s.touched[key]) return false;
  s.touched[key] = true;
  writeExplorationSnapshot(s);
  return true;
}

export function getExplorationPercent(worldId: WorldId, snapshot?: ExplorationSnapshotV1): number {
  const summary = getWorldExplorationSummary(worldId, snapshot);
  return summary.percent;
}

export function getWorldExplorationSummary(
  worldId: WorldId,
  _snapshot?: ExplorationSnapshotV1,
): WorldExplorationSummary {
  if (worldId === "world_1") {
    const word = getWorldWordDiscoverySummary();
    return {
      worldId,
      touchedCount: word.discoveredWordCount,
      totalCount: word.totalWordCount,
      percent: word.percent,
      levelsWithProgress: word.areasWithProgress,
      areasComplete: word.areasComplete,
    };
  }

  const world = getWorldDef(worldId);
  const s = _snapshot ?? getExplorationSnapshot();
  const keys = flattenExplorationKeys(world);
  const uniqueKeys = [...new Set(keys)];
  let touchedCount = 0;
  for (const key of uniqueKeys) {
    if (s.touched[key]) touchedCount += 1;
  }
  const totalCount = uniqueKeys.length;
  const percent =
    totalCount === 0 ? 0 : Math.min(100, Math.round((touchedCount / totalCount) * 100));

  const levelsWithProgress: number[] = [];
  for (const level of world.levels) {
    const hasTouch = level.explorationNodes.some((node) =>
      isExplorationNodeTouched(explorationNodeKey(node), s),
    );
    if (hasTouch) levelsWithProgress.push(level.index);
  }

  return {
    worldId,
    touchedCount,
    totalCount,
    percent,
    levelsWithProgress,
    areasComplete: [],
  };
}

export function isWorldLevelTouched(
  worldId: WorldId,
  levelIndex: number,
  snapshot?: ExplorationSnapshotV1,
): boolean {
  const world = getWorldDef(worldId);
  const level = world.levels.find((l) => l.index === levelIndex);
  if (!level) return false;
  const s = snapshot ?? getExplorationSnapshot();
  return level.explorationNodes.some((node) =>
    isExplorationNodeTouched(explorationNodeKey(node), s),
  );
}

export function getWorld1ExplorationSummary(
  _snapshot?: ExplorationSnapshotV1,
): WorldExplorationSummary {
  return getWorldExplorationSummary("world_1");
}
