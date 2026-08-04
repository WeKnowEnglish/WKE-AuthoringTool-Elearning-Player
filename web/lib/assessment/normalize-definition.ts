import type {
  AssessmentDefinition,
  AssessmentPart,
} from "@/lib/assessment/types";

const DEFAULT_CHARACTER_MATCH_SCENE = {
  src: "/assessment/primary-a2/listening-part-1/welcome-back-school-scene-v3.png",
  alt: "A school open day scene with children and adults",
} as const;

type LegacyCharacter = {
  id: string;
  clueLabel?: string;
  correctNameId?: string;
};

type CharacterMatchActivityRaw = {
  audioText?: string;
  audioUrl?: string;
  names?: Array<{ id: string; name: string }>;
  image?: { src?: string; alt?: string };
  targets?: Array<{
    id: string;
    label: string;
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
    correctNameId: string;
  }>;
  characters?: LegacyCharacter[];
};

/**
 * Migrate older AssessmentDefinition shapes in local drafts / frozen payloads.
 * - listening_character_match: per-portrait `characters` → scene `image` + `targets`
 * - speaking parts: ensure a stable responseId for recordings
 */
export function normalizeAssessmentPart(part: AssessmentPart): AssessmentPart {
  if (
    part.kind === "speaking_picture_differences" ||
    part.kind === "speaking_question_exchange" ||
    part.kind === "speaking_picture_story"
  ) {
    const responseId = part.activity.responseId?.trim();
    if (responseId) return part;
    return {
      ...part,
      activity: {
        ...part.activity,
        responseId: `${part.id}-recording`,
      },
    };
  }

  if (part.kind !== "listening_character_match") return part;

  const raw = part.activity as CharacterMatchActivityRaw;
  const names = Array.isArray(raw.names) ? raw.names : [];
  const hasTargets = Array.isArray(raw.targets) && raw.targets.length > 0;
  const hasScene =
    typeof raw.image?.src === "string" && raw.image.src.trim().length > 0;

  if (hasTargets && hasScene) {
    return {
      ...part,
      activity: {
        audioText: typeof raw.audioText === "string" ? raw.audioText : "",
        ...(typeof raw.audioUrl === "string" && raw.audioUrl.trim()
          ? { audioUrl: raw.audioUrl }
          : {}),
        image: {
          src: raw.image!.src!.trim(),
          alt:
            typeof raw.image?.alt === "string" && raw.image.alt.trim()
              ? raw.image.alt
              : DEFAULT_CHARACTER_MATCH_SCENE.alt,
        },
        names,
        targets: raw.targets!,
      },
    };
  }

  const characters = Array.isArray(raw.characters) ? raw.characters : [];
  const targets = hasTargets
    ? raw.targets!
    : characters
        .filter((character) => typeof character?.id === "string")
        .map((character, index) => ({
          id: character.id,
          label:
            typeof character.clueLabel === "string" && character.clueLabel.trim()
              ? character.clueLabel
              : String.fromCharCode(65 + index),
          xPercent: 8 + (index % 5) * 17,
          yPercent: 35,
          widthPercent: 14,
          heightPercent: 40,
          correctNameId:
            typeof character.correctNameId === "string"
              ? character.correctNameId
              : "",
        }));

  // Only invent a scene when migrating legacy portrait packs. Do not paper over
  // an intentionally empty image once the scene shape is already in use.
  const image =
    hasScene
      ? {
          src: raw.image!.src!.trim(),
          alt:
            typeof raw.image?.alt === "string" && raw.image.alt.trim()
              ? raw.image.alt
              : DEFAULT_CHARACTER_MATCH_SCENE.alt,
        }
      : !hasTargets && characters.length > 0
        ? { ...DEFAULT_CHARACTER_MATCH_SCENE }
        : {
            src: "",
            alt:
              typeof raw.image?.alt === "string" && raw.image.alt.trim()
                ? raw.image.alt
                : DEFAULT_CHARACTER_MATCH_SCENE.alt,
          };

  return {
    ...part,
    activity: {
      audioText: typeof raw.audioText === "string" ? raw.audioText : "",
      ...(typeof raw.audioUrl === "string" && raw.audioUrl.trim()
        ? { audioUrl: raw.audioUrl }
        : {}),
      image,
      names,
      targets,
    },
  };
}

export function normalizeAssessmentDefinition(
  definition: AssessmentDefinition,
): AssessmentDefinition {
  return {
    ...definition,
    sections: definition.sections.map((section) => ({
      ...section,
      parts: section.parts.map(normalizeAssessmentPart),
    })),
  };
}

/** True when a draft still has the pre-scene character-match shape. */
export function assessmentDefinitionNeedsNormalize(
  definition: AssessmentDefinition,
): boolean {
  return definition.sections.some((section) =>
    section.parts.some((part) => {
      if (part.kind !== "listening_character_match") return false;
      const activity = part.activity as CharacterMatchActivityRaw;
      const hasTargets =
        Array.isArray(activity.targets) && activity.targets.length > 0;
      const hasScene =
        typeof activity.image?.src === "string" &&
        activity.image.src.trim().length > 0;
      return !hasTargets || !hasScene || Array.isArray(activity.characters);
    }),
  );
}
