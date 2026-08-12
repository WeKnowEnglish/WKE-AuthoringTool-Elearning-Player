import {
  nextHelpLevel,
  resolveUnlockedHelpLevel,
  type HelpLevel,
  type HelpStep,
  type HelpStruggle,
} from "@/lib/homework-help/types";

/** tokenId -> zoneId */
export type MatchPairLinks = Record<string, string>;

export type MatchPairToken = {
  id: string;
  label: string;
};

export type MatchPairZone = {
  id: string;
  label?: string;
};

export type MatchPairCheckResult = {
  lockTokenIds: string[];
  kickTokenIds: string[];
  allCorrect: boolean;
  missingCount: number;
  wrongCount: number;
  lockedCount: number;
};

function asLockedSet(
  lockedTokenIds: ReadonlySet<string> | readonly string[],
): Set<string> {
  return lockedTokenIds instanceof Set ? lockedTokenIds : new Set(lockedTokenIds);
}

export function evaluateMatchPairsCheck(input: {
  tokenIds: readonly string[];
  correctMap: Record<string, string>;
  links: MatchPairLinks;
  lockedTokenIds: ReadonlySet<string> | readonly string[];
}): MatchPairCheckResult {
  const locked = asLockedSet(input.lockedTokenIds);
  const lockTokenIds: string[] = [];
  const kickTokenIds: string[] = [];
  let missingCount = 0;
  let wrongCount = 0;
  let lockedCount = 0;

  for (const tokenId of input.tokenIds) {
    if (locked.has(tokenId)) {
      lockedCount += 1;
      continue;
    }
    const expected = input.correctMap[tokenId];
    const actual = input.links[tokenId];
    if (!actual) {
      missingCount += 1;
      continue;
    }
    if (expected && actual === expected) {
      lockTokenIds.push(tokenId);
    } else {
      wrongCount += 1;
      kickTokenIds.push(tokenId);
    }
  }

  const allCorrect =
    missingCount === 0 &&
    wrongCount === 0 &&
    input.tokenIds.every((tokenId) => {
      const expected = input.correctMap[tokenId];
      if (!expected) return false;
      if (locked.has(tokenId)) return input.links[tokenId] === expected;
      return input.links[tokenId] === expected;
    });

  return {
    lockTokenIds,
    kickTokenIds,
    allCorrect,
    missingCount,
    wrongCount,
    lockedCount,
  };
}

function firstUnlockedProblemTokenId(input: {
  tokenIds: readonly string[];
  correctMap: Record<string, string>;
  links: MatchPairLinks;
  lockedTokenIds: ReadonlySet<string> | readonly string[];
}): string | null {
  const locked = asLockedSet(input.lockedTokenIds);
  for (const tokenId of input.tokenIds) {
    if (locked.has(tokenId)) continue;
    const expected = input.correctMap[tokenId];
    if (!expected) continue;
    if (input.links[tokenId] !== expected) return tokenId;
  }
  return null;
}

function diagnoseMessage(
  result: MatchPairCheckResult,
  linkedCount: number,
  total: number,
  imageZones: boolean,
): string {
  const pairWord = imageZones ? "picture" : "match";
  if (linkedCount === 0) {
    return `Tap a word, then tap its ${pairWord}. Connect every pair, then press Check.`;
  }
  if (result.missingCount > 0) {
    return `You still need ${result.missingCount} more pair${
      result.missingCount === 1 ? "" : "s"
    }. Connect every word, then check again.`;
  }
  if (result.wrongCount > 0) {
    return `${result.wrongCount} pair${
      result.wrongCount === 1 ? " is" : "s are"
    } wrong. Green pairs stay. Red pairs clear — try again.`;
  }
  if (linkedCount < total) {
    return "Keep matching until every word has a pair.";
  }
  return "Almost — look carefully and try again.";
}

export type MatchPairsHelpInput = {
  tokens: readonly MatchPairToken[];
  zones: readonly MatchPairZone[];
  correctMap: Record<string, string>;
  links: MatchPairLinks;
  lockedTokenIds: ReadonlySet<string> | readonly string[];
  struggle: HelpStruggle;
  instructions?: string;
  /** Word↔picture vs word↔word copy. */
  imageZones?: boolean;
};

