import {
  exportCoreModuleToLessonPlayer,
  type CoreModuleAuthoringDocument,
} from "@/lib/activity-builder/core-modules/registry";
import { isCoreModuleId } from "@/lib/activity-builder/core-modules/types";
import type {
  LearningTrackLibraryFormat,
  LearningTrackScreenPayload,
} from "@/lib/learning-tracks/composition-types";
import { screensFromGamesPack } from "@/lib/learning-tracks/games-pack-screens";
import { validateStudioActivityPack } from "@/lib/studio-activities/validate";
import { wkeActivityToExploreHotspotsPayload } from "@/lib/wke-activity/to-lesson-screen";

type StudioActivityBankPayload = {
  ok?: boolean;
  format?: string;
  pack?: unknown;
  authoring?: unknown;
  error?: string;
};

const LIBRARY_FORMAT_LABELS: Record<LearningTrackLibraryFormat, string> = {
  multiple_choice: "Multiple choice",
  letter_mixup: "Letter mix-up",
  flashcards: "Flashcards",
  listen_and_choose: "Listen and choose",
  line_match: "Line match",
  true_false: "True or false",
  sentence_scramble: "Sentence scramble",
  fill_blanks: "Fill in the blanks",
  wordsearch: "Word search",
  crossword: "Crossword",
  memory: "Memory",
  explore_hotspots: "Explore hotspots",
};

function libraryFormatLabel(format: LearningTrackLibraryFormat): string {
  return LIBRARY_FORMAT_LABELS[format];
}

function asScreen(
  screen: unknown,
  label: string,
): LearningTrackScreenPayload {
  if (!screen || typeof screen !== "object" || Array.isArray(screen)) {
    throw new Error(`${label} screen must be an object.`);
  }
  return screen as LearningTrackScreenPayload;
}

function isLessonPlayerGamesPack(pack: unknown): boolean {
  return Boolean(
    pack &&
      typeof pack === "object" &&
      !Array.isArray(pack) &&
      (pack as { kind?: string }).kind === "lessonplayer-games-pack" &&
      Array.isArray((pack as { screens?: unknown }).screens),
  );
}

export async function fetchStudioActivityFromBank(
  activityId: string,
): Promise<StudioActivityBankPayload> {
  const response = await fetch(
    `/api/studio/activities/${encodeURIComponent(activityId)}`,
    { method: "GET", credentials: "same-origin" },
  );
  const payload = (await response.json().catch(() => null)) as StudioActivityBankPayload | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(
      payload?.error ||
        `Could not load activity (${response.status}). Save it from Activity Builder first.`,
    );
  }
  return payload;
}

function screensFromExploreHotspotsBank(
  payload: StudioActivityBankPayload,
): LearningTrackScreenPayload[] {
  if (payload.format && payload.format !== "explore_hotspots") {
    throw new Error("That Activity Bank item is not an explore-hotspots activity.");
  }
  if (
    payload.pack &&
    typeof payload.pack === "object" &&
    !Array.isArray(payload.pack) &&
    (payload.pack as { subtype?: unknown }).subtype === "explore_hotspots"
  ) {
    return [asScreen(payload.pack, "Explore hotspots")];
  }
  if (payload.authoring) {
    return [
      asScreen(
        wkeActivityToExploreHotspotsPayload(payload.authoring),
        "Explore hotspots",
      ),
    ];
  }
  throw new Error("Explore hotspots activity is missing pack and authoring data.");
}

function screensFromGamesBank(
  format: LearningTrackLibraryFormat,
  payload: StudioActivityBankPayload,
): LearningTrackScreenPayload[] {
  const label = libraryFormatLabel(format);
  if (payload.format && payload.format !== format) {
    throw new Error(`That Activity Bank item is a ${payload.format} activity, not ${format}.`);
  }
  if (payload.pack && isLessonPlayerGamesPack(payload.pack)) {
    const validated = validateStudioActivityPack(
      format,
      payload.pack,
      payload.authoring ?? undefined,
    );
    return screensFromGamesPack(validated.pack, label);
  }
  if (payload.authoring && isCoreModuleId(format)) {
    const pack = exportCoreModuleToLessonPlayer(
      format,
      payload.authoring as CoreModuleAuthoringDocument,
    );
    return screensFromGamesPack(pack, label);
  }
  throw new Error(`${label} activity is missing pack and authoring data.`);
}

export async function screensFromLibraryActivity(
  libraryId: string,
  format: LearningTrackLibraryFormat,
): Promise<LearningTrackScreenPayload[]> {
  const payload = await fetchStudioActivityFromBank(libraryId);
  if (format === "explore_hotspots") {
    return screensFromExploreHotspotsBank(payload);
  }
  return screensFromGamesBank(format, payload);
}
