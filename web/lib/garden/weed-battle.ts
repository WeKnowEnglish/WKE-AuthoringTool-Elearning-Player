import {
  WEED_BATTLE_FAIL_COOLDOWN_MS,
  WEED_BATTLE_TIME_MS,
  WEED_MONSTER_WORD_LENGTH,
} from "@/lib/garden/defaults";
import type { FarmPlot, WeedMonsterPuzzle } from "@/lib/garden/types";

export type WeedBattleWordSlots = [string, string, string];

export type WeedBattleFailReason = "timeout" | "wrong_answer";

export function letterMultiset(letters: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const raw of letters) {
    const ch = raw.toUpperCase();
    if (ch.length !== 1 || ch < "A" || ch > "Z") continue;
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  return counts;
}

export function multisetsEqual(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [ch, count] of a) {
    if (b.get(ch) !== count) return false;
  }
  return true;
}

export function normalizeWordSlots(raw: unknown): WeedBattleWordSlots | null {
  if (!Array.isArray(raw) || raw.length !== 3) return null;
  const slots: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") return null;
    const word = entry.trim().toUpperCase();
    if (word.length !== WEED_MONSTER_WORD_LENGTH) return null;
    if (!/^[A-Z]+$/.test(word)) return null;
    slots.push(word);
  }
  return slots as WeedBattleWordSlots;
}

export function validateWeedBattleSolution(
  puzzle: WeedMonsterPuzzle,
  slots: WeedBattleWordSlots,
): boolean {
  const submittedLetters = slots.join("").split("");
  const trayMultiset = letterMultiset(puzzle.letterTray);
  const submittedMultiset = letterMultiset(submittedLetters);
  if (!multisetsEqual(trayMultiset, submittedMultiset)) return false;

  const expected = [...puzzle.words].map((w) => w.toUpperCase()).sort();
  const actual = [...slots].sort();
  return expected.every((word, index) => word === actual[index]);
}

export function isWeedMonsterOnCooldown(plot: FarmPlot, now: number): boolean {
  const until = plot.weedMonster?.cooldownUntil;
  return typeof until === "number" && now < until;
}

export function weedMonsterCooldownRemainingMs(plot: FarmPlot, now: number): number {
  const until = plot.weedMonster?.cooldownUntil;
  if (typeof until !== "number" || now >= until) return 0;
  return until - now;
}

export function isWeedBattleExpired(puzzle: WeedMonsterPuzzle, now: number): boolean {
  if (typeof puzzle.battleStartedAt !== "number") return false;
  return now - puzzle.battleStartedAt > WEED_BATTLE_TIME_MS;
}

export function weedBattleRemainingMs(puzzle: WeedMonsterPuzzle, now: number): number {
  if (typeof puzzle.battleStartedAt !== "number") return WEED_BATTLE_TIME_MS;
  return Math.max(0, WEED_BATTLE_TIME_MS - (now - puzzle.battleStartedAt));
}

export function formatWeedMonsterCooldown(ms: number): string {
  if (ms <= 0) return "Ready!";
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
}

export function applyWeedBattleFailure(
  puzzle: WeedMonsterPuzzle,
  now: number,
): WeedMonsterPuzzle {
  return {
    ...puzzle,
    cooldownUntil: now + WEED_BATTLE_FAIL_COOLDOWN_MS,
    battleStartedAt: undefined,
  };
}

export function startWeedBattleOnPuzzle(
  puzzle: WeedMonsterPuzzle,
  now: number,
): WeedMonsterPuzzle {
  return {
    ...puzzle,
    battleStartedAt: now,
  };
}
