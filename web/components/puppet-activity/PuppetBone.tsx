"use client";

import { motion as Motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import {
  PUPPET_BONE_INITIAL,
  type PuppetBoneMotionResult,
} from "@/lib/puppet-activity/use-puppet-bone-motion";
import type { PuppetPartKey } from "@/lib/puppet-activity/types";

type Props = {
  part: PuppetPartKey;
  pivot: string;
  boneMotion: PuppetBoneMotionResult;
  showPivotMarker: boolean;
  isRigPreviewPart: boolean;
  children: ReactNode;
};

function parsePivotPercents(pivot: string): { x: number; y: number } | null {
  const parts = pivot.trim().split(/\s+/);
  const x = parseFloat(parts[0] ?? "");
  const y = parseFloat(parts[1] ?? "");
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

export function PuppetBone({
  part,
  pivot,
  boneMotion,
  showPivotMarker,
  isRigPreviewPart,
  children,
}: Props) {
  const pivotPct = parsePivotPercents(pivot);
  const { mode, idleAnimate, controls, motionKey } = boneMotion;

  const animate =
    mode === "idle" && idleAnimate ? idleAnimate
    : mode === "oneshot" ? controls
    : PUPPET_BONE_INITIAL;

  return (
    <Motion.div
      key={motionKey}
      className="absolute inset-0 will-change-transform"
      style={
        {
          transformOrigin: pivot,
          pointerEvents: "none",
        } as CSSProperties
      }
      data-puppet-part={part}
      initial={false}
      animate={animate}
    >
      <div className="pointer-events-none absolute inset-0">{children}</div>
      {showPivotMarker && pivotPct ?
        <div
          className="pointer-events-none absolute z-20"
          style={{
            left: `${pivotPct.x}%`,
            top: `${pivotPct.y}%`,
            transform: "translate(-50%, -50%)",
          }}
          aria-hidden
        >
          <div
            className={`h-3 w-3 rounded-full border-2 border-kid-ink shadow-[1px_1px_0_#152668] ${
              isRigPreviewPart ? "bg-[#f5a623] ring-2 ring-white" : "bg-[#ff4d4d]"
            }`}
          />
          <div
            className="absolute left-1/2 top-1/2 h-8 w-px -translate-x-1/2 -translate-y-1/2 bg-kid-ink/70"
            aria-hidden
          />
          <div
            className="absolute left-1/2 top-1/2 h-px w-8 -translate-x-1/2 -translate-y-1/2 bg-kid-ink/70"
            aria-hidden
          />
        </div>
      : null}
    </Motion.div>
  );
}
