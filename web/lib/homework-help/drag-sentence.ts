import {
  nextHelpLevel,
  resolveUnlockedHelpLevel,
  type HelpLevel,
  type HelpStep,
  type HelpStruggle,
} from "@/lib/homework-help/types";

export type DragSentenceTile = {
  id: string;
  text: string;
};

export type DragSentenceSlotCell = DragSentenceTile & {
  locked: boolean;
};

export type DragSentenceCheckResult = {
  lockIndices: number[];
  kickIndices: number[];
  allCorrect: boolean;
  emptyCount: number;
  wrongCount: number;
  lockedCount: number;
};

/** Stable bank tiles — ids stay unique even when word text repeats. */
export function buildDragSentenceBankTiles(wordBank: readonly string[]): DragSentenceTile[] {
  return wordBank.map((text, index) => ({
    id: `bank-${index}`,
    text,
  }));
}

export function evaluateDragSentenceCheck(
  slots: readonly (DragSentenceSlotCell | null)[],
  correctOrder: readonly string[],
): DragSentenceCheckResult {
  const lockIndices: number[] = [];
  const kickIndices: number[] = [];
  let emptyCount = 0;
  let wrongCount = 0;
  let lockedCount = 0;

  const n = correctOrder.length;
  for (let i = 0; i < n; i++) {
    const cell = slots[i] ?? null;
    const expected = correctOrder[i] ?? "";
    if (!cell) {
      emptyCount += 1;
      continue;
    }
    if (cell.locked) {
      lockedCount += 1;
      continue;
    }
    if (cell.text === expected) {
      lockIndices.push(i);
    } else {
      wrongCount += 1;
      kickIndices.push(i);
    }
  }

  const allCorrect =
    emptyCount === 0 &&
    wrongCount === 0 &&
    slots.length >= n &&
    correctOrder.every((word, i) => slots[i]?.text === word);

  return { lockIndices, kickIndices, allCorrect, emptyCount, wrongCount, lockedCount };
}

function firstUnlockedProblemIndex(
  slots: readonly (DragSentenceSlotCell | null)[],
  correctOrder: readonly string[],
): number | null {
  for (let i = 0; i < correctOrder.length; i++) {
    const cell = slots[i];
    if (cell?.locked) continue;
    if (!cell || cell.text !== correctOrder[i]) return i;
  }
  return null;
}

function diagnoseMessage(result: DragSentenceCheckResult, filledCount: number, slotCount: number): string {
  if (filledCount === 0) {
    return "Tap words in the word box to build the sentence, then press Check.";
  }
  if (result.emptyCount > 0) {
    return `You still have ${result.emptyCount} empty spot${result.emptyCount === 1 ? "" : "s"}. Fill every gap, then check again.`;
  }
  if (result.wrongCount > 0) {
    return `${result.wrongCount} word${result.wrongCount === 1 ? " is" : "s are"} in the wrong place. Green words stay. Red words go back to the box — try a new order.`;
  }
  if (filledCount < slotCount) {
    return "Keep adding words until every spot is filled.";
  }
  return "Almost — look at the order carefully and try again.";
}

export type DragSentenceHelpInput = {
  correctOrder: readonly string[];
  slots: readonly (DragSentenceSlotCell | null)[];
  struggle: HelpStruggle;
  instructions?: string;
};

/**
 * Build the help step for the highest level currently unlocked.
 * Format-aware: uses slot correctness for diagnose / scaffold / reveal.
 */
