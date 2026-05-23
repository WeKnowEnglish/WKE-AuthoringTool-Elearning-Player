import type { RigBone, RigScene, RigTrackSample } from "./rig-types";
import {
  buildRootAnimationMatrixForNode,
  getIntrinsicLocalToSvgRootMatrix,
  matrixToCssTransform,
  resolvedToLocalMatrixFromWorld,
} from "./rig-svg-transform";

function escapeElementId(id: string): string {
  return id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function getBoneParentId(
  elementId: string,
  rig: Record<string, RigBone> | undefined,
  layerIds: string[],
): string | null {
  const node = rig?.[elementId];
  const parent = node?.boneParentId ?? node?.parentId ?? null;
  if (!parent) return null;
  return layerIds.includes(parent) ? parent : null;
}

export function rigHasParentLinks(
  rig: Record<string, RigBone> | undefined,
): boolean {
  if (!rig) return false;
  return Object.values(rig).some(
    (n) => (n.boneParentId ?? n.parentId) != null,
  );
}

function getBindOffsetMatrix(
  svg: SVGSVGElement,
  parentEl: SVGGraphicsElement,
  childEl: SVGGraphicsElement,
): DOMMatrix | null {
  const parentToRoot = getIntrinsicLocalToSvgRootMatrix(svg, parentEl);
  const childToRoot = getIntrinsicLocalToSvgRootMatrix(svg, childEl);
  if (!parentToRoot || !childToRoot) return null;
  try {
    return parentToRoot.inverse().multiply(childToRoot);
  } catch {
    return null;
  }
}

export function orderLayerIdsParentsFirst(
  layerIds: string[],
  rig: Record<string, RigBone> | undefined,
): string[] {
  const depth = (id: string): number => {
    let d = 0;
    let parentId = getBoneParentId(id, rig, layerIds);
    while (parentId) {
      d += 1;
      parentId = getBoneParentId(parentId, rig, layerIds);
    }
    return d;
  };
  return [...layerIds].sort((a, b) => depth(a) - depth(b));
}

function computeElementWorldMatrix(
  svg: SVGSVGElement,
  elementId: string,
  layerIds: string[],
  localPoses: Record<string, RigTrackSample>,
  rig: Record<string, RigBone> | undefined,
  elements: Map<string, SVGGraphicsElement>,
  worldCache: Map<string, DOMMatrix | null>,
): DOMMatrix | null {
  if (worldCache.has(elementId)) return worldCache.get(elementId)!;

  const el = elements.get(elementId);
  const props = localPoses[elementId];
  if (!el || !props) {
    worldCache.set(elementId, null);
    return null;
  }

  const childAnim = buildRootAnimationMatrixForNode(
    svg,
    el,
    props,
    rig?.[elementId],
  );
  if (!childAnim) {
    worldCache.set(elementId, null);
    return null;
  }

  const parentId = getBoneParentId(elementId, rig, layerIds);
  if (!parentId || !elements.has(parentId)) {
    worldCache.set(elementId, childAnim);
    return childAnim;
  }

  const parentEl = elements.get(parentId)!;
  const bind = getBindOffsetMatrix(svg, parentEl, el);
  const parentWorld = computeElementWorldMatrix(
    svg,
    parentId,
    layerIds,
    localPoses,
    rig,
    elements,
    worldCache,
  );

  if (!parentWorld || !bind) {
    worldCache.set(elementId, childAnim);
    return childAnim;
  }

  const world = parentWorld.multiply(bind).multiply(childAnim);
  worldCache.set(elementId, world);
  return world;
}

export function buildWorldAnimationMatrices(
  svg: SVGSVGElement,
  applyIds: string[],
  layerIds: string[],
  localPoses: Record<string, RigTrackSample>,
  rig: Record<string, RigBone> | undefined,
): Map<string, DOMMatrix | null> {
  const result = new Map<string, DOMMatrix | null>();
  if (applyIds.length === 0) return result;

  const elements = new Map<string, SVGGraphicsElement>();
  for (const id of applyIds) {
    const el = svg.querySelector(`#${escapeElementId(id)}`) as SVGGraphicsElement | null;
    if (el) elements.set(id, el);
  }

  const worldCache = new Map<string, DOMMatrix | null>();
  const ordered = orderLayerIdsParentsFirst(applyIds, rig);

  for (const id of ordered) {
    if (!applyIds.includes(id)) continue;
    result.set(
      id,
      computeElementWorldMatrix(
        svg,
        id,
        layerIds,
        localPoses,
        rig,
        elements,
        worldCache,
      ),
    );
  }

  return result;
}

export function applyComposedRigTransform(
  svg: SVGSVGElement,
  elementId: string,
  worldMatrix: DOMMatrix | null,
): void {
  const el = svg.querySelector(`#${escapeElementId(elementId)}`) as SVGGraphicsElement | null;
  if (!el) return;

  if (!worldMatrix) {
    el.style.transform = "";
    el.style.transformOrigin = "";
    return;
  }

  const localMatrix = resolvedToLocalMatrixFromWorld(svg, el, worldMatrix);
  if (!localMatrix) return;

  el.style.transformOrigin = "";
  el.style.transform = matrixToCssTransform(localMatrix);
}

export function layerIdsFromScene(scene: RigScene): string[] {
  return Object.keys(scene.tracks);
}
