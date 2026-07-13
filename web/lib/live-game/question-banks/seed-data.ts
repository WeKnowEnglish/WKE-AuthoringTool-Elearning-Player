import "server-only";

import { createHash } from "node:crypto";
import type { SystemQuestionSetSlug } from "@/lib/live-game/question-banks/system-seed-source";
import {
  SYSTEM_A1_QUESTION_BANKS,
  SYSTEM_QUESTION_SET_SUMMARIES,
} from "@/lib/live-game/question-banks/system-seed-source";
import {
  GRADE56_ADJECTIVES_CRAFT_V1,
  GRADE56_ADJECTIVES_MC_V1,
} from "@/lib/live-game/modes/english-craft/grade56-adjectives-v1";
import type {
  EnglishCraftAdjectiveQuestion,
  EnglishCraftCraftQuestion,
  EnglishCraftMcQuestion,
} from "@/lib/live-game/modes/english-craft/questions-v1";
import { LIVE_GAME_A1_DEPOSIT_OVERRIDES } from "@/lib/live-game/question-banks/a1-deposit-overrides";
import { normalizeTargetWord } from "@/lib/live-game/question-banks/normalize";
import { LIVE_GAME_SYSTEM_SET_UUIDS } from "@/lib/live-game/question-banks/question-set-ids";
import type {
  CraftSentencePayload,
  DepositSpellPayload,
  HarvestMcPayload,
  LiveGameQuestionBank,
  LiveGameQuestionRow,
  LiveGameQuestionSetSnapshot,
} from "@/lib/live-game/question-banks/types";

export type SeedQuestionInput = {
  id: string;
  setId: string;
  bank: LiveGameQuestionBank;
  sortOrder: number;
  prompt: string;
  payload: HarvestMcPayload | DepositSpellPayload | CraftSentencePayload;
  legacySourceId: string;
};

export type SeedSetInput = {
  id: string;
  slug: SystemQuestionSetSlug;
  title: string;
  level: "A1" | "A2";
  topic: string;
  learningObjective: string;
  description: string;
  version: number;
  status: "published";
  visibility: "system";
  sortOrder: number;
  questions: SeedQuestionInput[];
};

const ADJECTIVE_DEPOSIT_TARGET_OVERRIDES: Record<string, string> = {
  "adj-013": "proud",
  "adj-029": "strong",
  "adj-030": "difficult",
};

const CRAFT_PROMPT_OVERRIDES: Partial<Record<SystemQuestionSetSlug, string>> = {
  "grade56-adjectives": "Put the sentence in order:",
  "daily-routines-a1": "Put the routine in order:",
  "school-life-a1": "Put the school message in order:",
  "describing-places-a1": "Put the map description in order:",
};

