import { BEDROOM_AREA } from "./bedroom";
import { SCHOOL_AREA } from "./school";
import { SUPERMARKET_AREA } from "./supermarket";
import {
  EXPLORE_AREA_IDS,
  type ExploreAreaDefinition,
  type ExploreAreaId,
} from "./types";

const AREAS: ExploreAreaDefinition[] = [BEDROOM_AREA, SCHOOL_AREA, SUPERMARKET_AREA];

const BY_ID = new Map<ExploreAreaId, ExploreAreaDefinition>(AREAS.map((a) => [a.id, a]));

export function listExploreAreas(): ExploreAreaDefinition[] {
  return [...AREAS].sort((a, b) => a.order - b.order);
}

export function getExploreArea(id: ExploreAreaId): ExploreAreaDefinition {
  const area = BY_ID.get(id);
  if (!area) throw new Error(`Unknown explore area: ${id}`);
  return area;
}

export function tryGetExploreArea(id: string): ExploreAreaDefinition | null {
  if (!BY_ID.has(id as ExploreAreaId)) return null;
  return getExploreArea(id as ExploreAreaId);
}

export function getExploreAreaIds(): ExploreAreaId[] {
  return [...EXPLORE_AREA_IDS];
}
