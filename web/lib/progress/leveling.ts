/** XP required to advance from `level` to `level + 1` (level 1 is the starting tier). */
export const XP_CURVE_BASE = 100;
export const XP_CURVE_RATIO = 1.4;

export function xpRequiredForLevel(level: number): number {
  if (level < 1) return 0;
  return Math.floor(XP_CURVE_BASE * XP_CURVE_RATIO ** (level - 1));
}

/** Total XP accumulated to reach `level` (level 1 requires 0 XP). */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l += 1) {
    total += xpRequiredForLevel(l);
  }
  return total;
}

export function levelFromXp(experience: number): number {
  const xp = Math.max(0, Math.floor(experience));
  let level = 1;
  let remaining = xp;
  while (remaining >= xpRequiredForLevel(level)) {
    remaining -= xpRequiredForLevel(level);
    level += 1;
  }
  return level;
}

export function xpProgressInLevel(experience: number): {
  level: number;
  current: number;
  required: number;
  percent: number;
} {
  const level = levelFromXp(experience);
  const floorXp = totalXpForLevel(level);
  const required = xpRequiredForLevel(level);
  const current = Math.max(0, Math.floor(experience) - floorXp);
  const percent =
    required > 0 ? Math.min(100, Math.round((100 * current) / required)) : 100;
  return { level, current, required, percent };
}

/** Levels newly reached when XP increases from `prevXp` to `nextXp` (exclusive of unchanged level). */
export function levelsGainedBetween(prevXp: number, nextXp: number): number[] {
  const prevLevel = levelFromXp(prevXp);
  const nextLevel = levelFromXp(nextXp);
  const gained: number[] = [];
  for (let l = prevLevel + 1; l <= nextLevel; l += 1) {
    gained.push(l);
  }
  return gained;
}
