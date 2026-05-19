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
  /** Resolved line text (after `{{food}}` substitution). */
  displayText: string;
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
  displayText,
  layout,
  revealKey,
  animate,
  motionEnabled,
  className,
}: Props) {
  const lineKey = `${beatIndex}-${revealKey}`;
  const content = (
    <PuppetWordLine
      lineKey={`${lineKey}-${animate ? "anim" : "static"}`}
      text={displayText}
      wordStaggerMs={beat.wordStaggerMs}
      motionEnabled={motionEnabled && animate}
      captionSize={layout.size ?? "lg"}
      className={
        layout.showPanel === false ?
          "rounded-lg bg-white/85 px-2 py-1 shadow-sm ring-1 ring-kid-ink/15"
        : undefined
      }
    />
  );

  return (
    <div
      className={clsx(
        "pointer-events-none absolute z-10 origin-center transition-opacity duration-300",
        className,
      )}
      style={captionLayoutStyle(layout)}
      data-puppet-caption
      data-beat-index={beatIndex}
    >
      {layout.showPanel !== false ?
        <KidPanel
          className={clsx(
            "border-4 border-kid-ink bg-[#dbeafe] shadow-[4px_4px_0_#0a2f86]",
            layout.size === "sm" ? "px-2 py-1.5 sm:px-2.5 sm:py-2" : "px-3 py-3 sm:px-4 sm:py-4",
          )}
        >
          {content}
        </KidPanel>
      : content}
    </div>
  );
}
