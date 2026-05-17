"use client";

import Image from "next/image";
import { useMemo } from "react";
import { unopt } from "@/components/lesson/interactions/shared";
import {
  buildDefaultMotionTuneMap,
  type PartMotionTune,
} from "@/lib/puppet-activity/part-motion-tune";
import { DEFAULT_HOST_PART_MOTION_TUNES } from "@/lib/puppet-activity/puppets/default-host-part-motion";
import { resolvePivotForPart } from "@/lib/puppet-activity/pivot-utils";
import type { SkeletonBoneNode } from "@/lib/puppet-activity/puppet-skeleton";
import { DEFAULT_PUPPET_SKELETON } from "@/lib/puppet-activity/puppet-skeleton";
import { usePuppetBoneMotion } from "@/lib/puppet-activity/use-puppet-bone-motion";
import type {
  PuppetAnimationId,
  PuppetPartKey,
  PuppetRigDefinition,
  PuppetRigPivots,
} from "@/lib/puppet-activity/types";
import { PuppetBone } from "./PuppetBone";

type SkeletonContext = {
  puppet: PuppetRigDefinition;
  animId: PuppetAnimationId;
  motionEnabled: boolean;
  partMotionTunes: Partial<Record<PuppetPartKey, PartMotionTune>>;
  fallbackTunes: Record<PuppetPartKey, PartMotionTune>;
  defaultTune: PartMotionTune;
  pivotOverrides?: PuppetRigPivots;
  showPivotMarkers: boolean;
  rigToolsOpen: boolean;
  rigToolsPart: PuppetPartKey | null;
  oneShotGeneration: number;
};

function PuppetPartImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="pointer-events-none object-contain"
      unoptimized={unopt(src)}
      sizes="(max-width: 768px) 70vw, 280px"
    />
  );
}

function tuneForPart(ctx: SkeletonContext, part: PuppetPartKey): PartMotionTune {
  return ctx.partMotionTunes[part] ?? ctx.fallbackTunes[part] ?? ctx.defaultTune;
}

function SkeletonBone({
  node,
  ctx,
}: {
  node: SkeletonBoneNode;
  ctx: SkeletonContext;
}) {
  const { part } = node;
  const pivot = resolvePivotForPart(ctx.puppet, part, ctx.pivotOverrides);
  const tune = tuneForPart(ctx, part);
  const isRigPreviewPart = ctx.rigToolsOpen && ctx.rigToolsPart === part;

  const boneMotion = usePuppetBoneMotion({
    part,
    tune,
    motionEnabled: ctx.motionEnabled,
    animId: ctx.animId,
    oneShotGeneration: ctx.oneShotGeneration,
    rigToolsOpen: ctx.rigToolsOpen,
    rigToolsPart: ctx.rigToolsPart,
  });

  const asset = ctx.puppet.parts[part];

  return (
    <PuppetBone
      part={part}
      pivot={pivot}
      boneMotion={boneMotion}
      showPivotMarker={ctx.showPivotMarkers}
      isRigPreviewPart={isRigPreviewPart}
    >
      <PuppetPartImage src={asset.src} alt={`${ctx.puppet.label} ${part}`} />
      {(node.children ?? []).map((child) => (
        <SkeletonBone key={child.part} node={child} ctx={ctx} />
      ))}
    </PuppetBone>
  );
}

type Props = {
  puppet: PuppetRigDefinition;
  animId: PuppetAnimationId;
  motionEnabled?: boolean;
  pivotOverrides?: PuppetRigPivots;
  partMotionTunes?: Partial<Record<PuppetPartKey, PartMotionTune>>;
  showPivotMarkers?: boolean;
  rigToolsOpen?: boolean;
  rigToolsPart?: PuppetPartKey | null;
  oneShotGeneration: number;
  root?: SkeletonBoneNode;
};

export function PuppetSkeleton({
  puppet,
  animId,
  motionEnabled = true,
  pivotOverrides,
  partMotionTunes,
  showPivotMarkers = false,
  rigToolsOpen = false,
  rigToolsPart = null,
  oneShotGeneration,
  root = DEFAULT_PUPPET_SKELETON,
}: Props) {
  const fallbackTunes = useMemo(() => buildDefaultMotionTuneMap(), []);
  const defaultTune = DEFAULT_HOST_PART_MOTION_TUNES.body;

  const ctx: SkeletonContext = {
    puppet,
    animId,
    motionEnabled,
    partMotionTunes: partMotionTunes ?? {},
    fallbackTunes,
    defaultTune,
    pivotOverrides,
    showPivotMarkers,
    rigToolsOpen,
    rigToolsPart,
    oneShotGeneration,
  };

  return <SkeletonBone node={root} ctx={ctx} />;
}
