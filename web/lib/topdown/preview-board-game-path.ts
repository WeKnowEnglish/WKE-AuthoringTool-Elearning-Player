import type { WkePathTileId } from "@/lib/topdown/wke-sprite-atlas";

import { pathTileLabel } from "@/lib/topdown/wke-path-tile-labels";



export type WkePathAssetGroup = {

  label: string;

  description?: string;

  assetIds: WkePathTileId[];

};



/** 4×4 sheet layout — same order as the PNG grid (row 0 at top). */

export const WKE_PATH_ASSET_GROUPS: WkePathAssetGroup[] = [

  {

    label: "Sheet row 0 (top)",

    description: "Corners, straights, T-cross, and end caps on the top row of the PNG.",

    assetIds: ["path_r0c0", "path_r0c1", "path_r0c2", "path_r0c3"],

  },

  {

    label: "Sheet row 1",

    description: "Vertical straight, cross, and T-cross variants.",

    assetIds: ["path_r1c0", "path_r1c1", "path_r1c2", "path_r1c3"],

  },

  {

    label: "Sheet row 2",

    description: "Corner NE, extra cross art, T-cross (S open), end (S).",

    assetIds: ["path_r2c0", "path_r2c1", "path_r2c2", "path_r2c3"],

  },

  {

    label: "Sheet row 3 (bottom)",

    description: "Corner NW/SW, end (N), isolated pad.",

    assetIds: ["path_r3c0", "path_r3c1", "path_r3c2", "path_r3c3"],

  },

];



export function wkePathAssetPickerLabel(assetId: WkePathTileId): string {

  return pathTileLabel(assetId).title;

}

