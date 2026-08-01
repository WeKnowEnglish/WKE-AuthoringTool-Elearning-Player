import {
  isPictureClozeAnswerCorrect,
  normalizePictureClozeAnswer,
  type PictureClozeItem,
} from "@/lib/picture-cloze";
import {
  nextHelpLevel,
  resolveUnlockedHelpLevel,
  type HelpLevel,
  type HelpStep,
  type HelpStruggle,
} from "@/lib/homework-help/types";

export type PictureClozeHelpInput = {
  item: PictureClozeItem;
  wordBank: readonly string[];
  answer: string;
  struggle: HelpStruggle;
  /** Activity-level instructions for the orient step. */
  instructions?: string;
};

function canonicalAnswer(item: PictureClozeItem): string {
  return item.acceptedAnswers[0]?.trim() || "";
}

function answerInWordBank(answer: string, wordBank: readonly string[]): boolean {
  const normalized = normalizePictureClozeAnswer(answer);
  if (!normalized) return false;
  return wordBank.some(
    (word) => normalizePictureClozeAnswer(word) === normalized,
  );
}

function diagnoseMessage(
  item: PictureClozeItem,
  wordBank: readonly string[],
  answer: string,
): string {
  const trimmed = answer.trim();
  if (!trimmed) {
    return "Tap a word in the word bank, or type the tool you see in the picture.";
  }
  if (isPictureClozeAnswerCorrect(trimmed, item.acceptedAnswers)) {
    return "That looks right! Press Check my answers when you are ready.";
  }
  if (!answerInWordBank(trimmed, wordBank)) {
    return "Use a word from the word bank. Look at the picture, then choose carefully.";
  }
  return "That word is in the bank, but it does not match this picture. Look again at what he needs.";
}

/**
 * Build the help step for the highest level currently unlocked.
 * Format-aware: uses accepted answers + word bank for diagnose / scaffold / reveal.
 */
export function getPictureClozeHelpStep(input: PictureClozeHelpInput): HelpStep {
  const level = resolveUnlockedHelpLevel(input.struggle);
  const answer = canonicalAnswer(input.item);
  const firstLetter = answer ? answer[0]!.toLocaleUpperCase() : "";

  if (level === "orient") {
    return {
      level: "orient",
      title: "Let's start",
      message:
        input.instructions?.trim() ||
        "Look at the picture. Choose a word from the bank and complete the sentence.",
      actions: ["need_more_help", "got_it"],
    };
  }

  if (level === "diagnose") {
    return {
      level: "diagnose",
      title: "Here's a tip",
      message: diagnoseMessage(input.item, input.wordBank, input.answer),
      actions: nextHelpLevel("diagnose")
        ? ["need_more_help", "got_it"]
        : ["got_it"],
    };
  }

  if (level === "scaffold") {
    return {
      level: "scaffold",
      title: "A bigger clue",
      message: firstLetter
        ? `The word starts with “${firstLetter}”. Try a word from the bank that begins with that letter.`
        : "Look at the picture carefully and try another word from the bank.",
      tip: firstLetter ? `Starts with ${firstLetter}` : undefined,
      actions: ["need_more_help", "got_it"],
    };
  }

  return {
    level: "reveal",
    title: "Let's unstick",
    message: answer
      ? `The answer is “${answer}”. I'll fill it in so you can keep going.`
      : "I can fill this one in so you can keep going.",
    tip: answer || undefined,
    revealAnswer: answer || undefined,
    actions: answer ? ["show_answer", "got_it"] : ["got_it"],
  };
}

export function pictureClozeScaffoldFirstLetter(item: PictureClozeItem): string | null {
  const answer = canonicalAnswer(item);
  return answer ? answer[0]!.toLocaleUpperCase() : null;
}

/** Words from the bank that match the scaffold first-letter filter. */
export function pictureClozeScaffoldBankFilter(
  item: PictureClozeItem,
  wordBank: readonly string[],
): string[] {
  const letter = pictureClozeScaffoldFirstLetter(item);
  if (!letter) return [...wordBank];
  return wordBank.filter(
    (word) => word.trim().charAt(0).toLocaleUpperCase() === letter,
  );
}

export function advancePictureClozeHelp(struggle: HelpStruggle): HelpStruggle {
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

export function recordPictureClozeWrongCheck(struggle: HelpStruggle): HelpStruggle {
  return {
    ...struggle,
    wrongChecks: struggle.wrongChecks + 1,
  };
}

export function emptyHelpStruggle(): HelpStruggle {
  return { wrongChecks: 0, helpRequests: 0 };
}
