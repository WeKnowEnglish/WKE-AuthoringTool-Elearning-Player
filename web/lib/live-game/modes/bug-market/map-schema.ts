import { z } from "zod";
import type { LiveGameMapDef } from "@/lib/live-game/modes/types";

const pointSchema = z.object({
  id: z.string().min(1),
  x: z.number().finite().nonnegative(),
  y: z.number().finite().nonnegative(),
});

const rectSchema = z.object({
  id: z.string().min(1),
  x: z.number().finite().nonnegative(),
  y: z.number().finite().nonnegative(),
  w: z.number().finite().positive(),
  h: z.number().finite().positive(),
});
const boundsSchema = rectSchema.omit({ id: true });

export const bugMarketMapDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  modeId: z.literal("bug_market"),
  title: z.string().min(1),
  size: z.object({
    widthPx: z.number().int().positive(),
    heightPx: z.number().int().positive(),
  }),
  terrain: z.object({
    backgroundColor: z.string().min(1),
    textureUrl: z.string().startsWith("/"),
    tileSizePx: z.number().int().positive(),
  }),
  collisionRects: z.array(rectSchema),
  spawnPoints: z.array(pointSchema).min(1),
  regions: z.array(rectSchema.extend({
    kind: z.enum(["bug_spawn", "counter", "upgrade_shop"]),
    label: z.string().min(1),
    displayBounds: boundsSchema,
  })),
  exits: z.array(rectSchema.extend({
    destinationMapId: z.string().min(1),
    destinationSpawnId: z.string().min(1),
  })),
}).superRefine((document, context) => {
  const ids = [
    ...document.collisionRects.map((item) => item.id),
    ...document.spawnPoints.map((item) => item.id),
    ...document.regions.map((item) => item.id),
    ...document.exits.map((item) => item.id),
  ];
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", message: "Map element ids must be unique." });
  }

  const { widthPx, heightPx } = document.size;
  const rectangles = [
    ...document.collisionRects,
    ...document.regions,
    ...document.regions.map((region) => ({ ...region.displayBounds, id: `${region.id}-display` })),
    ...document.exits,
  ];
  rectangles.forEach((rectangle) => {
    if (rectangle.x + rectangle.w > widthPx || rectangle.y + rectangle.h > heightPx) {
      context.addIssue({ code: "custom", message: `${rectangle.id} extends outside the map.` });
    }
  });
  document.spawnPoints.forEach((spawn) => {
    if (spawn.x > widthPx || spawn.y > heightPx) {
      context.addIssue({ code: "custom", message: `${spawn.id} is outside the map.` });
    }
  });
});

export type BugMarketMapDocument = z.infer<typeof bugMarketMapDocumentSchema>;
export type BugMarketMapRegion = BugMarketMapDocument["regions"][number];

export function parseBugMarketMapDocument(value: unknown): BugMarketMapDocument {
  return bugMarketMapDocumentSchema.parse(value);
}

export function toLiveGameMapDef(document: BugMarketMapDocument): LiveGameMapDef {
  return {
    id: document.id,
    modeId: document.modeId,
    widthPx: document.size.widthPx,
    heightPx: document.size.heightPx,
    backgroundUrl: document.terrain.textureUrl,
    collisionRects: document.collisionRects.map(({ x, y, w, h }) => ({ x, y, w, h })),
    spawnPoints: document.spawnPoints.map(({ id, x, y }) => ({ id, x, y })),
  };
}

export function getBugMarketMapRegion(
  document: BugMarketMapDocument,
  kind: BugMarketMapRegion["kind"],
): BugMarketMapRegion {
  const region = document.regions.find((item) => item.kind === kind);
  if (!region) throw new Error(`Bug Market map ${document.id} is missing its ${kind} region.`);
  return region;
}

export function parseBugMarketMapCatalog(values: readonly unknown[]): BugMarketMapDocument[] {
  const documents = values.map(parseBugMarketMapDocument);
  const byId = new Map(documents.map((document) => [document.id, document]));
  if (byId.size !== documents.length) throw new Error("Bug Market map ids must be unique.");

  documents.forEach((document) => document.exits.forEach((exit) => {
    const destination = byId.get(exit.destinationMapId);
    if (!destination) {
      throw new Error(`${document.id}/${exit.id} points to missing map ${exit.destinationMapId}.`);
    }
    if (!destination.spawnPoints.some((spawn) => spawn.id === exit.destinationSpawnId)) {
      throw new Error(`${document.id}/${exit.id} points to missing spawn ${exit.destinationSpawnId}.`);
    }
  }));
  return documents;
}
