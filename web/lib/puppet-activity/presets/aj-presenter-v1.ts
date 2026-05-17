import type { PartMotionTune } from "../part-motion-tune";
import type { SkeletonBoneNode } from "../puppet-skeleton";
import type { PuppetId, PuppetPartKey, PuppetRigPivots } from "../types";

/** Frozen AJ rig — tuned 2026-05-17 (presenter calm: body bob, head/arm idle). */
export type FrozenPuppetRigPreset = {
  id: string;
  label: string;
  puppetId: PuppetId;
  exportedAt: string;
  pivots: PuppetRigPivots;
  skeleton: SkeletonBoneNode;
  partMotion: Record<PuppetPartKey, PartMotionTune>;
};

export const AJ_PRESENTER_V1: FrozenPuppetRigPreset = {
  id: "aj_presenter_v1",
  label: "AJ presenter (calm)",
  puppetId: "default_host",
  exportedAt: "2026-05-17T18:13:24.202Z",
  pivots: {
    body: "46% 69%",
    head: "46% 40%",
    upperArm: "55% 47%",
    lowerArm: "69% 57%",
    hand: "69% 43%",
  },
  skeleton: {
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
  },
  partMotion: {
    body: {
      rotateEnabled: false,
      translateEnabled: true,
      speed: 0.55,
      rotateMinDeg: -3,
      rotateMaxDeg: 4,
      translateMaxPx: 4,
    },
    head: {
      rotateEnabled: true,
      translateEnabled: false,
      speed: 0.7,
      rotateMinDeg: -5,
      rotateMaxDeg: 3,
      translateMaxPx: 0,
    },
    upperArm: {
      rotateEnabled: true,
      translateEnabled: false,
      speed: 0.6,
      rotateMinDeg: -8,
      rotateMaxDeg: 3,
      translateMaxPx: 0,
    },
    lowerArm: {
      rotateEnabled: true,
      translateEnabled: false,
      speed: 1.05,
      rotateMinDeg: -2,
      rotateMaxDeg: 9,
      translateMaxPx: 0,
    },
    hand: {
      rotateEnabled: true,
      translateEnabled: false,
      speed: 1,
      rotateMinDeg: -5,
      rotateMaxDeg: 5,
      translateMaxPx: 12,
    },
  },
};
