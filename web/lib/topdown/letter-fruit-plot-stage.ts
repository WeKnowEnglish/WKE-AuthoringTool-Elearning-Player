import type { LetterFruitStageId } from "@/lib/topdown/letter-fruit-atlas";
import type { MockPlotState } from "@/lib/topdown/preview-mock-data";

/** Letter A fruit overlay for mock garden plot states. */
export function mockPlotStateToLetterFruitStage(
  state: MockPlotState,
): LetterFruitStageId | null {
  switch (state) {
    case "sprout":
      return "sprout";
    case "growing":
      return "young";
    case "watered_growing":
      return "growing";
    case "ready":
    case "ready_fertilized":
      return "ripe";
    default:
      return null;
  }
}

export function mockPlotStateLetterFruitReadyGlow(state: MockPlotState): boolean {
  return state === "ready" || state === "ready_fertilized";
}
