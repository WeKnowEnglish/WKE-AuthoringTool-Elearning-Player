import { rigDocumentSchema, type RigDocument, type RigScene } from "./rig-types";
import {
  blenderDocumentSchema,
  type BlenderDocument,
  type BlenderScene,
} from "./types";

export const BLENDER_SCENE_URL = "/pet/blender-scene.json";
/** Bump when public/pet/dog-poses.json changes so browsers refetch after sync. */
export const DOG_POSES_CACHE_VERSION = "3";
export const DOG_POSES_URL = `/pet/dog-poses.json?v=${DOG_POSES_CACHE_VERSION}`;

export function parseBlenderDocument(data: unknown): BlenderDocument {
  return blenderDocumentSchema.parse(data);
}

/** First scene only; ignores duplicate exports. */
export function primarySceneFromDocument(doc: BlenderDocument): BlenderScene {
  return doc.scenes[0]!;
}

export async function loadBlenderScene(
  url: string = BLENDER_SCENE_URL,
): Promise<BlenderScene> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load blender scene (${res.status})`);
  }
  const json: unknown = await res.json();
  const doc = parseBlenderDocument(json);
  return primarySceneFromDocument(doc);
}

export function parseRigDocument(data: unknown): RigDocument {
  return rigDocumentSchema.parse(data);
}

export function sceneById(doc: RigDocument, sceneId: string): RigScene | undefined {
  return doc.scenes.find((s) => s.id === sceneId);
}

export async function loadDogPosesDocument(
  url: string = DOG_POSES_URL,
): Promise<RigDocument> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load dog poses (${res.status})`);
  }
  const json: unknown = await res.json();
  return parseRigDocument(json);
}