export function deterministicQuestionUuid(
  setSlug: string,
  bank: LiveGameQuestionBank,
  legacySourceId: string,
): string {
  const hash = createHash("sha256")
    .update(`live-game-question:${setSlug}:${bank}:${legacySourceId}`)
    .digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `8${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}

function resolveAdjectiveDepositTarget(question: EnglishCraftAdjectiveQuestion): string {
  const override = ADJECTIVE_DEPOSIT_TARGET_OVERRIDES[question.id];
  if (override) {
    return normalizeTargetWord(override);
  }
  return normalizeTargetWord(question.targetWord);
}

export function buildHarvestRow(
  setId: string,
  setSlug: SystemQuestionSetSlug,
  question: EnglishCraftMcQuestion,
  sortOrder: number,
): SeedQuestionInput {
  const legacySourceId = question.id;
  return {
    id: deterministicQuestionUuid(setSlug, "harvest", legacySourceId),
    setId,
    bank: "harvest",
    sortOrder,
    prompt: question.prompt,
    legacySourceId,
    payload: {
      type: "multiple_choice",
      options: question.options,
      correctAnswers: [question.correctAnswer],
    },
  };
}

export function buildAdjectiveDepositRow(
  setId: string,
  setSlug: SystemQuestionSetSlug,
  question: EnglishCraftAdjectiveQuestion,
  sortOrder: number,
): SeedQuestionInput {
  const legacySourceId = `deposit-${question.id}`;
  const targetWord = resolveAdjectiveDepositTarget(question);
  const spellHint = question.spellHint.trim();
  return {
    id: deterministicQuestionUuid(setSlug, "deposit", legacySourceId),
    setId,
    bank: "deposit",
    sortOrder,
    prompt: `Spell the word: ${spellHint}`,
    legacySourceId,
    payload: {
      type: "deposit_spell",
      targetWord,
      spellHint,
    },
  };
}

export function buildA1DepositRow(
  setId: string,
  setSlug: SystemQuestionSetSlug,
  question: EnglishCraftMcQuestion,
  sortOrder: number,
): SeedQuestionInput {
  const override = LIVE_GAME_A1_DEPOSIT_OVERRIDES[question.id];
  if (!override) {
    throw new Error(`Missing A1 deposit override for ${question.id}`);
  }
  const legacySourceId = `deposit-${question.id}`;
  const targetWord = normalizeTargetWord(override.targetWord);
  return {
    id: deterministicQuestionUuid(setSlug, "deposit", legacySourceId),
    setId,
    bank: "deposit",
    sortOrder,
    prompt: `Spell the word: ${override.spellHint}`,
    legacySourceId,
    payload: {
      type: "deposit_spell",
      targetWord,
      spellHint: override.spellHint,
    },
  };
}

export function buildCraftRow(
  setId: string,
  setSlug: SystemQuestionSetSlug,
  craft: EnglishCraftCraftQuestion,
  promptOverride?: string,
): SeedQuestionInput {
  const legacySourceId = craft.id;
  return {
    id: deterministicQuestionUuid(setSlug, "craft", legacySourceId),
    setId,
    bank: "craft",
    sortOrder: 0,
    prompt: promptOverride ?? craft.prompt,
    legacySourceId,
    payload: {
      type: "drag_sentence",
      wordBank: craft.wordBank,
      correctOrder: craft.correctOrder,
      slotCount: craft.slotCount,
    },
  };
}

function buildAdjectivesSeed(): SeedSetInput {
  const slug: SystemQuestionSetSlug = "grade56-adjectives";
  const summary = SYSTEM_QUESTION_SET_SUMMARIES.find((entry) => entry.id === slug)!;
  const setId = LIVE_GAME_SYSTEM_SET_UUIDS[slug];
  const harvest = GRADE56_ADJECTIVES_MC_V1.map((question, index) =>
    buildHarvestRow(setId, slug, question, index),
  );
  const deposit = GRADE56_ADJECTIVES_MC_V1.map((question, index) =>
    buildAdjectiveDepositRow(setId, slug, question, index),
  );
  const craft = [
    buildCraftRow(setId, slug, GRADE56_ADJECTIVES_CRAFT_V1, CRAFT_PROMPT_OVERRIDES[slug]),
  ];
  return {
    id: setId,
    slug,
    title: summary.title,
    level: summary.level,
    topic: summary.topic,
    learningObjective: summary.learningObjective,
    description: summary.description,
    version: summary.version,
    status: "published",
    visibility: "system",
    sortOrder: 1,
    questions: [...harvest, ...deposit, ...craft],
  };
}

function buildA1Seed(slug: Exclude<SystemQuestionSetSlug, "grade56-adjectives">, sortOrder: number): SeedSetInput {
  const summary = SYSTEM_QUESTION_SET_SUMMARIES.find((entry) => entry.id === slug)!;
  const setId = LIVE_GAME_SYSTEM_SET_UUIDS[slug];
  const bank = SYSTEM_A1_QUESTION_BANKS[slug];
  const harvest = bank.questions.map((question, index) =>
    buildHarvestRow(setId, slug, question, index),
  );
  const deposit = bank.questions.map((question, index) =>
    buildA1DepositRow(setId, slug, question, index),
  );
  const craft = [
    buildCraftRow(setId, slug, bank.craftQuestion, CRAFT_PROMPT_OVERRIDES[slug]),
  ];
  return {
    id: setId,
    slug,
    title: summary.title,
    level: summary.level,
    topic: summary.topic,
    learningObjective: summary.learningObjective,
    description: summary.description,
    version: summary.version,
    status: "published",
    visibility: "system",
    sortOrder,
    questions: [...harvest, ...deposit, ...craft],
  };
}

export function buildSystemQuestionSetSeeds(): SeedSetInput[] {
  return [
    buildAdjectivesSeed(),
    buildA1Seed("daily-routines-a1", 2),
    buildA1Seed("school-life-a1", 3),
    buildA1Seed("describing-places-a1", 4),
  ];
}

export function seedQuestionToRow(input: SeedQuestionInput): LiveGameQuestionRow {
  return {
    id: input.id,
    setId: input.setId,
    bank: input.bank,
    sortOrder: input.sortOrder,
    prompt: input.prompt,
    payload: input.payload,
    enabled: true,
    legacySourceId: input.legacySourceId,
  };
}

export function seedSetToSnapshot(seed: SeedSetInput): LiveGameQuestionSetSnapshot {
  const harvest: LiveGameQuestionRow[] = [];
  const deposit: LiveGameQuestionRow[] = [];
  const craft: LiveGameQuestionRow[] = [];
  for (const question of seed.questions) {
    const row = seedQuestionToRow(question);
    if (question.bank === "harvest") harvest.push(row);
    else if (question.bank === "deposit") deposit.push(row);
    else craft.push(row);
  }
  harvest.sort((a, b) => a.sortOrder - b.sortOrder);
  deposit.sort((a, b) => a.sortOrder - b.sortOrder);
  craft.sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    id: seed.id,
    slug: seed.slug,
    title: seed.title,
    level: seed.level,
    topic: seed.topic,
    learningObjective: seed.learningObjective,
    description: seed.description,
    version: seed.version,
    status: seed.status,
    visibility: seed.visibility,
    sortOrder: seed.sortOrder,
    harvest,
    deposit,
    craft,
  };
}

export function buildSystemSnapshotFromSeeds(slug: SystemQuestionSetSlug): LiveGameQuestionSetSnapshot {
  const seed = buildSystemQuestionSetSeeds().find((entry) => entry.slug === slug);
  if (!seed) {
    throw new Error(`Unknown system question set slug: ${slug}`);
  }
  return seedSetToSnapshot(seed);
}

export const EXPECTED_SYSTEM_SEED_COUNTS: Record<
  SystemQuestionSetSlug,
  { harvest: number; deposit: number; craft: number }
> = {
  "grade56-adjectives": { harvest: 60, deposit: 60, craft: 1 },
  "daily-routines-a1": { harvest: 6, deposit: 6, craft: 1 },
  "school-life-a1": { harvest: 6, deposit: 6, craft: 1 },
  "describing-places-a1": { harvest: 6, deposit: 6, craft: 1 },
};
