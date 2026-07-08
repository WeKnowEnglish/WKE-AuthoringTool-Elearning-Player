import { isLearningBand, type LearningBand } from "@/lib/learning-band";

/** Secondary portal is the Secondary track (`a2` key for compatibility). */
const SECONDARY_ELIGIBLE_BANDS: LearningBand[] = ["a2"];

export function resolveLearningBand(value: unknown): LearningBand | null {
  const band = typeof value === "string" ? value : null;
  return isLearningBand(band) ? band : null;
}

export function isSecondaryEligibleBand(value: unknown): boolean {
  const band = resolveLearningBand(value);
  return band ? SECONDARY_ELIGIBLE_BANDS.includes(band) : false;
}

export function getSecondaryEligibleBands(): readonly LearningBand[] {
  return SECONDARY_ELIGIBLE_BANDS;
}
