import type { SpriteFrameId } from "@/lib/topdown/garden-sprite-atlas";

export type MockPlotState =
  | "empty"
  | "sprout"
  | "growing"
  | "ready"
  | "ready_weed"
  | "ready_fertilized"
  | "watered_growing"
  | "selected_empty";

export type MockPlotCell = {
  row: number;
  col: number;
  state: MockPlotState;
  label: string;
};

export const MOCK_GARDEN_GRID_COLS = 4;
export const MOCK_GARDEN_GRID_ROWS = 4;

export const PREVIEW_PLOT_DISPLAY_PX = 88;
export const PREVIEW_TOOL_ICON_PX = 32;
export const PREVIEW_ATLAS_CARD_PX = 96;

export const MOCK_GARDEN_PLOTS: MockPlotCell[] = [
  { row: 0, col: 0, state: "sprout", label: "Sprout" },
  { row: 0, col: 1, state: "growing", label: "Growing" },
  { row: 0, col: 2, state: "ready", label: "Ready" },
  { row: 0, col: 3, state: "ready_fertilized", label: "Fertilized" },
  { row: 1, col: 0, state: "ready_weed", label: "Weed" },
  { row: 1, col: 1, state: "watered_growing", label: "Watered" },
  { row: 1, col: 2, state: "empty", label: "Empty" },
  { row: 1, col: 3, state: "selected_empty", label: "Selected" },
  { row: 2, col: 0, state: "empty", label: "Empty" },
  { row: 2, col: 1, state: "empty", label: "Empty" },
  { row: 2, col: 2, state: "empty", label: "Empty" },
  { row: 2, col: 3, state: "empty", label: "Empty" },
  { row: 3, col: 0, state: "empty", label: "Empty" },
  { row: 3, col: 1, state: "empty", label: "Empty" },
  { row: 3, col: 2, state: "empty", label: "Empty" },
  { row: 3, col: 3, state: "empty", label: "Empty" },
];

export const MOCK_HUD = {
  seedCount: 2,
  letters: { A: 1, B: 2, R: 1 } as Record<string, number>,
  wateringCanReady: true,
  fertilizerReady: false,
  fertilizerCooldownLabel: "12m",
  spellingLevel: 2,
  spellingTitle: "Bud",
  spellingProgress: "3/5",
};

/** @deprecated Use GardenMapSnippetTileKey from preview-seamless-maps */
export type MapSnippetTileKey = SpriteFrameId;
