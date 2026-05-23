import { z } from "zod";

const rigKeyframePropertiesSchema = z
  .object({
    x: z.number().optional(),
    y: z.number().optional(),
    rotate: z.number().optional(),
    scale: z.number().optional(),
    opacity: z.number().optional(),
  })
  .refine((p) => Object.keys(p).length > 0, "Keyframe must set at least one property");

const rigTrackAnchorSchema = z.object({
  x: z.number(),
  y: z.number(),
  rotate: z.number().optional(),
  scale: z.number().optional(),
  opacity: z.number().optional(),
});

const rigTrackKeyframeSchema = z.object({
  time: z.number(),
  properties: rigKeyframePropertiesSchema,
  easing: z.string().optional(),
});

export const rigTrackSchema = z.object({
  elementId: z.string(),
  anchor: rigTrackAnchorSchema,
  keyframes: z.array(rigTrackKeyframeSchema),
});

const rigBoneAnchorSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const rigBoneSchema = z.object({
  elementId: z.string(),
  label: z.string().optional(),
  boneParentId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  role: z.string().optional(),
  anchor: rigBoneAnchorSchema,
});

const rigViewportSchema = z.object({
  preset: z.string().optional(),
  width: z.number(),
  height: z.number(),
  worldWidth: z.number(),
  worldHeight: z.number(),
  frameX: z.number(),
  frameY: z.number(),
});

export const rigSceneSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  version: z.number().optional(),
  rawSvgString: z.string(),
  duration: z.number(),
  viewport: rigViewportSchema,
  tracks: z.record(z.string(), rigTrackSchema),
  rig: z.record(z.string(), rigBoneSchema),
});

export const rigDocumentSchema = z.object({
  version: z.number(),
  name: z.string().optional(),
  scenes: z.array(rigSceneSchema).min(1),
});

export type RigKeyframeProperties = z.infer<typeof rigKeyframePropertiesSchema>;
export type RigTrackKeyframe = z.infer<typeof rigTrackKeyframeSchema>;
export type RigTrack = z.infer<typeof rigTrackSchema>;
export type RigBone = z.infer<typeof rigBoneSchema>;
export type RigViewport = z.infer<typeof rigViewportSchema>;
export type RigScene = z.infer<typeof rigSceneSchema>;
export type RigDocument = z.infer<typeof rigDocumentSchema>;

export type RigTrackSample = {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  opacity: number;
};
