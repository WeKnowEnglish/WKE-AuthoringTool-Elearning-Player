/** On-screen scale and offset for the puppet stage (dev / presenter tuning). */
export type PuppetStageLayout = {
  /** 1 = default box size; applied via CSS transform scale. */
  scale: number;
  /** Horizontal nudge in px (positive = right). */
  offsetX: number;
  /** Vertical nudge in px (positive = down). */
  offsetY: number;
};

export const PUPPET_STAGE_SCALE_MIN = 0.5;
export const PUPPET_STAGE_SCALE_MAX = 2;
export const PUPPET_STAGE_OFFSET_MIN = -160;
export const PUPPET_STAGE_OFFSET_MAX = 160;

export const DEFAULT_PUPPET_STAGE_LAYOUT: PuppetStageLayout = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

export function clampStageLayout(layout: PuppetStageLayout): PuppetStageLayout {
  return {
    scale: Math.min(
      PUPPET_STAGE_SCALE_MAX,
      Math.max(PUPPET_STAGE_SCALE_MIN, layout.scale),
    ),
    offsetX: Math.min(
      PUPPET_STAGE_OFFSET_MAX,
      Math.max(PUPPET_STAGE_OFFSET_MIN, layout.offsetX),
    ),
    offsetY: Math.min(
      PUPPET_STAGE_OFFSET_MAX,
      Math.max(PUPPET_STAGE_OFFSET_MIN, layout.offsetY),
    ),
  };
}

export function stageLayoutTransform(layout: PuppetStageLayout): string {
  const { scale, offsetX, offsetY } = clampStageLayout(layout);
  return `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

export function formatStageLayoutForSource(layout: PuppetStageLayout): string {
  const c = clampStageLayout(layout);
  return `  stageLayout: { scale: ${c.scale}, offsetX: ${c.offsetX}, offsetY: ${c.offsetY} },`;
}
