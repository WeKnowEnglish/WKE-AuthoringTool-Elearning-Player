import type { HomeworkCollectionMiniPlayPart } from "./types";

// Allow JSON escaping overhead while bounding the underlying editable fields.
export const MINI_PLAY_MAX_ANSWER_LENGTH = 50_000;
export const MINI_PLAY_MAX_CHARACTERS = 6;
export const MINI_PLAY_MAX_LINES = 24;
export const MINI_PLAY_LINE_LENGTH = 220;
export const MINI_PLAY_ANSWER_IDS = ["play-title", "characters", "setting", "script"] as const;
export type MiniPlayCharacter = { id: string; name: string; description: string };
export type MiniPlayLine = { id: string; kind: "dialogue" | "direction"; characterId: string; text: string };
export type MiniPlaySetting = { place: string; time: string; description: string };
export type MiniPlayResponse = {
  title: string;
  characters: MiniPlayCharacter[];
  setting: MiniPlaySetting;
  lines: MiniPlayLine[];
};

type Content = Omit<HomeworkCollectionMiniPlayPart, "schemaVersion" | "id" | "kind" | "title" | "instructions" | "required">;
export function createMiniPlayContent(): Content {
  return {
    prompt: "Write a short play about a small problem that two friends solve together.",
    charactersPrompt: "Give each character a name. Describe who they are, how they feel, or what they want.",
    settingPrompt: "Where and when does your play happen? Describe what the audience can see.",
    scriptPrompt: "Choose a speaker for each line. Make each reply connect to the previous line. Give your play a beginning, a problem, and an ending.",
    minCharacters: 2,
    maxCharacters: 4,
    minDialogueLines: 6,
    wordBank: ["please", "help", "because", "together", "finally"],
    sentenceStarters: ["Can you help me?", "What happened?", "Let's try…", "Thank you!"],
    successCriteria: ["I described my characters and setting.", "My characters listen and respond to each other.", "My play has a problem and an ending."],
    maxPoints: 10,
  };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function json(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return null; }
}
function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

/** Tolerant draft reader. Incomplete work can be saved; completion is checked separately. */
export function readMiniPlayResponse(answers: Record<string, string>): MiniPlayResponse {
  const characters = json(answers.characters);
  const setting = record(json(answers.setting));
  const lines = json(answers.script);
  return {
    title: text(answers["play-title"], 120),
    characters: (Array.isArray(characters) ? characters : []).slice(0, MINI_PLAY_MAX_CHARACTERS).map((value) => {
      const row = record(value);
      return { id: text(row.id, 40), name: text(row.name, 40), description: text(row.description, 400) };
    }),
    setting: { place: text(setting.place, 120), time: text(setting.time, 120), description: text(setting.description, 500) },
    lines: (Array.isArray(lines) ? lines : []).slice(0, MINI_PLAY_MAX_LINES).map((value) => {
      const row = record(value);
      return { id: text(row.id, 40), kind: row.kind === "direction" ? "direction" : "dialogue", characterId: text(row.characterId, 40), text: text(row.text, MINI_PLAY_LINE_LENGTH) };
    }),
  };
}

export function miniPlayAuthoringIssues(raw: unknown): string[] {
  const row = record(raw);
  const issues: string[] = [];
  for (const key of ["prompt", "charactersPrompt", "settingPrompt", "scriptPrompt"] as const) {
    if (typeof row[key] !== "string" || !row[key].trim() || row[key].length > 2000) issues.push(`Add ${key.replace("Prompt", " guidance")} (up to 2,000 characters).`);
  }
  const min = row.minCharacters as number;
  const max = row.maxCharacters as number;
  if (!Number.isInteger(min) || min < 2 || min > MINI_PLAY_MAX_CHARACTERS) issues.push("Require between 2 and 6 characters.");
  if (!Number.isInteger(max) || max < min || max > MINI_PLAY_MAX_CHARACTERS) issues.push("The character limit must be at least the minimum and no more than 6.");
  if (!Number.isInteger(row.minDialogueLines) || Number(row.minDialogueLines) < 2 || Number(row.minDialogueLines) > MINI_PLAY_MAX_LINES) issues.push("Require between 2 and 24 spoken lines.");
  if (!Number.isInteger(row.maxPoints) || Number(row.maxPoints) < 1 || Number(row.maxPoints) > 100) issues.push("Points must be between 1 and 100.");
  for (const key of ["wordBank", "sentenceStarters", "successCriteria"] as const) {
    if (!Array.isArray(row[key]) || row[key].length > 20 || row[key].some((value: unknown) => typeof value !== "string" || !value.trim() || value.length > 200)) issues.push(`Use up to 20 non-empty ${key} entries, each up to 200 characters.`);
  }
  if (Array.isArray(row.successCriteria) && !row.successCriteria.length) issues.push("Add at least one success criterion.");
  return issues;
}

export function parseMiniPlayContent(raw: unknown): Content | null {
  if (miniPlayAuthoringIssues(raw).length) return null;
  const row = raw as Content;
  return {
    prompt: row.prompt.trim(), charactersPrompt: row.charactersPrompt.trim(), settingPrompt: row.settingPrompt.trim(), scriptPrompt: row.scriptPrompt.trim(),
    minCharacters: row.minCharacters, maxCharacters: row.maxCharacters, minDialogueLines: row.minDialogueLines, maxPoints: row.maxPoints,
    wordBank: [...row.wordBank], sentenceStarters: [...row.sentenceStarters], successCriteria: [...row.successCriteria],
  };
}

