import { getDefaultPivot } from "./animations";
import type { PuppetPartKey, PuppetRigDefinition, PuppetRigPivots } from "./types";
import { PUPPET_PART_KEYS } from "./types";

export type PivotPercent = { x: number; y: number };

const PIVOT_RE = /^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/;

export function parsePivotPercent(value: string): PivotPercent {
  const m = value.trim().match(PIVOT_RE);
  if (!m) return { x: 50, y: 50 };
  return { x: Number(m[1]), y: Number(m[2]) };
}

export function formatPivotPercent({ x, y }: PivotPercent): string {
  return `${Math.round(x)}% ${Math.round(y)}%`;
}

export function resolvePivotForPart(
  puppet: PuppetRigDefinition,
  part: PuppetPartKey,
  overrides?: PuppetRigPivots,
): string {
  return overrides?.[part] ?? puppet.pivots?.[part] ?? getDefaultPivot(part);
}

/** Numeric pivot map for every part (rig + defaults). */
export function buildPivotPercentMap(
  puppet: PuppetRigDefinition,
  overrides?: PuppetRigPivots,
): Record<PuppetPartKey, PivotPercent> {
  const map = {} as Record<PuppetPartKey, PivotPercent>;
  for (const part of PUPPET_PART_KEYS) {
    map[part] = parsePivotPercent(resolvePivotForPart(puppet, part, overrides));
  }
  return map;
}

export function pivotMapToRigPivots(map: Record<PuppetPartKey, PivotPercent>): PuppetRigPivots {
  const pivots: PuppetRigPivots = {};
  for (const part of PUPPET_PART_KEYS) {
    pivots[part] = formatPivotPercent(map[part]);
  }
  return pivots;
}

/** Paste into `default-host.ts` pivots block. */
export function formatPivotsForSource(pivots: PuppetRigPivots): string {
  const lines = PUPPET_PART_KEYS.map((part) => `    ${part}: "${pivots[part]}",`);
  return `  pivots: {\n${lines.join("\n")}\n  },`;
}

/** Alias for rig editor “copy pivots only”. */
export const formatPivotsOnlyForSource = formatPivotsForSource;

export const PUPPET_PART_LABELS: Record<PuppetPartKey, string> = {
  body: "Body",
  head: "Head",
  upperArm: "Upper arm",
  lowerArm: "Lower arm",
  hand: "Hand",
};
