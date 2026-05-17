"use client";

import { clsx } from "clsx";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  captionLayoutStyle,
  type PuppetCaptionLayout,
} from "@/lib/puppet-activity/caption-layout";
import type { PuppetLineBeat } from "@/lib/puppet-activity/types";
import { PuppetWordLine } from "./PuppetWordLine";

type Props = {
  beat: PuppetLineBeat;
  beatIndex: number;
  layout: PuppetCaptionLayout;
  revealKey: number;
  /** Only the newest line plays word reveal; earlier lines stay visible. */
  animate: boolean;
  motionEnabled: boolean;
  className?: string;
};

export function PuppetSceneCaption({
  beat,
  beatIndex,
  layout,
  revealKey,
  animate,
  motionEnabled,
  className,
}: Props) {
  const lineKey = `${beatIndex}-${revealKey}`;
  const content = (
    <PuppetWordLine
      lineKey={lineKey}
      text={beat.text}
      wordStaggerMs={beat.wordStaggerMs}
      motionEnabled={motionEnabled && animate}
      className={layout.showPanel === false ? "drop-shadow-[2px_2px_0_#152668]" : undefined}
    />
  );

  return (
    <div
      className={clsx("pointer-events-none absolute z-10 origin-center", className)}
      style={captionLayoutStyle(layout)}
      data-puppet-caption
      data-beat-index={beatIndex}
    >
      {layout.showPanel !== false ?
        <KidPanel className="border-4 border-kid-ink bg-[#dbeafe] px-3 py-3 shadow-[4px_4px_0_#0a2f86] sm:px-4 sm:py-4">
          {content}
        </KidPanel>
      : content}
    </div>
  );
}