/** Teacher drafts retain incomplete edits; assignment requires completeness. */
export function readMiniPlayDraft(raw: unknown): HomeworkCollectionMiniPlayPart | null {
  const row = record(raw);
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;
  const defaults = createMiniPlayContent();
  const content = { ...defaults };
  for (const key of ["prompt", "charactersPrompt", "settingPrompt", "scriptPrompt"] as const) {
    if (typeof row[key] === "string") content[key] = row[key];
  }
  for (const key of ["minCharacters", "maxCharacters", "minDialogueLines", "maxPoints"] as const) {
    if (typeof row[key] === "number") content[key] = row[key];
  }
  for (const key of ["wordBank", "sentenceStarters", "successCriteria"] as const) {
    if (Array.isArray(row[key])) content[key] = row[key].filter((value): value is string => typeof value === "string");
  }
  return {
    schemaVersion: 1, id: row.id, kind: "mini_play", title: row.title,
    instructions: typeof row.instructions === "string" ? row.instructions : "", required: row.required !== false,
    ...content,
  };
}

/** Used by both the student checklist and authoritative server submission validation. */
export function miniPlayResponseIssues(part: HomeworkCollectionMiniPlayPart, answers: Record<string, string>): string[] {
  const play = readMiniPlayResponse(answers);
  const issues: string[] = [];
  if (!play.title.trim()) issues.push("Give your play a title.");
  if (play.characters.length < part.minCharacters || play.characters.length > part.maxCharacters) issues.push(`Create ${part.minCharacters}–${part.maxCharacters} characters.`);
  const ids = play.characters.map((character) => character.id);
  const names = play.characters.map((character) => character.name.trim().toLocaleLowerCase());
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) issues.push("Each character needs a unique identity.");
  if (names.some((name) => !name) || new Set(names).size !== names.length) issues.push("Give each character a different name.");
  if (play.characters.some((character) => !character.description.trim())) issues.push("Describe every character.");
  if (!play.setting.place.trim() || !play.setting.description.trim()) issues.push("Describe the place and what the audience can see.");
  const dialogue = play.lines.filter((line) => line.kind === "dialogue" && line.text.trim());
  if (dialogue.length < part.minDialogueLines) issues.push(`Write at least ${part.minDialogueLines} spoken lines.`);
  if (play.lines.some((line) => !line.text.trim())) issues.push("Complete or remove empty script lines.");
  if (play.lines.some((line) => line.kind === "dialogue" && !ids.includes(line.characterId))) issues.push("Choose a character for every spoken line.");
  if (new Set(dialogue.map((line) => line.characterId)).size < 2) issues.push("Let at least two characters speak.");
  const lineIds = play.lines.map((line) => line.id);
  if (lineIds.some((id) => !id) || new Set(lineIds).size !== lineIds.length) issues.push("Each script line needs a unique identity.");
  // Reject oversized or malformed structured submissions instead of quietly dropping student work.
  const rawCharacters = json(answers.characters);
  const rawLines = json(answers.script);
  const rawSetting = json(answers.setting);
  const validText = (value: unknown, max: number) => typeof value === "string" && value.length <= max;
  const validCharacters = Array.isArray(rawCharacters) && rawCharacters.length <= MINI_PLAY_MAX_CHARACTERS && rawCharacters.every((value) => {
    const row = record(value);
    return validText(row.id, 40) && validText(row.name, 40) && validText(row.description, 400);
  });
  const validLines = Array.isArray(rawLines) && rawLines.length <= MINI_PLAY_MAX_LINES && rawLines.every((value) => {
    const row = record(value);
    return validText(row.id, 40) && ["dialogue", "direction"].includes(String(row.kind)) && validText(row.characterId, 40) && validText(row.text, MINI_PLAY_LINE_LENGTH);
  });
  const settingRow = record(rawSetting);
  if (!validText(answers["play-title"], 120) || !validCharacters || !validLines || !validText(settingRow.place, 120) || !validText(settingRow.time, 120) || !validText(settingRow.description, 500)) issues.push("Check your saved characters, setting, and script.");
  return issues;
}

export function miniPlaySectionComplete(part: HomeworkCollectionMiniPlayPart, answers: Record<string, string>): boolean[] {
  const play = readMiniPlayResponse(answers);
  return [
    Boolean(play.title.trim()),
    play.characters.length >= part.minCharacters && play.characters.length <= part.maxCharacters && play.characters.every((character) => Boolean(character.name.trim() && character.description.trim())),
    Boolean(play.setting.place.trim() && play.setting.description.trim()),
    play.lines.filter((line) => line.kind === "dialogue" && line.text.trim()).length >= part.minDialogueLines,
  ];
}

/** Resolve speaker ids at display time so a character rename updates every line. */
export function miniPlayScriptText(play: MiniPlayResponse): string {
  return play.lines.map((line) => line.kind === "direction" ? `[${line.text}]` : `${play.characters.find((character) => character.id === line.characterId)?.name || "Choose a speaker"}: ${line.text}`).join("\n");
}
