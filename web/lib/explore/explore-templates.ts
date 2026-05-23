/** Visual preset for Explore: looped run + gate/encounter scenes. */
export type ExploreTemplateId = "default_run_v1";

export type ExploreRunLoopLayer = {
  /** Parallax factor (0 = fixed, 1 = scrolls with ground). */
  parallax: number;
  /** Height as fraction of canvas (0–1). */
  heightFrac: number;
  /** Optional image URL; procedural fill when omitted. */
  url?: string;
  /** CSS-like color when no url (e.g. "#86efac"). */
  fill?: string;
};

export type ExploreGateScenePreset = {
  obstacleKind: "spike" | "lava";
  /** Optional scene backdrop override. */
  backgroundUrl?: string;
};

export type ExploreTemplate = {
  id: ExploreTemplateId;
  label: string;
  runLoop: {
    loopWidthPx: number;
    skyTop: string;
    skyBottom: string;
    ground: string;
    groundEdge: string;
    layers: ExploreRunLoopLayer[];
  };
  gateScenes: [ExploreGateScenePreset, ExploreGateScenePreset, ExploreGateScenePreset];
  encounter: {
    skyTop: string;
    skyBottom: string;
    panelAccent: string;
  };
};

export const EXPLORE_DEFAULT_TEMPLATE_ID: ExploreTemplateId = "default_run_v1";

export const EXPLORE_TEMPLATES: Record<ExploreTemplateId, ExploreTemplate> = {
  default_run_v1: {
    id: "default_run_v1",
    label: "Forest run",
    runLoop: {
      loopWidthPx: 720,
      skyTop: "#7dd3fc",
      skyBottom: "#bae6fd",
      ground: "#4ade80",
      groundEdge: "#166534",
      layers: [
        { parallax: 0.12, heightFrac: 0.42, fill: "#86efac" },
        { parallax: 0.35, heightFrac: 0.28, fill: "#4ade80" },
      ],
    },
    gateScenes: [
      { obstacleKind: "spike" },
      { obstacleKind: "lava" },
      { obstacleKind: "spike" },
    ],
    encounter: {
      skyTop: "#c4b5fd",
      skyBottom: "#ddd6fe",
      panelAccent: "border-violet-400 bg-violet-50",
    },
  },
};

export function getExploreTemplate(id?: ExploreTemplateId | string | null): ExploreTemplate {
  if (id && id in EXPLORE_TEMPLATES) {
    return EXPLORE_TEMPLATES[id as ExploreTemplateId];
  }
  return EXPLORE_TEMPLATES[EXPLORE_DEFAULT_TEMPLATE_ID];
}
