import {
  isLearningBand,
  LEARNING_BAND_COOKIE,
  LEARNING_BAND_COOKIE_MAX_AGE_SEC,
  type LearningBand,
} from "@/lib/learning-band";

export function readLearningBandCookie(
  cookieValue: string | undefined,
): LearningBand | null {
  return isLearningBand(cookieValue) ? cookieValue : null;
}

/** Persist band for server-side landing skip (client only). */
export function writeLearningBandCookie(band: LearningBand) {
  if (typeof document === "undefined") return;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LEARNING_BAND_COOKIE}=${encodeURIComponent(band)}; Path=/; Max-Age=${LEARNING_BAND_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}
