import {
  assertActivityShell,
  assertString,
  isRecord,
} from "@/lib/activity-builder/games/authoring-shell";
import type {
  GamesLineMatchAuthoringDocument,
  GamesLineMatchScreen,
  GamesLineMatchToken,
  GamesLineMatchZone,
} from "@/lib/activity-builder/games/types-line-match";
import type { GamesLineMatchLessonPlayerPack } from "@/lib/games-line-match/parse-games-pack";

function assertToken(value: unknown, screenId: string, index: number): GamesLineMatchToken {
  if (!isRecord(value)) {
    throw new Error(`Screen "${screenId}" token ${index + 1} must be an object.`);
  }
  return {
    id: assertString(value.id, `Screen "${screenId}" token ${index + 1} id`),
    label: assertString(value.label, `Screen "${screenId}" token label`),
  };
}

function assertZone(value: unknown, screenId: string, index: number): GamesLineMatchZone {
  if (!isRecord(value)) {
    throw new Error(`Screen "${screenId}" zone ${index + 1} must be an object.`);
  }
  const id = assertString(value.id, `Screen "${screenId}" zone ${index + 1} id`);
  const zone: GamesLineMatchZone = { id };
  if (typeof value.label === "string" && value.label.trim()) {
    zone.label = value.label.trim();
  }
  if (typeof value.imageUrl === "string" && value.imageUrl.trim()) {
    zone.imageUrl = value.imageUrl.trim();
  }
  if (!zone.label && !zone.imageUrl) {
    throw new Error(`Screen "${screenId}" zone "${id}" needs a label or imageUrl.`);
  }
  return zone;
}

function assertScreen(value: unknown, index: number): GamesLineMatchScreen {
  if (!isRecord(value)) throw new Error(`Screen ${index + 1} must be an object.`);
  const id = assertString(value.id, `Screen ${index + 1} id`);
  if (!Array.isArray(value.tokens) || value.tokens.length < 2) {
    throw new Error(`Screen "${id}" needs at least 2 tokens.`);
  }
  if (!Array.isArray(value.zones) || value.zones.length < 2) {
    throw new Error(`Screen "${id}" needs at least 2 zones.`);
  }
  const tokens = value.tokens.map((token, tokenIndex) => assertToken(token, id, tokenIndex));
  const zones = value.zones.map((zone, zoneIndex) => assertZone(zone, id, zoneIndex));
  if (!isRecord(value.correctMap)) {
    throw new Error(`Screen "${id}" correctMap is required.`);
  }
  const zoneIds = new Set(zones.map((zone) => zone.id));
  const tokenIds = new Set(tokens.map((token) => token.id));
  const correctMap: Record<string, string> = {};
  for (const [tokenId, zoneId] of Object.entries(value.correctMap)) {
    if (!tokenIds.has(tokenId)) {
      throw new Error(`Screen "${id}" correctMap key "${tokenId}" is not a token.`);
    }
    if (typeof zoneId !== "string" || !zoneIds.has(zoneId)) {
      throw new Error(`Screen "${id}" correctMap["${tokenId}"] must be a zone id.`);
    }
    correctMap[tokenId] = zoneId;
  }
  if (Object.keys(correctMap).length !== tokens.length) {
    throw new Error(`Screen "${id}" correctMap must cover every token.`);
  }

  const screen: GamesLineMatchScreen = { id, tokens, zones, correctMap };
  if (typeof value.bodyText === "string" && value.bodyText.trim()) {
    screen.bodyText = value.bodyText.trim();
  }
  return screen;
}

export function validateGamesLineMatchAuthoringDocument(
  value: unknown,
): GamesLineMatchAuthoringDocument {
  const shell = assertActivityShell(value);
  if (shell.interaction.format !== "line_match") {
    throw new Error('interaction.format must be "line_match".');
  }
  const quizGroupId = assertString(shell.interaction.quizGroupId, "quizGroupId");
  const quizGroupTitle = assertString(shell.interaction.quizGroupTitle, "quizGroupTitle");
  const bodyTextDefault = assertString(shell.interaction.bodyTextDefault, "bodyTextDefault");
  if (!Array.isArray(shell.interaction.screens) || shell.interaction.screens.length < 1) {
    throw new Error("At least one match screen is required.");
  }
  const screens = shell.interaction.screens.map((screen, index) => assertScreen(screen, index));
  const screenIds = new Set<string>();
  for (const screen of screens) {
    if (screenIds.has(screen.id)) throw new Error(`Duplicate screen id "${screen.id}".`);
    screenIds.add(screen.id);
  }

  return {
    version: 1,
    kind: "activity-authoring",
    id: shell.id,
    name: shell.name,
    educationalIntent: shell.educationalIntent,
    content: shell.content,
    interaction: {
      type: "games",
      format: "line_match",
      quizGroupId,
      quizGroupTitle,
      bodyTextDefault,
      screens,
    },
  };
}

export function exportGamesLineMatchForLessonPlayer(
  document: GamesLineMatchAuthoringDocument,
): GamesLineMatchLessonPlayerPack {
  const valid = validateGamesLineMatchAuthoringDocument(document);
  const { quizGroupId, quizGroupTitle, bodyTextDefault, screens } = valid.interaction;

  return {
    version: 1,
    kind: "lessonplayer-games-pack",
    format: "line_match",
    quiz_group_id: quizGroupId,
    quiz_group_title: quizGroupTitle,
    activity_name: valid.name,
    screens: screens.map((screen, index) => ({
      type: "interaction" as const,
      subtype: "line_match" as const,
      body_text: screen.bodyText ?? bodyTextDefault,
      image_fit: "contain" as const,
      tokens: screen.tokens.map((token) => ({ id: token.id, label: token.label })),
      zones: screen.zones.map((zone) => ({
        id: zone.id,
        ...(zone.label ? { label: zone.label } : {}),
        ...(zone.imageUrl ? { image_url: zone.imageUrl } : {}),
      })),
      correct_map: { ...screen.correctMap },
      quiz_group_id: quizGroupId,
      quiz_group_title: quizGroupTitle,
      quiz_group_order: index,
    })),
  };
}
