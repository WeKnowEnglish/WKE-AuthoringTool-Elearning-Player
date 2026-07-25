import { interactionPayloadSchema, type ScreenPayload } from "@/lib/lesson-schemas";

export type GamesDragMatchScreen = Extract<
  ScreenPayload,
  { type: "interaction"; subtype: "drag_match" }
>;

export type GamesDragMatchLessonPlayerPack = {
  version: 1;
  kind: "lessonplayer-games-pack";
  format: "drag_match";
  quiz_group_id: string;
  quiz_group_title: string;
  activity_name: string;
  screens: GamesDragMatchScreen[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Parse a Studio Quiz drag-match export into typed LP screens. */
export function parseGamesDragMatchLessonPlayerPack(
  raw: unknown,
): GamesDragMatchLessonPlayerPack {
  if (isRecord(raw) && isRecord(raw.interaction) && raw.interaction.type === "games") {
    throw new Error(
      "This looks like a Studio authoring document. Export for Lesson Player first, then drop the .games-drag-match.lessonplayer.json file.",
    );
  }

  if (!isRecord(raw)) throw new Error("Quiz pack must be an object.");
  if (raw.kind !== "lessonplayer-games-pack") {
    throw new Error('Expected kind "lessonplayer-games-pack".');
  }
  if (raw.format !== "drag_match") {
    throw new Error('This pilot only supports format "drag_match".');
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
  if (!Array.isArray(raw.screens) || raw.screens.length < 1) {
    throw new Error("Pack needs at least one screen.");
  }

  const screens = raw.screens.map((screen, index) => {
    const parsed = interactionPayloadSchema.parse(screen);
    if (parsed.subtype !== "drag_match") {
      throw new Error(`Screen ${index + 1} must be subtype drag_match.`);
    }
    return parsed;
  });

  return {
    version: 1,
    kind: "lessonplayer-games-pack",
    format: "drag_match",
    quiz_group_id: raw.quiz_group_id.trim(),
    quiz_group_title: raw.quiz_group_title.trim(),
    activity_name: raw.activity_name.trim(),
    screens,
  };
}
