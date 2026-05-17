import type { CSSProperties } from "react";
import type { PuppetLineBeat, PuppetScript } from "./types";

/** Percent-based placement inside the presenter scene (anchor: center of caption). */
export type PuppetCaptionLayout = {
  xPercent: number;
  yPercent: number;
  scale?: number;
  /** Max width as % of scene width (default 88). */
  widthPercent?: number;
  /** Blue KidPanel behind text (default true). */
  showPanel?: boolean;
};

export const CAPTION_X_PERCENT_MIN = 5;
export const CAPTION_X_PERCENT_MAX = 95;
export const CAPTION_Y_PERCENT_MIN = 8;
export const CAPTION_Y_PERCENT_MAX = 92;
export const CAPTION_SCALE_MIN = 0.6;
export const CAPTION_SCALE_MAX = 1.6;
export const CAPTION_WIDTH_PERCENT_MIN = 40;
export const CAPTION_WIDTH_PERCENT_MAX = 100;

export const DEFAULT_PUPPET_CAPTION_LAYOUT: PuppetCaptionLayout = {
  xPercent: 50,
  yPercent: 78,
  scale: 1,
  widthPercent: 88,
  showPanel: true,
};

export function clampCaptionLayout(layout: PuppetCaptionLayout): PuppetCaptionLayout {
  return {
    xPercent: Math.min(
      CAPTION_X_PERCENT_MAX,
      Math.max(CAPTION_X_PERCENT_MIN, layout.xPercent),
    ),
    yPercent: Math.min(
      CAPTION_Y_PERCENT_MAX,
      Math.max(CAPTION_Y_PERCENT_MIN, layout.yPercent),
    ),
    scale: Math.min(
      CAPTION_SCALE_MAX,
      Math.max(CAPTION_SCALE_MIN, layout.scale ?? 1),
    ),
    widthPercent: Math.min(
      CAPTION_WIDTH_PERCENT_MAX,
      Math.max(CAPTION_WIDTH_PERCENT_MIN, layout.widthPercent ?? 88),
    ),
    showPanel: layout.showPanel !== false,
  };
}

export function resolveCaptionLayout(
  beat: PuppetLineBeat,
  script: PuppetScript,
  beatIndex: number,
  overrides?: Partial<Record<number, PuppetCaptionLayout>>,
): PuppetCaptionLayout {
  const override = overrides?.[beatIndex];
  const fromBeat = beat.captionLayout;
  const fromScript = script.defaultCaptionLayout;
  return clampCaptionLayout({
    ...DEFAULT_PUPPET_CAPTION_LAYOUT,
    ...fromScript,
    ...fromBeat,
    ...override,
  });
}

export function captionLayoutStyle(layout: PuppetCaptionLayout): CSSProperties {
  const c = clampCaptionLayout(layout);
  return {
    left: `${c.xPercent}%`,
    top: `${c.yPercent}%`,
    width: `${c.widthPercent}%`,
    transform: `translate(-50%, -50%) scale(${c.scale})`,
  };
}

export function formatCaptionLayoutForSource(layout: PuppetCaptionLayout): string {
  const c = clampCaptionLayout(layout);
  const parts = [
    `xPercent: ${c.xPercent}`,
    `yPercent: ${c.yPercent}`,
    `scale: ${c.scale}`,
  ];
  if (c.widthPercent !== DEFAULT_PUPPET_CAPTION_LAYOUT.widthPercent) {
    parts.push(`widthPercent: ${c.widthPercent}`);
  }
  if (c.showPanel === false) {
    parts.push("showPanel: false");
  }
  return `captionLayout: { ${parts.join(", ")} },`;
}

export function validateCaptionLayout(
  layout: PuppetCaptionLayout,
  label: string,
): string[] {
  const errors: string[] = [];
  if (layout.xPercent < CAPTION_X_PERCENT_MIN || layout.xPercent > CAPTION_X_PERCENT_MAX) {
    errors.push(`${label}: xPercent must be ${CAPTION_X_PERCENT_MIN}–${CAPTION_X_PERCENT_MAX}.`);
  }
  if (layout.yPercent < CAPTION_Y_PERCENT_MIN || layout.yPercent > CAPTION_Y_PERCENT_MAX) {
    errors.push(`${label}: yPercent must be ${CAPTION_Y_PERCENT_MIN}–${CAPTION_Y_PERCENT_MAX}.`);
  }
  const scale = layout.scale ?? 1;
  if (scale < CAPTION_SCALE_MIN || scale > CAPTION_SCALE_MAX) {
    errors.push(`${label}: scale must be ${CAPTION_SCALE_MIN}–${CAPTION_SCALE_MAX}.`);
  }
  return errors;
}
