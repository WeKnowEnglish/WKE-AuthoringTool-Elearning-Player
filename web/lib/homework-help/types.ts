/** Shared homework help ladder — deterministic unstick path for student activities. */

export const HELP_LEVELS = ["orient", "diagnose", "scaffold", "reveal"] as const;
export type HelpLevel = (typeof HELP_LEVELS)[number];

export type HelpAction = "need_more_help" | "show_answer" | "got_it";

export type HelpStep = {
  level: HelpLevel;
  title: string;
  message: string;
  /** Optional short tip shown as a chip (e.g. first letter). */
  tip?: string;
  /** Canonical answer when level is reveal. */
  revealAnswer?: string;
  actions: HelpAction[];
};

export type HelpStruggle = {
  /** Wrong "Check" presses on this item. */
  wrongChecks: number;
  /** Times the student tapped Help / Need more help. */
  helpRequests: number;
};

/** Wrong-check thresholds that unlock each ladder rung. */
export const HELP_WRONG_CHECK_THRESHOLDS: Record<HelpLevel, number> = {
  orient: 0,
  diagnose: 1,
  scaffold: 2,
  reveal: 3,
};

export function helpLevelIndex(level: HelpLevel): number {
  return HELP_LEVELS.indexOf(level);
}

export function maxHelpLevel(a: HelpLevel, b: HelpLevel): HelpLevel {
  return helpLevelIndex(a) >= helpLevelIndex(b) ? a : b;
}

export function nextHelpLevel(level: HelpLevel): HelpLevel | null {
  const index = helpLevelIndex(level);
  if (index < 0 || index >= HELP_LEVELS.length - 1) return null;
  return HELP_LEVELS[index + 1]!;
}

/** Highest ladder level unlocked by wrong checks alone. */
export function helpLevelFromWrongChecks(wrongChecks: number): HelpLevel {
  if (wrongChecks >= HELP_WRONG_CHECK_THRESHOLDS.reveal) return "reveal";
  if (wrongChecks >= HELP_WRONG_CHECK_THRESHOLDS.scaffold) return "scaffold";
  if (wrongChecks >= HELP_WRONG_CHECK_THRESHOLDS.diagnose) return "diagnose";
  return "orient";
}

/** Combine wrong checks + explicit help taps into the unlocked level. */
export function resolveUnlockedHelpLevel(struggle: HelpStruggle): HelpLevel {
  const fromChecks = helpLevelFromWrongChecks(struggle.wrongChecks);
  const fromRequests = helpLevelFromWrongChecks(struggle.helpRequests);
  return maxHelpLevel(fromChecks, fromRequests);
}
