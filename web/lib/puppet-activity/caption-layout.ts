import type { CSSProperties } from "react";
import type { PuppetLineBeat, PuppetScript } from "./types";

export const CAPTION_SIZES = ["sm", "md", "lg"] as const;
export type PuppetCaptionSize = (typeof CAPTION_SIZES)[number];

export const CAPTION_ROLES = ["headline", "label", "subtitle"] as const;
export type PuppetCaptionRole = (typeof CAPTION_ROLES)[number];

/** Percent-based placement inside the presenter scene (anchor: center of caption). */
export type PuppetCaptionLayout = {
  xPercent: number;
  yPercent: number;
  scale?: number;
  /** Max width as % of scene width (default 88). */
  widthPercent?: number;
  /** Blue KidPanel behind text (default true). */
  showPanel?: boolean;
  /** Typography tier (independent of transform scale). */
  size?: PuppetCaptionSize;
  /** Applies size/panel/width presets when fields are omitted. */
  role?: PuppetCaptionRole;
};

export const CAPTION_X_PERCENT_MIN = 5;
export const CAPTION_X_PERCENT_MAX = 95;
export const CAPTION_Y_PERCENT_MIN = 8;
export const CAPTION_Y_PERCENT_MAX = 92;
export const CAPTION_SCALE_MIN = 0.35;
export const CAPTION_SCALE_MAX = 1.6;
export const CAPTION_WIDTH_PERCENT_MIN = 20;
export const CAPTION_WIDTH_PERCENT_MAX = 100;

export const CAPTION_ROLE_PRESETS: Record<
  PuppetCaptionRole,
  Partial<PuppetCaptionLayout>
> = {
  headline: {
    size: "lg",
    showPanel: true,
    scale: 1,
    widthPercent: 88,
  },
  label: {
    size: "sm",
    showPanel: false,
    scale: 1,
    widthPercent: 32,
  },
  subtitle: {
    size: "md",
    showPanel: true,
    scale: 0.95,
    widthPercent: 72,
  },
};

export const DEFAULT_PUPPET_CAPTION_LAYOUT: PuppetCaptionLayout = {
  xPercent: 50,
  yPercent: 78,
  scale: 1,
  widthPercent: 88,
  showPanel: true,
  size: "lg",
};

export function clampCaptionLayout(layout: PuppetCaptionLayout): PuppetCaptionLayout {
  const size = layout.size ?? "lg";
  const safeSize = CAPTION_SIZES.includes(size) ? size : "lg";
  const role = layout.role;
  const safeRole =
    role && CAPTION_ROLES.includes(role) ? role : undefined;

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
    size: safeSize,
    role: safeRole,
  };
}

export function resolveCaptionLayoutFields(
  script: PuppetScript,
  beatIndex: number,
  fields?: PuppetCaptionLayout,
  overrides?: Partial<Record<number, PuppetCaptionLayout>>,
): PuppetCaptionLayout {
  const override = overrides?.[beatIndex];
  const base: PuppetCaptionLayout = {
    ...DEFAULT_PUPPET_CAPTION_LAYOUT,
    ...script.defaultCaptionLayout,
  };
  const role = fields?.role;
  const rolePreset: Partial<PuppetCaptionLayout> =
    role && CAPTION_ROLES.includes(role) ? CAPTION_ROLE_PRESETS[role] : {};
  const merged: PuppetCaptionLayout = {
    ...base,
    ...rolePreset,
    ...fields,
    ...override,
    ...(role ? { role } : {}),
  };
  return clampCaptionLayout(merged);
}

export function resolveCaptionLayout(
  beat: PuppetLineBeat,
  script: PuppetScript,
  beatIndex: number,
  overrides?: Partial<Record<number, PuppetCaptionLayout>>,
): PuppetCaptionLayout {
  return resolveCaptionLayoutFields(script, beatIndex, beat.captionLayout, overrides);
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

export function captionSizeClassName(size: PuppetCaptionSize = "lg"): string {
  switch (size) {
    case "sm":
      return "text-sm font-bold leading-snug sm:text-base";
    case "md":
      return "text-lg font-extrabold leading-snug sm:text-xl";
    case "lg":
    default:
      return "text-2xl font-extrabold leading-snug sm:text-3xl";
  }
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
  if (c.size && c.size !== DEFAULT_PUPPET_CAPTION_LAYOUT.size) {
    parts.push(`size: "${c.size}"`);
  }
  if (c.role) {
    parts.push(`role: "${c.role}"`);
  }
  if (c.showPanel === false) {
    parts.push("showPanel: false");
  }
  return `captionLayout: { ${parts.join(", ")} },`;
}

export function formatLineBeatSnippet(
  beat: PuppetLineBeat,
  layout: PuppetCaptionLayout,
): string {
  const lines = [
    "{",
    `  kind: "line",`,
    `  text: ${JSON.stringify(beat.text)},`,
  ];
  if (beat.persist) lines.push(`  persist: true,`);
  if (beat.captionSlot?.trim()) {
    lines.push(`  captionSlot: ${JSON.stringify(beat.captionSlot.trim())},`);
  }
  if (beat.group?.trim()) lines.push(`  group: ${JSON.stringify(beat.group.trim())},`);
  if (beat.puppetAnimation) lines.push(`  puppetAnimation: "${beat.puppetAnimation}",`);
  if (beat.wordStaggerMs != null) lines.push(`  wordStaggerMs: ${beat.wordStaggerMs},`);
  lines.push(`  ${formatCaptionLayoutForSource(layout)}`);
  lines.push("},");
  return lines.join("\n");
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
  const width = layout.widthPercent ?? 88;
  if (width < CAPTION_WIDTH_PERCENT_MIN || width > CAPTION_WIDTH_PERCENT_MAX) {
    errors.push(
      `${label}: widthPercent must be ${CAPTION_WIDTH_PERCENT_MIN}–${CAPTION_WIDTH_PERCENT_MAX}.`,
    );
  }
  if (layout.size && !CAPTION_SIZES.includes(layout.size)) {
    errors.push(`${label}: size must be sm, md, or lg.`);
  }
  if (layout.role && !CAPTION_ROLES.includes(layout.role)) {
    errors.push(`${label}: role must be headline, label, or subtitle.`);
  }
  return errors;
}
