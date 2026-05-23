import type { RigBone } from "./rig-types";
import type { RigTrackSample } from "./rig-types";

function withPlaybackTransformCleared<T>(
  el: SVGGraphicsElement,
  fn: () => T,
): T {
  const savedTransform = el.style.transform;
  const savedOrigin = el.style.transformOrigin;
  el.style.transform = "";
  el.style.transformOrigin = "";
  try {
    return fn();
  } finally {
    el.style.transform = savedTransform;
    el.style.transformOrigin = savedOrigin;
  }
}

function getLocalToSvgRootMatrix(
  svg: SVGSVGElement,
  el: SVGGraphicsElement,
): DOMMatrix | null {
  const elCtm = el.getCTM();
  const svgCtm = svg.getCTM();
  if (!elCtm || !svgCtm) return null;
  return svgCtm.inverse().multiply(elCtm);
}

export function getIntrinsicLocalToSvgRootMatrix(
  svg: SVGSVGElement,
  el: SVGGraphicsElement,
): DOMMatrix | null {
  return withPlaybackTransformCleared(el, () =>
    getLocalToSvgRootMatrix(svg, el),
  );
}

function getPivotRootFromRigAnchor(
  svg: SVGSVGElement,
  el: SVGGraphicsElement,
  rigAnchor?: { x: number; y: number },
): { x: number; y: number } | null {
  const ax = rigAnchor?.x ?? 0.5;
  const ay = rigAnchor?.y ?? 0.5;
  const toSvg = getIntrinsicLocalToSvgRootMatrix(svg, el);
  if (!toSvg) return null;

  try {
    const bbox = el.getBBox();
    const pt = svg.createSVGPoint();
    pt.x = bbox.x + bbox.width * ax;
    pt.y = bbox.y + bbox.height * ay;
    const centerSvg = pt.matrixTransform(toSvg);
    return { x: centerSvg.x, y: centerSvg.y };
  } catch {
    return null;
  }
}

export function buildRootAnimationMatrixForNode(
  svg: SVGSVGElement,
  el: SVGGraphicsElement,
  props: RigTrackSample,
  rigNode?: RigBone,
): DOMMatrix | null {
  const pivot = getPivotRootFromRigAnchor(svg, el, rigNode?.anchor);
  if (!pivot) return null;

  return svg
    .createSVGMatrix()
    .translate(props.x, props.y)
    .translate(pivot.x, pivot.y)
    .rotate(props.rotate)
    .scale(props.scale)
    .translate(-pivot.x, -pivot.y);
}

export function resolvedToLocalMatrixFromWorld(
  svg: SVGSVGElement,
  el: SVGGraphicsElement,
  worldMatrix: DOMMatrix,
): DOMMatrix | null {
  try {
    const toSvg = getIntrinsicLocalToSvgRootMatrix(svg, el);
    if (!toSvg) return null;
    return toSvg.inverse().multiply(worldMatrix).multiply(toSvg);
  } catch {
    return null;
  }
}

export function matrixToCssTransform(matrix: DOMMatrix): string {
  const { a, b, c, d, e, f } = matrix;
  return `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;
}
