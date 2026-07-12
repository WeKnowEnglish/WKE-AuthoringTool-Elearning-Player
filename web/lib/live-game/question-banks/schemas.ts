import { z } from "zod";
import type {
  CraftSentencePayload,
  DepositSpellPayload,
  HarvestMcPayload,
  LiveGameQuestionPayload,
} from "@/lib/live-game/question-banks/types";

function sortedMultiset(values: readonly string[]): string[] {
  return [...values].map((value) => value.trim()).sort();
}

function multisetsEqual(left: readonly string[], right: readonly string[]): boolean {
  const a = sortedMultiset(left);
  const b = sortedMultiset(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export const harvestMcPayloadSchema = z
  .object({
    type: z.literal("multiple_choice"),
    options: z.array(z.string().trim().min(1)).min(2),
    correctAnswers: z.array(z.string().trim().min(1)).min(1),
  })
  .superRefine((payload, ctx) => {
    const optionSet = new Set(payload.options.map((option) => option.trim().toLowerCase()));
    if (optionSet.size !== payload.options.length) {
      ctx.addIssue({ code: "custom", message: "MC options must be unique" });
    }
    for (const answer of payload.correctAnswers) {
      if (!payload.options.some((option) => option.trim() === answer.trim())) {
        ctx.addIssue({
          code: "custom",
          message: `Correct answer "${answer}" must be one of the options`,
        });
      }
    }
  });

export const depositSpellPayloadSchema = z.object({
  type: z.literal("deposit_spell"),
  targetWord: z.string().trim().regex(/^[a-z]+$/, "targetWord must be lowercase letters a-z"),
  spellHint: z.string().trim().min(1),
});

export const craftSentencePayloadSchema = z
  .object({
    type: z.literal("drag_sentence"),
    wordBank: z.array(z.string().trim().min(1)).min(1),
    correctOrder: z.array(z.string().trim().min(1)).min(1),
    slotCount: z.number().int().positive(),
  })
  .superRefine((payload, ctx) => {
    if (payload.slotCount !== payload.correctOrder.length) {
      ctx.addIssue({
        code: "custom",
        message: "slotCount must equal correctOrder.length",
      });
    }
    if (!multisetsEqual(payload.wordBank, payload.correctOrder)) {
      ctx.addIssue({
        code: "custom",
        message: "wordBank must contain the same tokens as correctOrder",
      });
    }
  });

export function parseHarvestPayload(raw: unknown): HarvestMcPayload {
  return harvestMcPayloadSchema.parse(raw);
}

export function parseDepositPayload(raw: unknown): DepositSpellPayload {
  return depositSpellPayloadSchema.parse(raw);
}

export function parseCraftPayload(raw: unknown): CraftSentencePayload {
  return craftSentencePayloadSchema.parse(raw);
}

export function parseQuestionPayload(raw: unknown): LiveGameQuestionPayload {
  const record = z.object({ type: z.string() }).passthrough().parse(raw);
  switch (record.type) {
    case "multiple_choice":
      return parseHarvestPayload(raw);
    case "deposit_spell":
      return parseDepositPayload(raw);
    case "drag_sentence":
      return parseCraftPayload(raw);
    default:
      throw new Error(`Unknown question payload type: ${record.type}`);
  }
}

export function isHarvestAnswerCorrect(payload: HarvestMcPayload, answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  return payload.correctAnswers.some(
    (candidate) => candidate.trim().toLowerCase() === normalized,
  );
}

export function isDepositSpellCorrect(payload: DepositSpellPayload, spelling: string): boolean {
  const normalized = spelling.trim().toLowerCase().replace(/\s+/g, "");
  return normalized === payload.targetWord.trim().toLowerCase();
}

export function isCraftOrderCorrect(payload: CraftSentencePayload, order: readonly string[]): boolean {
  return (
    order.length === payload.correctOrder.length &&
    order.every((word, index) => word === payload.correctOrder[index])
  );
}
