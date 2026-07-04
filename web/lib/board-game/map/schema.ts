import { z } from "zod";
import type { BoardMap } from "@/lib/board-game/map/types";

const spaceKindSchema = z.enum(["normal", "bonus", "treasure", "mystery", "jump", "trap"]);

const spaceEffectSchema = z.enum([
  "moveAhead3",
  "moveBack2",
  "rollAgain",
  "stealPoint",
  "skipTurn",
  "swapLeader",
]);

const mapSpaceTypeSchema = z.enum([
  "start",
  "normal",
  "question",
  "bonus",
  "penalty",
  "moveForward",
  "moveBackward",
  "skipTurn",
  "rollAgain",
  "shortcutStart",
  "shortcutEnd",
  "finish",
]);

const mapThemeSchema = z.enum(["classroom", "jungle", "space", "ocean", "castle"]);
const layoutTemplateSchema = z.enum(["snake", "spiral", "island"]);

const boardMapSpaceSchema = z.object({
  id: z.number().int().positive(),
  label: z.string(),
  type: mapSpaceTypeSchema,
  grid: z.object({
    col: z.number().int().min(0),
    row: z.number().int().min(0),
  }),
  icon: z.string().optional(),
  kind: spaceKindSchema.optional(),
  effect: spaceEffectSchema.optional(),
  effects: z
    .object({
      onLand: spaceEffectSchema.optional(),
      onCorrect: spaceEffectSchema.optional(),
      onWrong: spaceEffectSchema.optional(),
      points: z.number().optional(),
      moveAmount: z.number().optional(),
      correctPoints: z.number().optional(),
      wrongPoints: z.number().optional(),
    })
    .optional(),
  questionCategory: z.string().optional(),
});

const boardConnectionSchema = z.object({
  from: z.number().int().positive(),
  to: z.number().int().positive(),
  type: z.enum(["shortcut", "bridge", "tunnel"]),
});

export const boardMapSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    title: z.string().min(1),
    theme: mapThemeSchema,
    layoutTemplate: layoutTemplateSchema,
    pathOrder: z.array(z.number().int().positive()).min(2),
    spaces: z.array(boardMapSpaceSchema).min(2),
    connections: z.array(boardConnectionSchema),
  })
  .superRefine((map, ctx) => {
    const spaceIds = new Set(map.spaces.map((space) => space.id));
    if (spaceIds.size !== map.spaces.length) {
      ctx.addIssue({ code: "custom", message: "Duplicate space ids" });
    }

    for (const id of map.pathOrder) {
      if (!spaceIds.has(id)) {
        ctx.addIssue({ code: "custom", message: `pathOrder references unknown space id ${id}` });
      }
    }

    const pathSet = new Set(map.pathOrder);
    if (pathSet.size !== map.pathOrder.length) {
      ctx.addIssue({ code: "custom", message: "pathOrder contains duplicate ids" });
    }

    for (const connection of map.connections) {
      if (!spaceIds.has(connection.from) || !spaceIds.has(connection.to)) {
        ctx.addIssue({ code: "custom", message: "Connection references unknown space id" });
      }
    }
  });

export function parseBoardMap(raw: unknown): BoardMap {
  const result = boardMapSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid board map");
  }
  return result.data as BoardMap;
}

export function validateBoardMap(raw: unknown): BoardMap | null {
  const result = boardMapSchema.safeParse(raw);
  return result.success ? (result.data as BoardMap) : null;
}
