import {
  listLetterAFruitAssetIds,
  type LetterAFruitAssetKey,
  type LetterFruitAssetKey,
} from "@/lib/topdown/letter-fruit-atlas";
import { isPlotLayerBaseTileId } from "@/lib/topdown/plot-layer-base-tiles";
import type { LetterFruitPlotPreset, PlotLayerAnchor } from "@/lib/topdown/plot-layer-types";

export type LetterFruitPlotPick = {
  assetKey: LetterAFruitAssetKey;
  preset: LetterFruitPlotPreset;
};

export type LetterFruitPlotPicksPayload = {
  presets: LetterFruitPlotPick[];
};

const PLOT_LAYER_ANCHORS = new Set<PlotLayerAnchor>([
  "center",
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
]);

function expectedStageForAssetKey(assetKey: LetterAFruitAssetKey): string {
  return assetKey.replace("letter_a_", "");
}

function validatePlotPreset(assetKey: LetterAFruitAssetKey, preset: LetterFruitPlotPreset): void {
  if (preset.fruitStage !== expectedStageForAssetKey(assetKey)) {
    throw new Error(
      `fruitStage mismatch for ${assetKey}: expected ${expectedStageForAssetKey(assetKey)}, got ${preset.fruitStage}`,
    );
  }
  if (!isPlotLayerBaseTileId(preset.baseTileId)) {
    throw new Error(`Invalid baseTileId for ${assetKey}: ${preset.baseTileId}`);
  }
  if (preset.layer.scale < 0.08 || preset.layer.scale > 2) {
    throw new Error(`Invalid scale for ${assetKey}: ${preset.layer.scale}`);
  }
  if (!PLOT_LAYER_ANCHORS.has(preset.layer.anchor)) {
    throw new Error(`Invalid anchor for ${assetKey}: ${preset.layer.anchor}`);
  }
}

export function normalizeLetterFruitPlotPicksPayload(
  payload: LetterFruitPlotPicksPayload,
): LetterFruitPlotPick[] {
  const expected = new Set(listLetterAFruitAssetIds());
  const byId = new Map<LetterAFruitAssetKey, LetterFruitPlotPick>();

  for (const pick of payload.presets) {
    if (!expected.has(pick.assetKey)) {
      throw new Error(`Unknown letter fruit plot asset key: ${pick.assetKey}`);
    }
    validatePlotPreset(pick.assetKey, pick.preset);
    byId.set(pick.assetKey, pick);
  }

  const missing = listLetterAFruitAssetIds().filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new Error(`Missing letter fruit plot picks: ${missing.join(", ")}`);
  }

  return listLetterAFruitAssetIds().map((assetKey) => byId.get(assetKey)!);
}

export function formatLetterFruitPlotPresetEntry(
  assetKey: LetterFruitAssetKey,
  preset: LetterFruitPlotPreset,
): string {
  const { baseTileId, fruitStage, layer } = preset;
  const scale = Math.round(layer.scale * 1000) / 1000;
  return `${assetKey}: {
    baseTileId: ${JSON.stringify(baseTileId)},
    fruitStage: ${JSON.stringify(fruitStage)},
    layer: { scale: ${scale}, offsetX: ${layer.offsetX}, offsetY: ${layer.offsetY}, anchor: ${JSON.stringify(layer.anchor)} },
  }`;
}

export function renderLetterFruitPlotPresetEntries(picks: LetterFruitPlotPick[]): string {
  return picks
    .map((pick) => formatLetterFruitPlotPresetEntry(pick.assetKey, pick.preset))
    .join(",\r\n  ");
}

export function patchLetterFruitPlotPresets(
  source: string,
  picks: LetterFruitPlotPick[],
): string {
  const entries = renderLetterFruitPlotPresetEntries(picks);
  const pattern =
    /(\/\*\* Hand-tuned plot-layer presets — updated via apply-letter-fruit-plot-picks\. \*\/\r?\nexport const LETTER_A_PLOT_PRESETS: Record<[\s\S]*?> = \{\r?\n)([\s\S]*?)(\r?\n\};)/;

  const next = source.replace(
    pattern,
    `$1  ${entries},\r\n$3`,
  );
  if (next === source) {
    throw new Error(
      "Could not locate LETTER_A_PLOT_PRESETS block in letter-fruit-plot-presets.ts",
    );
  }
  return next;
}
