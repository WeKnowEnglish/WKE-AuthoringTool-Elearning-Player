import type { SecondaryWordDisplaySnapshot } from "@/lib/secondary/secondary-mastery-display";

export type SecondaryWordLearnStatus =
  | "new"
  | "weak"
  | "practicing"
  | "strong"
  | "mastered";

export type SecondaryWordLearnStatusDisplay = {
  status: SecondaryWordLearnStatus;
  label: string;
  filledDots: number;
  totalDots: number;
};

const LEARN_STATUS_LABEL: Record<SecondaryWordLearnStatus, string> = {
  new: "New",
  weak: "Weak",
  practicing: "Practicing",
  strong: "Strong",
  mastered: "Mastered",
};

export function getSecondaryWordLearnStatus(
  snapshot: SecondaryWordDisplaySnapshot,
  options?: { isFocus?: boolean },
): SecondaryWordLearnStatus {
  if (snapshot.timesSeen === 0 && snapshot.legacyLevel === 0) return "new";
  if (snapshot.masteryScore01 >= 0.75 || snapshot.legacyLevel >= 4) return "mastered";
  if (options?.isFocus || snapshot.masteryScore01 < 0.35) return "weak";
  if (snapshot.legacyLevel >= 3 || snapshot.masteryScore01 >= 0.55) return "strong";
  return "practicing";
}

export function getSecondaryWordLearnStatusDisplay(
  snapshot: SecondaryWordDisplaySnapshot,
  options?: { isFocus?: boolean },
): SecondaryWordLearnStatusDisplay {
  const status = getSecondaryWordLearnStatus(snapshot, options);
  const totalDots = 4;
  const filledDots = Math.max(
    0,
    Math.min(totalDots, Math.round(snapshot.masteryScore01 * totalDots)),
  );

  return {
    status,
    label: LEARN_STATUS_LABEL[status],
    filledDots: status === "mastered" ? totalDots : filledDots,
    totalDots,
  };
}

export function secondaryWordLearnStatusChipClass(status: SecondaryWordLearnStatus): string {
  switch (status) {
    case "new":
      return "text-sky-800";
    case "weak":
      return "text-amber-800";
    case "practicing":
      return "text-yellow-800";
    case "strong":
      return "text-emerald-800";
    case "mastered":
      return "text-emerald-900";
    default:
      return "text-sec-ink/70";
  }
}

export function secondaryWordLearnChipClassName(status: SecondaryWordLearnStatus): string {
  switch (status) {
    case "new":
      return "border-sky-300 bg-sky-50 text-sky-950";
    case "weak":
      return "border-amber-500 bg-amber-50 text-amber-950";
    case "practicing":
      return "border-yellow-300 bg-yellow-50 text-yellow-950";
    case "strong":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "mastered":
      return "border-green-500 bg-green-100 text-green-950";
    default:
      return "border-sec-ink/25 bg-sec-panel/30 text-sec-ink";
  }
}