export function getDragSentenceHelpStep(input: DragSentenceHelpInput): HelpStep {
  const level = resolveUnlockedHelpLevel(input.struggle);
  const result = evaluateDragSentenceCheck(input.slots, input.correctOrder);
  const filledCount = input.slots.filter(Boolean).length;
  const slotCount = input.correctOrder.length;
  const problemIndex = firstUnlockedProblemIndex(input.slots, input.correctOrder);
  const nextWord =
    problemIndex !== null ? (input.correctOrder[problemIndex] ?? "").trim() : "";
  const sentence = input.correctOrder.join(" ");

  if (level === "orient") {
    return {
      level: "orient",
      title: "Let's start",
      message:
        input.instructions?.trim() ||
        "Tap words from the word box to build the sentence in order. Press Check when you are ready.",
      actions: ["need_more_help", "got_it"],
    };
  }

  if (level === "diagnose") {
    return {
      level: "diagnose",
      title: "Here's a tip",
      message: diagnoseMessage(result, filledCount, slotCount),
      actions: nextHelpLevel("diagnose") ? ["need_more_help", "got_it"] : ["got_it"],
    };
  }

  if (level === "scaffold") {
    return {
      level: "scaffold",
      title: "A bigger clue",
      message: nextWord
        ? `Next, put “${nextWord}” in spot ${problemIndex! + 1}. Correct words stay locked in green.`
        : "Check the green words — they are already right. Move the others.",
      tip: nextWord ? `Spot ${problemIndex! + 1}: ${nextWord}` : undefined,
      actions: ["need_more_help", "got_it"],
    };
  }

  return {
    level: "reveal",
    title: "Let's unstick",
    message: sentence
      ? `The sentence is “${sentence}”. I'll fill it in so you can keep going.`
      : "I can fill this one in so you can keep going.",
    tip: sentence || undefined,
    revealAnswer: sentence || undefined,
    actions: sentence ? ["show_answer", "got_it"] : ["got_it"],
  };
}

export function advanceDragSentenceHelp(struggle: HelpStruggle): HelpStruggle {
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

export function recordDragSentenceWrongCheck(struggle: HelpStruggle): HelpStruggle {
  return {
    ...struggle,
    wrongChecks: struggle.wrongChecks + 1,
  };
}

/** Apply a scaffold: place the next correct word into the first unlocked problem slot. */
export function applyDragSentenceScaffold(input: {
  slots: readonly (DragSentenceSlotCell | null)[];
  bank: readonly DragSentenceTile[];
  correctOrder: readonly string[];
}): { slots: (DragSentenceSlotCell | null)[]; bank: DragSentenceTile[] } | null {
  const problemIndex = firstUnlockedProblemIndex(input.slots, input.correctOrder);
  if (problemIndex === null) return null;
  const needed = input.correctOrder[problemIndex];
  if (needed === undefined) return null;

  const slots: (DragSentenceSlotCell | null)[] = [...input.slots];
  while (slots.length < input.correctOrder.length) slots.push(null);

  const bank = [...input.bank];
  const displaced = slots[problemIndex];
  if (displaced && !displaced.locked) {
    bank.push({ id: displaced.id, text: displaced.text });
  }

  const fromBankIndex = bank.findIndex((tile) => tile.text === needed);
  let placed: DragSentenceSlotCell;
  if (fromBankIndex >= 0) {
    const [tile] = bank.splice(fromBankIndex, 1);
    placed = { id: tile!.id, text: tile!.text, locked: true };
  } else {
    placed = {
      id: `scaffold-${problemIndex}-${needed}`,
      text: needed,
      locked: true,
    };
  }

  slots[problemIndex] = placed;
  return { slots, bank };
}

/** Reveal the full correct sentence (all slots locked). */
export function applyDragSentenceReveal(input: {
  slots: readonly (DragSentenceSlotCell | null)[];
  bank: readonly DragSentenceTile[];
  correctOrder: readonly string[];
}): { slots: DragSentenceSlotCell[]; bank: DragSentenceTile[] } {
  const usedIds = new Set<string>();
  const bankPool = [...input.bank];
  for (const cell of input.slots) {
    if (cell && !cell.locked) bankPool.push({ id: cell.id, text: cell.text });
  }

  const slots: DragSentenceSlotCell[] = input.correctOrder.map((text, index) => {
    const existing = input.slots[index];
    if (existing?.locked && existing.text === text) {
      usedIds.add(existing.id);
      return existing;
    }
    const fromBank = bankPool.findIndex(
      (tile) => tile.text === text && !usedIds.has(tile.id),
    );
    if (fromBank >= 0) {
      const tile = bankPool[fromBank]!;
      usedIds.add(tile.id);
      bankPool.splice(fromBank, 1);
      return { id: tile.id, text: tile.text, locked: true };
    }
    return { id: `reveal-${index}`, text, locked: true };
  });

  const bank = bankPool.filter((tile) => !usedIds.has(tile.id));
  return { slots, bank };
}
