import type { PartMotionTune } from "../part-motion-tune";
import type { PuppetPartKey } from "../types";
import { AJ_PRESENTER_V1 } from "../presets/aj-presenter-v1";

/** Idle motion per part — frozen preset `aj_presenter_v1` (2026-05-17). */
export const DEFAULT_HOST_PART_MOTION_TUNES: Record<PuppetPartKey, PartMotionTune> = {
  ...AJ_PRESENTER_V1.partMotion,
};
