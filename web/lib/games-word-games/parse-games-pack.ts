import { interactionPayloadSchema, type ScreenPayload } from "@/lib/lesson-schemas";
import type { GamesWordGameFormat } from "@/lib/activity-builder/games/types-word-games";

export type GamesWordGameScreen = Extract<
  ScreenPayload,
  { type: "interaction"; subtype: "wordsearch" | "crossword" | "memory" }
>;

export type GamesWordGameLessonPlayerPack = {
  version: 1;
  kind: "lessonplayer-games-pack";
  format: GamesWordGameFormat;
  quiz_group_id: string;
  quiz_group_title: string;
  activity_name: string;
  screens: GamesWordGameScreen[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseGamesWordGameLessonPlayerPack(
  raw: unknown,
  expectedFormat?: GamesWordGameFormat,
): GamesWordGameLessonPlayerPack {
  if (!isRecord(raw)) throw new Error("Puzzle pack must be an object.");
  if (raw.kind !== "lessonplayer-games-pack") {
    throw new Error('Expected kind "lessonplayer-games-pack".');
  }
  const format = raw.format;
  if (format !== "wordsearch" && format !== "crossword" && format !== "memory") {
    throw new Error("Unsupported word-game pack format.");
  }
  if (expectedFormat && format !== expectedFormat) {
    throw new Error(`This player only supports ${expectedFormat}.`);
  }
  if (typeof raw.quiz_group_id !== "string" || !raw.quiz_group_id.trim()) {
    throw new Error("quiz_group_id is required.");
  }
  if (typeof raw.quiz_group_title !== "string" || !raw.quiz_group_title.trim()) {
    throw new Error("quiz_group_title is required.");
  }
  if (typeof raw.activity_name !== "string" || !raw.activity_name.trim()) {
    throw new Error("activity_name is required.");
  }
  if (!Array.isArray(raw.screens) || raw.screens.length !== 1) {
    throw new Error("A word-game pack needs exactly one puzzle screen.");
  }
  const parsed = interactionPayloadSchema.parse(raw.screens[0]);
  if (parsed.subtype !== format) throw new Error(`Puzzle screen must be subtype ${format}.`);
  return {
    version: 1,
    kind: "lessonplayer-games-pack",
    format,
    quiz_group_id: raw.quiz_group_id.trim(),
    quiz_group_title: raw.quiz_group_title.trim(),
    activity_name: raw.activity_name.trim(),
    screens: [parsed as GamesWordGameScreen],
  };
}
