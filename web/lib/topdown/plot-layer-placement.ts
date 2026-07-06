import type {
  PlotFruitLayerPlacement,
  PlotFruitPlacement,
  PlotLayerAnchor,
} from "@/lib/topdown/plot-layer-types";

const ANCHOR_FRACTION: Record<PlotLayerAnchor, { x: number; y: number }> = {
  "top-left": { x: 0, y: 0 },
  "top-center": { x: 0.5, y: 0 },
  "top-right": { x: 1, y: 0 },
  "middle-left": { x: 0, y: 0.5 },
  center: { x: 0.5, y: 0.5 },
  "middle-right": { x: 1, y: 0.5 },
  "bottom-left": { x: 0, y: 1 },
  "bottom-center": { x: 0.5, y: 1 },
  "bottom-right": { x: 1, y: 1 },
};

const CELL_ANCHOR: Record<PlotLayerAnchor, { x: number; y: number }> = {
  "top-left": { x: 0, y: 0 },
  "top-center": { x: 0.5, y: 0 },
  "top-right": { x: 1, y: 0 },
  "middle-left": { x: 0, y: 0.5 },
  center: { x: 0.5, y: 0.5 },
  "middle-right": { x: 1, y: 0.5 },
  "bottom-left": { x: 0, y: 1 },
  "bottom-center": { x: 0.5, y: 1 },
  "bottom-right": { x: 1, y: 1 },
};

export function fruitDisplaySize(
  cropSw: number,
  cropSh: number,
  scale: number,
): { displayW: number; displayH: number } {
  return {
    displayW: Math.round(cropSw * scale),
    displayH: Math.round(cropSh * scale),
  };
}

/** Top-left of fruit bbox from anchor pin in cell space. */
export function anchorPositionInCell(
  cellPx: number,
  displayW: number,
  displayH: number,
  anchor: PlotLayerAnchor,
): { x: number; y: number } {
  const cellPin = CELL_ANCHOR[anchor];
  const fruitPin = ANCHOR_FRACTION[anchor];
  const ax = cellPin.x * cellPx;
  const ay = cellPin.y * cellPx;
  return {
    x: ax - fruitPin.x * displayW,
    y: ay - fruitPin.y * displayH,
  };
}

export function computePlotFruitPlacement(args: {
  cellPx: number;
  cropSw: number;
  cropSh: number;
  layer: PlotFruitLayerPlacement;
}): PlotFruitPlacement {
  const { cellPx, cropSw, cropSh, layer } = args;
  const { displayW, displayH } = fruitDisplaySize(cropSw, cropSh, layer.scale);
  const anchored = anchorPositionInCell(
    cellPx,
    displayW,
    displayH,
    layer.anchor,
  );

  return {
    left: anchored.x + layer.offsetX,
    top: anchored.y + layer.offsetY,
    scale: layer.scale,
    displayW,
    displayH,
  };
}

const ANCHOR_PIN_FRACTION: Record<PlotLayerAnchor, { x: number; y: number }> = {
  "top-left": { x: 0, y: 0 },
  "top-center": { x: 0.5, y: 0 },
  "top-right": { x: 1, y: 0 },
  "middle-left": { x: 0, y: 0.5 },
  center: { x: 0.5, y: 0.5 },
  "middle-right": { x: 1, y: 0.5 },
  "bottom-left": { x: 0, y: 1 },
  "bottom-center": { x: 0.5, y: 1 },
  "bottom-right": { x: 1, y: 1 },
};

function clampScale(scale: number): number {
  return Math.min(2, Math.max(0.08, scale));
}

/** Scale fruit layer while keeping the anchor pin fixed in cell space. */
export function resizePlotLayerScale(args: {
  cellPx: number;
  cropSw: number;
  cropSh: number;
  layer: PlotFruitLayerPlacement;
  nextScale: number;
}): PlotFruitLayerPlacement {
  const { cellPx, cropSw, cropSh, layer, nextScale } = args;
  const clampedScale = clampScale(nextScale);
  const current = computePlotFruitPlacement({ cellPx, cropSw, cropSh, layer });
  const pin = ANCHOR_PIN_FRACTION[layer.anchor];
  const anchorPinX = current.left + pin.x * current.displayW;
  const anchorPinY = current.top + pin.y * current.displayH;
  const { displayW, displayH } = fruitDisplaySize(cropSw, cropSh, clampedScale);
  const anchored = anchorPositionInCell(cellPx, displayW, displayH, layer.anchor);
  const newLeft = anchorPinX - pin.x * displayW;
  const newTop = anchorPinY - pin.y * displayH;

  return {
    ...layer,
    scale: clampedScale,
    offsetX: newLeft - anchored.x,
    offsetY: newTop - anchored.y,
  };
}
