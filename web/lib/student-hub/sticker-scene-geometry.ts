/** Pixel rect of an image `contain`-fitted inside a container. */
export type ContainedImageRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function containedImageRect(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number,
): ContainedImageRect {
  if (containerW <= 0 || containerH <= 0 || imageW <= 0 || imageH <= 0) {
    return { left: 0, top: 0, width: containerW, height: containerH };
  }
  const scale = Math.min(containerW / imageW, containerH / imageH);
  const width = imageW * scale;
  const height = imageH * scale;
  return {
    left: (containerW - width) / 2,
    top: (containerH - height) / 2,
    width,
    height,
  };
}

type ContainerRect = { left: number; top: number; width: number; height: number };

/** Map pointer position within a container to % along the fitted image (or null if outside image). */
export function clientToImagePercents(
  clientX: number,
  clientY: number,
  containerRect: ContainerRect,
  imageW: number,
  imageH: number,
): { xPercent: number; yPercent: number } | null {
  const localX = clientX - containerRect.left;
  const localY = clientY - containerRect.top;
  const inner = containedImageRect(containerRect.width, containerRect.height, imageW, imageH);
  if (
    localX < inner.left ||
    localX > inner.left + inner.width ||
    localY < inner.top ||
    localY > inner.top + inner.height
  ) {
    return null;
  }
  return {
    xPercent: ((localX - inner.left) / inner.width) * 100,
    yPercent: ((localY - inner.top) / inner.height) * 100,
  };
}

export function imagePercentToContainerPoint(
  xPercent: number,
  yPercent: number,
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number,
): { x: number; y: number } {
  const inner = containedImageRect(containerW, containerH, imageW, imageH);
  return {
    x: inner.left + (xPercent / 100) * inner.width,
    y: inner.top + (yPercent / 100) * inner.height,
  };
}

export function clampImagePercent(n: number): number {
  return Math.min(98, Math.max(2, n));
}
