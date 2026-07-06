import {
  clampStackPresetToCrop,
  walkBottom,
  type AtlasTileStackPreset,
} from "@/lib/topdown/atlas-tile-layout";

const DEFAULT_LETTER_FRUIT_LIP_OVERLAP_PX = 6;

/** Letter-fruit art is flat on the plot — no 3D lip tuck unless explicitly enabled. */
export function letterFruitStackHas3dLip(
  stack: AtlasTileStackPreset,
  cropHeight: number,
): boolean {
  return stack.lipStartY < cropHeight;
}

export function applyLetterFruit3dLip(
  stack: AtlasTileStackPreset,
  sw: number,
  sh: number,
  enabled: boolean,
): AtlasTileStackPreset {
  if (enabled) {
    return clampStackPresetToCrop(
      {
        ...stack,
        lipStartY: walkBottom(stack.walk),
        layout: {
          ...stack.layout,
          lipOverlapPx:
            stack.layout.lipOverlapPx > 0
              ? stack.layout.lipOverlapPx
              : DEFAULT_LETTER_FRUIT_LIP_OVERLAP_PX,
        },
      },
      sw,
      sh,
    );
  }

  return clampStackPresetToCrop(
    {
      ...stack,
      lipStartY: sh,
      layout: {
        ...stack.layout,
        lipOverlapPx: 0,
      },
    },
    sw,
    sh,
  );
}
