import type { PuppetPartKey } from "./types";

/** Logical bone in the parent transform tree (full-canvas layers, hinge at pivot %). */
export type SkeletonBoneNode = {
  part: PuppetPartKey;
  children?: SkeletonBoneNode[];
};

/** Default AJ host: body root → head + arm chain. */
export const DEFAULT_PUPPET_SKELETON: SkeletonBoneNode = {
  part: "body",
  children: [
    { part: "head" },
    {
      part: "upperArm",
      children: [
        {
          part: "lowerArm",
          children: [{ part: "hand" }],
        },
      ],
    },
  ],
};

/** Depth-first part order for rig editor / export. */
export function skeletonPartOrder(
  root: SkeletonBoneNode = DEFAULT_PUPPET_SKELETON,
): PuppetPartKey[] {
  const out: PuppetPartKey[] = [root.part];
  for (const child of root.children ?? []) {
    out.push(...skeletonPartOrder(child));
  }
  return out;
}
