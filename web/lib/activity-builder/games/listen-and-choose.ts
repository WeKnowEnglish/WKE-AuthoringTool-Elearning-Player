import {
  assertActivityShell,
  assertString,
  isRecord,
} from "@/lib/activity-builder/games/authoring-shell";
import type {
  GamesListenAndChooseAuthoringDocument,
  GamesListenAndChooseItem,
  GamesListenChoice,
} from "@/lib/activity-builder/games/types-listen-and-choose";
import type { GamesListenAndChooseLessonPlayerPack } from "@/lib/games-listen-choose/parse-games-pack";

function assertChoice(value: unknown, itemId: string, index: number): GamesListenChoice {
  if (!isRecord(value)) throw new Error(`Item "${itemId}" choice ${index + 1} must be an object.`);
  const id = assertString(value.id, `Item "${itemId}" choice ${index + 1} id`);
  const imageUrl = assertString(value.imageUrl, `Item "${itemId}" choice "${id}" imageUrl`);
  const choice: GamesListenChoice = { id, imageUrl };
  if (typeof value.label === "string" && value.label.trim()) {
    choice.label = value.label.trim();
  }
  return choice;
}

function assertItem(value: unknown, index: number): GamesListenAndChooseItem {
  if (!isRecord(value)) throw new Error(`Item ${index + 1} must be an object.`);
  const id = assertString(value.id, `Item ${index + 1} id`);
  const dialogText = assertString(value.dialogText, `Item "${id}" dialogText`);
  if (!Array.isArray(value.choices) || value.choices.length < 2) {
    throw new Error(`Item "${id}" needs at least 2 choices.`);
  }
  const choices = value.choices.map((choice, choiceIndex) =>
    assertChoice(choice, id, choiceIndex),
  );
  const choiceIds = new Set<string>();
  for (const choice of choices) {
    if (choiceIds.has(choice.id)) {
      throw new Error(`Item "${id}" has duplicate choice id "${choice.id}".`);
    }
    choiceIds.add(choice.id);
  }
  const correctChoiceId = assertString(value.correctChoiceId, `Item "${id}" correctChoiceId`);
  if (!choiceIds.has(correctChoiceId)) {
    throw new Error(`Item "${id}" correctChoiceId must match a choice.`);
  }

  const item: GamesListenAndChooseItem = {
    id,
    dialogText,
    choices,
    correctChoiceId,
  };
  if (typeof value.bodyText === "string" && value.bodyText.trim()) {
    item.bodyText = value.bodyText.trim();
  }
  if (typeof value.promptAudioUrl === "string" && value.promptAudioUrl.trim()) {
    item.promptAudioUrl = value.promptAudioUrl.trim();
  }
  if (value.imageFit === "cover" || value.imageFit === "contain") {
    item.imageFit = value.imageFit;
  }
  if (typeof value.autoPlay === "boolean") item.autoPlay = value.autoPlay;
  if (typeof value.shuffleChoices === "boolean") item.shuffleChoices = value.shuffleChoices;
  return item;
}

export function validateGamesListenAndChooseAuthoringDocument(
  value: unknown,
): GamesListenAndChooseAuthoringDocument {
  const shell = assertActivityShell(value);
  if (shell.interaction.format !== "listen_and_choose") {
    throw new Error('interaction.format must be "listen_and_choose".');
  }
  const quizGroupId = assertString(shell.interaction.quizGroupId, "quizGroupId");
  const quizGroupTitle = assertString(shell.interaction.quizGroupTitle, "quizGroupTitle");
  const bodyTextDefault = assertString(shell.interaction.bodyTextDefault, "bodyTextDefault");
  const autoPlayDefault =
    typeof shell.interaction.autoPlayDefault === "boolean"
      ? shell.interaction.autoPlayDefault
      : true;
  const shuffleChoicesDefault =
    typeof shell.interaction.shuffleChoicesDefault === "boolean"
      ? shell.interaction.shuffleChoicesDefault
      : true;

  if (!Array.isArray(shell.interaction.items) || shell.interaction.items.length < 1) {
    throw new Error("At least one listen item is required.");
  }
  const items = shell.interaction.items.map((item, index) => assertItem(item, index));
  const itemIds = new Set<string>();
  for (const item of items) {
    if (itemIds.has(item.id)) throw new Error(`Duplicate item id "${item.id}".`);
    itemIds.add(item.id);
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
      format: "listen_and_choose",
      quizGroupId,
      quizGroupTitle,
      bodyTextDefault,
      autoPlayDefault,
      shuffleChoicesDefault,
      items,
    },
  };
}

export function exportGamesListenAndChooseForLessonPlayer(
  document: GamesListenAndChooseAuthoringDocument,
): GamesListenAndChooseLessonPlayerPack {
  const valid = validateGamesListenAndChooseAuthoringDocument(document);
  const {
    quizGroupId,
    quizGroupTitle,
    bodyTextDefault,
    autoPlayDefault,
    shuffleChoicesDefault,
    items,
  } = valid.interaction;

  const screens = items.map((item, index) => {
    const screen: GamesListenAndChooseLessonPlayerPack["screens"][number] = {
      type: "interaction",
      subtype: "listen_and_choose",
      body_text: item.bodyText ?? bodyTextDefault,
      dialog_text: item.dialogText,
      image_fit: item.imageFit ?? "contain",
      auto_play: item.autoPlay ?? autoPlayDefault,
      shuffle_choices: item.shuffleChoices ?? shuffleChoicesDefault,
      choices: item.choices.map((choice) => ({
        id: choice.id,
        image_url: choice.imageUrl,
        ...(choice.label ? { label: choice.label } : {}),
      })),
      correct_choice_id: item.correctChoiceId,
      quiz_group_id: quizGroupId,
      quiz_group_title: quizGroupTitle,
      quiz_group_order: index,
    };
    if (item.promptAudioUrl) screen.prompt_audio_url = item.promptAudioUrl;
    return screen;
  });

  return {
    version: 1,
    kind: "lessonplayer-games-pack",
    format: "listen_and_choose",
    quiz_group_id: quizGroupId,
    quiz_group_title: quizGroupTitle,
    activity_name: valid.name,
    screens,
  };
}
