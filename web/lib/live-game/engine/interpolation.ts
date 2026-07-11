export type InterpolatedPosition = {
  x: number;
  y: number;
};

export function lerpPosition(
  from: InterpolatedPosition,
  to: InterpolatedPosition,
  alpha: number,
): InterpolatedPosition {
  const t = Math.max(0, Math.min(1, alpha));
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

export function interpolateToward(
  current: InterpolatedPosition,
  target: InterpolatedPosition,
  dtSec: number,
  speed = 12,
): InterpolatedPosition {
  return lerpPosition(current, target, Math.min(1, dtSec * speed));
}
