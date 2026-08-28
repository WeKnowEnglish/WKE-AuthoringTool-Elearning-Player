import type { LearningTrackScreenPayload } from "@/lib/learning-tracks/composition-types";

function asScreen(screen: unknown, label: string): LearningTrackScreenPayload {
  if (!screen || typeof screen !== "object" || Array.isArray(screen)) {
    throw new Error(`${label} screen must be an object.`);
  }
  return screen as LearningTrackScreenPayload;
}

export function screensFromGamesPack(
  pack: unknown,
  label: string,
): LearningTrackScreenPayload[] {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new Error(`${label} pack must be an object.`);
  }
  const screens = (pack as { screens?: unknown }).screens;
  if (!Array.isArray(screens) || screens.length < 1) {
    throw new Error(`${label} pack needs screens.`);
  }
  return screens.map((screen, index) => asScreen(screen, `${label} screen ${index + 1}`));
}
