/** Shared export canvas for AJ first-batch parts (all layers align at this size). */
export const AJ_PUPPET_CANVAS_WIDTH = 2480;
export const AJ_PUPPET_CANVAS_HEIGHT = 3508;

const AJ_PIECES_BASE = "/media/puppet/AJ Waving Pieces";

/** URL-safe path for Next/Image `src` (spaces in folder and file names). */
export function ajPuppetAssetPath(fileName: string): string {
  const segments = [...AJ_PIECES_BASE.split("/").filter(Boolean), fileName];
  return `/${segments.map((s) => encodeURIComponent(s)).join("/")}`;
}
