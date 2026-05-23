import { z } from "zod";

const keyframePropertiesSchema = z.object({
  x: z.number(),
  y: z.number(),
  rotate: z.number(),
});

const trackKeyframeSchema = z.object({
  time: z.number(),
  properties: keyframePropertiesSchema,
});

const trackSchema = z.object({
  keyframes: z.array(trackKeyframeSchema),
});

const interactLayerSchema = z.object({
  visible: z.boolean(),
  opacity: z.number().optional(),
});

const interactStateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  layers: z.record(z.string(), interactLayerSchema),
});

const interactManifestSchema = z.object({
  bodyLayerId: z.string(),
  knob: z.object({
    on: z.string(),
    off: z.string(),
  }),
  splashes: z.object({
    orange: z.object({
      left: z.string(),
      middle: z.string(),
      right: z.string(),
    }),
    pink: z.object({
      left: z.string(),
      middle: z.string(),
      right: z.string(),
    }),
  }),
});

const interactSchema = z.object({
  defaultStateId: z.string(),
  manifest: interactManifestSchema,
  states: z.record(z.string(), interactStateSchema),
});

export const blenderSceneSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  version: z.number().optional(),
  rawSvgString: z.string(),
  duration: z.number(),
  tracks: z.record(z.string(), trackSchema),
  interact: interactSchema,
});

export const blenderDocumentSchema = z.object({
  version: z.number(),
  name: z.string().optional(),
  scenes: z.array(blenderSceneSchema).min(1),
});

export type BlenderKeyframeProperties = z.infer<typeof keyframePropertiesSchema>;
export type BlenderTrackKeyframe = z.infer<typeof trackKeyframeSchema>;
export type BlenderTrack = z.infer<typeof trackSchema>;
export type BlenderInteractManifest = z.infer<typeof interactManifestSchema>;
export type BlenderInteractState = z.infer<typeof interactStateSchema>;
export type BlenderScene = z.infer<typeof blenderSceneSchema>;
export type BlenderDocument = z.infer<typeof blenderDocumentSchema>;

export type JuiceColor = "orange" | "pink";
export type SplashPosition = "left" | "middle" | "right";
