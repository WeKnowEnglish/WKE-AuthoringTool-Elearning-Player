import { describe, expect, it } from "vitest";
import { applyPlotLayerAlignment } from "@/lib/topdown/plot-layer-align";
import { computePlotFruitPlacement } from "@/lib/topdown/plot-layer-placement";

const BASE_LAYER = {
  scale: 0.3,
  offsetX: 4,
  offsetY: -2,
  anchor: "bottom-center" as const,
};

describe("plot-layer-align", () => {
  it("maps alignments to anchors and clears offsets", () => {
    expect(applyPlotLayerAlignment(BASE_LAYER, "center")).toEqual({
      scale: 0.3,
      offsetX: 0,
      offsetY: 0,
      anchor: "center",
    });
    expect(applyPlotLayerAlignment(BASE_LAYER, "top").anchor).toBe("top-center");
    expect(applyPlotLayerAlignment(BASE_LAYER, "left").anchor).toBe("middle-left");
    expect(applyPlotLayerAlignment(BASE_LAYER, "right").anchor).toBe("middle-right");
  });

  it("bottom alignment pins fruit base to the cell bottom", () => {
    const layer = applyPlotLayerAlignment(BASE_LAYER, "bottom");
    const placement = computePlotFruitPlacement({
      cellPx: 64,
      cropSw: 100,
      cropSh: 80,
      layer,
    });
    expect(placement.top + placement.displayH).toBe(64);
  });
});
