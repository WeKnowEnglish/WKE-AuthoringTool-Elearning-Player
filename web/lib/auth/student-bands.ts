import { isLearningBand, type LearningBand } from "@/lib/learning-band";

const SECONDARY_ELIGIBLE_BANDS: LearningBand[] = ["a2"];

export function resolveLearningBand(value: unknown): LearningBand | null {
  return isLearningBand(typeof value === "string" ? value : null) ? value : null;
}

export function isSecondaryEligibleBand(value: unknown): boolean {
  const band = resolveLearningBand(value);
  return band ? SECONDARY_ELIGIBLE_BANDS.includes(band) : false;
}

export function getSecondaryEligibleBands(): readonly LearningBand[] {
  return SECONDARY_ELIGIBLE_BANDS;
}
