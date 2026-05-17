import type { PuppetPartKey, PuppetRigPivots } from "./types";
import { PUPPET_PART_KEYS } from "./types";
import { pivotMapToRigPivots, type PivotPercent } from "./pivot-utils";

/** Per-part idle / preview motion (dev tuning → export to repo). */
export type PartMotionTune = {
  rotateEnabled: boolean;
  translateEnabled: boolean;
  /** 0.25–2 — higher = faster (shorter duration). */
  speed: number;
  rotateMinDeg: number;
  rotateMaxDeg: number;
  /** Max vertical bob in px when translateEnabled (body/head). */
  translateMaxPx: number;
};

export const PART_MOTION_SPEED_MIN = 0.25;
export const PART_MOTION_SPEED_MAX = 2;

import { DEFAULT_HOST_PART_MOTION_TUNES as HOST_MOTION } from "./puppets/default-host-part-motion";

export { DEFAULT_HOST_PART_MOTION_TUNES } from "./puppets/default-host-part-motion";

export function buildDefaultMotionTuneMap(): Record<PuppetPartKey, PartMotionTune> {
  const map = {} as Record<PuppetPartKey, PartMotionTune>;
  for (const part of PUPPET_PART_KEYS) {
    map[part] = { ...HOST_MOTION[part] };
  }
  return map;
}

export function clampMotionTune(tune: PartMotionTune): PartMotionTune {
  const minDeg = Math.min(tune.rotateMinDeg, tune.rotateMaxDeg);
  const maxDeg = Math.max(tune.rotateMinDeg, tune.rotateMaxDeg);
  return {
    ...tune,
    speed: Math.min(PART_MOTION_SPEED_MAX, Math.max(PART_MOTION_SPEED_MIN, tune.speed)),
    rotateMinDeg: minDeg,
    rotateMaxDeg: maxDeg,
    translateMaxPx: Math.max(0, Math.min(40, tune.translateMaxPx)),
  };
}

export type PuppetRigExportBundle = {
  puppetId: "default_host";
  exportedAt: string;
  pivots: PuppetRigPivots;
  partMotion: Record<PuppetPartKey, PartMotionTune>;
};

export function buildRigExportBundle(
  pivotPercents: Record<PuppetPartKey, PivotPercent>,
  partMotion: Record<PuppetPartKey, PartMotionTune>,
): PuppetRigExportBundle {
  return {
    puppetId: "default_host",
    exportedAt: new Date().toISOString(),
    pivots: pivotMapToRigPivots(pivotPercents),
    partMotion: Object.fromEntries(
      PUPPET_PART_KEYS.map((part) => [part, clampMotionTune(partMotion[part])]),
    ) as Record<PuppetPartKey, PartMotionTune>,
  };
}

/** JSON for clipboard / feeding back to Cursor. */
export function formatRigExportJson(bundle: PuppetRigExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/** Short markdown summary for chat. */
export function formatRigExportMarkdown(bundle: PuppetRigExportBundle): string {
  const pivotLines = PUPPET_PART_KEYS.map(
    (p) => `- **${p}**: ${bundle.pivots[p] ?? "—"}`,
  ).join("\n");
  const motionLines = PUPPET_PART_KEYS.map((p) => {
    const m = bundle.partMotion[p];
    return `- **${p}**: rotate ${m.rotateEnabled ? `${m.rotateMinDeg}°…${m.rotateMaxDeg}°` : "off"}, translate ${m.translateEnabled ? `±${m.translateMaxPx}px` : "off"}, speed ×${m.speed}`;
  }).join("\n");
  return [
    "## AJ puppet rig export",
    "",
    `Exported: ${bundle.exportedAt}`,
    "",
    "### Pivots (paste into `default-host.ts`)",
    pivotLines,
    "",
    "```ts",
    formatPivotsForSource(bundle.pivots),
    "```",
    "",
    "### Part motion (paste into `default-host-part-motion.ts`)",
    motionLines,
    "",
    "```json",
    formatRigExportJson({ ...bundle, pivots: {}, partMotion: bundle.partMotion }),
    "```",
    "",
    "Full bundle JSON is in the second copy button (rig-export.json).",
  ].join("\n");
}

function formatPivotsForSource(pivots: PuppetRigPivots): string {
  const lines = PUPPET_PART_KEYS.map((part) => `    ${part}: "${pivots[part]}",`);
  return `  pivots: {\n${lines.join("\n")}\n  },`;
}

/** TypeScript snippet for `default-host-part-motion.ts`. */
export function formatPartMotionForSource(
  partMotion: Record<PuppetPartKey, PartMotionTune>,
): string {
  const lines = PUPPET_PART_KEYS.map((part) => {
    const m = clampMotionTune(partMotion[part]);
    return `  ${part}: ${JSON.stringify(m)},`;
  });
  return `export const DEFAULT_HOST_PART_MOTION_TUNES: Record<PuppetPartKey, PartMotionTune> = {\n${lines.join("\n")}\n};`;
}

export function pivotPercentsFromBundle(
  bundle: PuppetRigExportBundle,
): Record<PuppetPartKey, PivotPercent> {
  const map = {} as Record<PuppetPartKey, PivotPercent>;
  for (const part of PUPPET_PART_KEYS) {
    const raw = bundle.pivots[part];
    if (!raw) continue;
    const [x, y] = raw.replace(/%/g, "").split(/\s+/).map(Number);
    map[part] = { x: x ?? 50, y: y ?? 50 };
  }
  return map;
}
