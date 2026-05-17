"use client";

import { useLayoutEffect, useState } from "react";
import type { PartMotionTune } from "@/lib/puppet-activity/part-motion-tune";
import type { SkeletonBoneNode } from "@/lib/puppet-activity/puppet-skeleton";
import { DEFAULT_PUPPET_SKELETON } from "@/lib/puppet-activity/puppet-skeleton";
import {
  skeletonFromParentMap,
  type SkeletonParentMap,
} from "@/lib/puppet-activity/puppet-skeleton-utils";
import type {
  PuppetAnimationId,
  PuppetPartKey,
  PuppetRigDefinition,
  PuppetRigPivots,
} from "@/lib/puppet-activity/types";
import { PuppetSkeleton } from "./PuppetSkeleton";

type Props = {
  puppet: PuppetRigDefinition;
  oneShotAnimation?: PuppetAnimationId;
  motionEnabled?: boolean;
  pivotOverrides?: PuppetRigPivots;
  partMotionTunes?: Partial<Record<PuppetPartKey, PartMotionTune>>;
  showPivotMarkers?: boolean;
  rigToolsOpen?: boolean;
  rigToolsPart?: PuppetPartKey | null;
  skeletonRoot?: SkeletonBoneNode;
  /** Dev toolbar: fire a preset gesture on the stage. */
  previewGesture?: PuppetAnimationId;
  previewGestureGeneration?: number;
  className?: string;
};

export function PuppetStage({
  puppet,
  oneShotAnimation,
  motionEnabled = true,
  pivotOverrides,
  partMotionTunes,
  showPivotMarkers = false,
  rigToolsOpen = false,
  rigToolsPart = null,
  skeletonRoot,
  previewGesture,
  previewGestureGeneration = 0,
  className,
}: Props) {
  const scriptAnim: PuppetAnimationId = oneShotAnimation ?? "idle";
  const [oneShotGeneration, setOneShotGeneration] = useState(0);

  const root = skeletonRoot ?? DEFAULT_PUPPET_SKELETON;

  const previewActive =
    previewGestureGeneration > 0 &&
    !!previewGesture &&
    previewGesture !== "idle" &&
    previewGesture !== "none";

  const effectiveAnim: PuppetAnimationId = previewActive ? previewGesture! : scriptAnim;

  useLayoutEffect(() => {
    if (!motionEnabled || rigToolsOpen) return;
    if (!oneShotAnimation || oneShotAnimation === "none" || oneShotAnimation === "idle") {
      return;
    }
    setOneShotGeneration((g) => g + 1);
  }, [oneShotAnimation, motionEnabled, rigToolsOpen]);

  useLayoutEffect(() => {
    if (!motionEnabled || rigToolsOpen) return;
    if (!previewGesture || previewGesture === "none" || previewGesture === "idle") return;
    if (previewGestureGeneration <= 0) return;
    setOneShotGeneration((g) => g + 1);
  }, [previewGesture, previewGestureGeneration, motionEnabled, rigToolsOpen]);

  const stageClass =
    className ??
    "relative mx-auto w-[min(72vw,300px)] max-h-[min(42vh,360px)]";

  return (
    <div
      className={stageClass}
      style={{ aspectRatio: `${puppet.canvasWidth} / ${puppet.canvasHeight}` }}
      data-puppet-stage
    >
      <div className="relative h-full w-full">
        <PuppetSkeleton
          puppet={puppet}
          animId={effectiveAnim}
          motionEnabled={motionEnabled}
          pivotOverrides={pivotOverrides}
          partMotionTunes={partMotionTunes}
          showPivotMarkers={showPivotMarkers}
          rigToolsOpen={rigToolsOpen}
          rigToolsPart={rigToolsPart}
          oneShotGeneration={oneShotGeneration}
          root={root}
        />
      </div>
    </div>
  );
}

/** Build render tree from parent map (exported for tests / overlay). */
export function resolveSkeletonRoot(
  parentMap: SkeletonParentMap | undefined,
  fallback: SkeletonBoneNode = DEFAULT_PUPPET_SKELETON,
): SkeletonBoneNode {
  if (!parentMap) return fallback;
  return skeletonFromParentMap(parentMap) ?? fallback;
}
