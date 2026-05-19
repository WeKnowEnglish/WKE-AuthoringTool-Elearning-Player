import { DEFAULT_HOST } from "./puppets/default-host";
import { DEMO_AM_WITH_I } from "./scripts/demo-am-with-i";
import { LIKE_LIKES_FOOD } from "./scripts/like-likes-food";
import type { PuppetDefinition, PuppetId, PuppetScript, PuppetScriptId } from "./types";
import { isPuppetId, isPuppetScriptId } from "./types";

export const PUPPET_SCRIPT_MENU: { id: PuppetScriptId; label: string }[] = [
  { id: "like_likes_food", label: LIKE_LIKES_FOOD.title },
  { id: "demo_am_with_i", label: DEMO_AM_WITH_I.title },
];

const PUPPETS: Record<PuppetId, PuppetDefinition> = {
  default_host: DEFAULT_HOST,
};

const SCRIPTS: Record<PuppetScriptId, PuppetScript> = {
  demo_am_with_i: DEMO_AM_WITH_I,
  like_likes_food: LIKE_LIKES_FOOD,
};

export function getPuppet(id: PuppetId): PuppetDefinition {
  return PUPPETS[id];
}

export function getPuppetScript(id: PuppetScriptId): PuppetScript {
  return SCRIPTS[id];
}

export function tryGetPuppetScript(id: string): PuppetScript | null {
  if (!isPuppetScriptId(id)) return null;
  return SCRIPTS[id];
}

export function tryGetPuppet(id: string): PuppetDefinition | null {
  if (!isPuppetId(id)) return null;
  return PUPPETS[id];
}