export function getMatchPairsHelpStep(input: MatchPairsHelpInput): HelpStep {
  const level = resolveUnlockedHelpLevel(input.struggle);
  const tokenIds = input.tokens.map((t) => t.id);
  const result = evaluateMatchPairsCheck({
    tokenIds,
    correctMap: input.correctMap,
    links: input.links,
    lockedTokenIds: input.lockedTokenIds,
  });
  const linkedCount = Object.keys(input.links).length;
  const imageZones = Boolean(input.imageZones);
  const problemTokenId = firstUnlockedProblemTokenId({
    tokenIds,
    correctMap: input.correctMap,
    links: input.links,
    lockedTokenIds: input.lockedTokenIds,
  });
  const problemToken = problemTokenId
    ? input.tokens.find((t) => t.id === problemTokenId)
    : null;
  const expectedZoneId = problemTokenId ? input.correctMap[problemTokenId] : null;
  const expectedZone = expectedZoneId
    ? input.zones.find((z) => z.id === expectedZoneId)
    : null;
  const zoneHint =
    expectedZone?.label?.trim() ||
    (imageZones ? "its picture" : "its match");

  if (level === "orient") {
    return {
      level: "orient",
      title: "Let's start",
      message:
        input.instructions?.trim() ||
        (imageZones
          ? "Tap a word, then tap its picture. Check when every word is connected."
          : "Tap a word, then tap its match. Check when every pair is connected."),
      actions: ["need_more_help", "got_it"],
    };
  }

  if (level === "diagnose") {
    return {
      level: "diagnose",
      title: "Here's a tip",
      message: diagnoseMessage(result, linkedCount, tokenIds.length, imageZones),
      actions: nextHelpLevel("diagnose") ? ["need_more_help", "got_it"] : ["got_it"],
    };
  }

  if (level === "scaffold") {
    return {
      level: "scaffold",
      title: "A bigger clue",
      message: problemToken
        ? `Match “${problemToken.label}” to ${
            expectedZone?.label?.trim()
              ? `“${expectedZone.label.trim()}”`
              : zoneHint
          }. I'll lock that pair in green when you place the hint.`
        : "Green pairs are already right. Fix the others.",
      tip: problemToken
        ? `${problemToken.label} → ${
            expectedZone?.label?.trim() || (imageZones ? "picture" : "match")
          }`
        : undefined,
      actions: ["need_more_help", "got_it"],
    };
  }

  const revealPairs = input.tokens
    .map((token) => {
      const zoneId = input.correctMap[token.id];
      const zone = input.zones.find((z) => z.id === zoneId);
      const zoneLabel = zone?.label?.trim() || (imageZones ? "picture" : "match");
      return `${token.label} → ${zoneLabel}`;
    })
    .join("; ");

  return {
    level: "reveal",
    title: "Let's unstick",
    message: revealPairs
      ? `Here are the pairs: ${revealPairs}. I'll fill them in so you can keep going.`
      : "I can fill the pairs in so you can keep going.",
    tip: revealPairs || undefined,
    revealAnswer: revealPairs || undefined,
    actions: revealPairs ? ["show_answer", "got_it"] : ["got_it"],
  };
}

export function advanceMatchPairsHelp(struggle: HelpStruggle): HelpStruggle {
  const current = resolveUnlockedHelpLevel(struggle);
  const next = nextHelpLevel(current) ?? current;
  return {
    wrongChecks: struggle.wrongChecks,
    helpRequests: Math.max(struggle.helpRequests + 1, helpRequestsFloorForLevel(next)),
  };
}

function helpRequestsFloorForLevel(level: HelpLevel): number {
  if (level === "reveal") return 3;
  if (level === "scaffold") return 2;
  if (level === "diagnose") return 1;
  return 0;
}

export function recordMatchPairsWrongCheck(struggle: HelpStruggle): HelpStruggle {
  return {
    ...struggle,
    wrongChecks: struggle.wrongChecks + 1,
  };
}

/** Lock the next incorrect/missing pair to the correct zone. */
export function applyMatchPairsScaffold(input: {
  tokenIds: readonly string[];
  correctMap: Record<string, string>;
  links: MatchPairLinks;
  lockedTokenIds: ReadonlySet<string> | readonly string[];
}): { links: MatchPairLinks; lockedTokenIds: string[] } | null {
  const locked = asLockedSet(input.lockedTokenIds);
  const tokenId = firstUnlockedProblemTokenId(input);
  if (!tokenId) return null;
  const zoneId = input.correctMap[tokenId];
  if (!zoneId) return null;

  const links: MatchPairLinks = { ...input.links };
  for (const [tid, zid] of Object.entries(links)) {
    if (zid === zoneId && tid !== tokenId && !locked.has(tid)) {
      delete links[tid];
    }
  }
  links[tokenId] = zoneId;

  const lockedTokenIds = [...locked, tokenId];
  return { links, lockedTokenIds };
}

/** Fill every pair from correct_map and lock all tokens. */
export function applyMatchPairsReveal(input: {
  tokenIds: readonly string[];
  correctMap: Record<string, string>;
}): { links: MatchPairLinks; lockedTokenIds: string[] } {
  const links: MatchPairLinks = {};
  for (const tokenId of input.tokenIds) {
    const zoneId = input.correctMap[tokenId];
    if (zoneId) links[tokenId] = zoneId;
  }
  return { links, lockedTokenIds: [...input.tokenIds] };
}

/** Remove unlocked links that failed Check; keep locked + newly locked. */
export function applyMatchPairsKick(input: {
  links: MatchPairLinks;
  lockedTokenIds: ReadonlySet<string> | readonly string[];
  lockTokenIds: readonly string[];
  kickTokenIds: readonly string[];
}): { links: MatchPairLinks; lockedTokenIds: string[] } {
  const locked = asLockedSet(input.lockedTokenIds);
  for (const tokenId of input.lockTokenIds) locked.add(tokenId);

  const links: MatchPairLinks = {};
  for (const [tokenId, zoneId] of Object.entries(input.links)) {
    if (input.kickTokenIds.includes(tokenId)) continue;
    if (locked.has(tokenId) || input.lockTokenIds.includes(tokenId)) {
      links[tokenId] = zoneId;
    }
  }

  return { links, lockedTokenIds: [...locked] };
}
