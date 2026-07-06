import type { LetterFruitAssetKey } from "@/lib/topdown/letter-fruit-atlas";
import type { LetterFruitPlotPreset } from "@/lib/topdown/plot-layer-types";
import { formatLetterFruitPlotPresetEntry } from "@/lib/topdown/letter-fruit-plot-picks-sync";

export function formatLetterFruitPlotPresetExport(
  assetKey: LetterFruitAssetKey,
  preset: LetterFruitPlotPreset,
): string {
  return `${formatLetterFruitPlotPresetEntry(assetKey, preset)},`;
}
