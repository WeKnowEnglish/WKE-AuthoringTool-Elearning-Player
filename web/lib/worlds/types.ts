import type { VocabSetId } from "@/lib/vocabulary-templates/types";

export type WorldId = "world_1";

export type VocabHubId = "food" | "animals" | "school" | "body" | "jobs";

export type ExplorationNode =
  | { kind: "vocab_set"; setId: VocabSetId }
  | { kind: "vocab_hub"; hubId: VocabHubId };

export type WorldTheme = {
  sky: string;
  grass: string;
  platformTop: string;
  platformSide: string;
  platformEdge: string;
  ink: string;
};

export type WorldLevelDef = {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  explorationNodes: ExplorationNode[];
};

export type WorldDef = {
  id: WorldId;
  name: string;
  tagline: string;
  theme: WorldTheme;
  levels: WorldLevelDef[];
  /** Extra nodes (e.g. learn hub visits) counted in exploration percent. */
  explorationHubNodes?: ExplorationNode[];
};
