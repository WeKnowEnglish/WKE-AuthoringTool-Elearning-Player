import {
  applyComposedRigTransform,
  buildWorldAnimationMatrices,
  layerIdsFromScene,
  rigHasParentLinks,
} from "./rig-compose";
import type { RigBone, RigScene, RigTrack, RigTrackSample } from "./rig-types";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function fullSampleFromKeyframe(
  track: RigTrack,
  properties: Partial<RigTrackSample>,
): RigTrackSample {
  const a = track.anchor;
  return {
    x: properties.x ?? a.x,
    y: properties.y ?? a.y,
    rotate: properties.rotate ?? a.rotate ?? 0,
    scale: properties.scale ?? a.scale ?? 1,
    opacity: properties.opacity ?? a.opacity ?? 1,
  };
}

function interpolateRigSamples(
  a: RigTrackSample,
  b: RigTrackSample,
  t: number,
): RigTrackSample {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    rotate: lerp(a.rotate, b.rotate, t),
    scale: lerp(a.scale, b.scale, t),
    opacity: lerp(a.opacity, b.opacity, t),
  };
}

/** Sample a looping rig track at elapsed milliseconds. */
export function sampleRigTrack(
  elapsedMs: number,
  track: RigTrack,
  durationMs: number,
): RigTrackSample {
  const keyframes = track.keyframes;
  const anchorSample = fullSampleFromKeyframe(track, {});

  if (keyframes.length === 0) {
    return anchorSample;
  }
  if (keyframes.length === 1) {
    return fullSampleFromKeyframe(track, keyframes[0]!.properties);
  }

  const duration = Math.max(1, durationMs);
  const t = ((elapsedMs % duration) + duration) % duration;

  let prev = keyframes[keyframes.length - 1]!;
  for (let i = 0; i < keyframes.length; i++) {
    const next = keyframes[i]!;
    if (t < next.time) {
      const span = next.time - prev.time;
      const localT = span <= 0 ? 0 : (t - prev.time) / span;
      const a = fullSampleFromKeyframe(track, prev.properties);
      const b = fullSampleFromKeyframe(track, next.properties);
      return interpolateRigSamples(a, b, localT);
    }
    prev = next;
  }

  const last = keyframes[keyframes.length - 1]!;
  const first = keyframes[0]!;
  const wrapSpan = duration - last.time + first.time;
  const localT = wrapSpan <= 0 ? 0 : (t - last.time) / wrapSpan;
  const a = fullSampleFromKeyframe(track, last.properties);
  const b = fullSampleFromKeyframe(track, first.properties);
  return interpolateRigSamples(a, b, localT);
}

function layerElement(svgRoot: Element, layerId: string): Element | null {
  if (typeof svgRoot.querySelector === "function") {
    const escaped = layerId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return svgRoot.querySelector(`#${escaped}`);
  }
  return null;
}

function getBoneParentId(
  elementId: string,
  rig: Record<string, RigBone> | undefined,
  layerIds: string[],
): string | null {
  const node = rig?.[elementId];
  if (!node) return null;
  const parent = node.boneParentId ?? node.parentId ?? null;
  if (!parent) return null;
  return layerIds.includes(parent) ? parent : null;
}

function isDomDescendantOfBoneParent(
  svgRoot: Element,
  childId: string,
  parentId: string,
): boolean {
  const child = layerElement(svgRoot, childId);
  const parent = layerElement(svgRoot, parentId);
  return !!(child && parent && parent.contains(child));
}

function animatedElementIds(scene: RigScene): Set<string> {
  const ids = new Set<string>();
  for (const track of Object.values(scene.tracks)) {
    if (track.keyframes.length > 0) {
      ids.add(track.elementId);
    }
  }
  return ids;
}

function shouldSkipDomInheritedPlayback(
  svgRoot: Element,
  elementId: string,
  scene: RigScene,
  animatedIds: Set<string>,
  layerIds: string[],
): boolean {
  let parentId = getBoneParentId(elementId, scene.rig, layerIds);
  while (parentId) {
    if (
      animatedIds.has(parentId) &&
      isDomDescendantOfBoneParent(svgRoot, elementId, parentId)
    ) {
      return true;
    }
    parentId = getBoneParentId(parentId, scene.rig, layerIds);
  }
  return false;
}

function isSampleNearAnchor(track: RigTrack, sample: RigTrackSample): boolean {
  const anchor = track.anchor;
  const eps = 1e-4;
  return (
    Math.abs(sample.x - anchor.x) < eps &&
    Math.abs(sample.y - anchor.y) < eps &&
    Math.abs(sample.rotate - (anchor.rotate ?? 0)) < eps &&
    Math.abs(sample.scale - (anchor.scale ?? 1)) < eps &&
    Math.abs(sample.opacity - (anchor.opacity ?? 1)) < eps
  );
}

function needsComposedTransform(
  elementId: string,
  scene: RigScene,
  localPoses: Record<string, RigTrackSample>,
  layerIds: string[],
): boolean {
  const track = scene.tracks[elementId];
  if (!track) return false;
  if (!isSampleNearAnchor(track, localPoses[elementId]!)) return true;

  let parentId = getBoneParentId(elementId, scene.rig, layerIds);
  while (parentId) {
    const parentTrack = scene.tracks[parentId];
    if (parentTrack && !isSampleNearAnchor(parentTrack, localPoses[parentId]!)) {
      return true;
    }
    parentId = getBoneParentId(parentId, scene.rig, layerIds);
  }
  return false;
}

function clearRigLayerTransform(svgRoot: Element, elementId: string): void {
  const el = layerElement(svgRoot, elementId);
  if (!el) return;
  const htmlEl = el as HTMLElement;
  htmlEl.style.transform = "";
  htmlEl.style.transformOrigin = "";
  htmlEl.style.opacity = "";
}

function applyOpacity(svgRoot: Element, elementId: string, opacity: number): void {
  const el = layerElement(svgRoot, elementId);
  if (!el) return;
  (el as HTMLElement).style.opacity = String(opacity);
}

export function applyRigLayerTransform(
  svgRoot: Element,
  elementId: string,
  sample: RigTrackSample,
  transformOrigin: { x: number; y: number },
): void {
  const el = layerElement(svgRoot, elementId);
  if (!el) return;
  const htmlEl = el as HTMLElement;
  htmlEl.style.transformOrigin = `${transformOrigin.x * 100}% ${transformOrigin.y * 100}%`;
  htmlEl.style.transform = `translate(${sample.x}px, ${sample.y}px) rotate(${sample.rotate}deg) scale(${sample.scale})`;
  htmlEl.style.opacity = String(sample.opacity);
}

export function resetRigLayerTransforms(svgRoot: Element, scene: RigScene): void {
  for (const track of Object.values(scene.tracks)) {
    clearRigLayerTransform(svgRoot, track.elementId);
  }
}

function sampleAllTracks(
  scene: RigScene,
  elapsedMs: number,
): Record<string, RigTrackSample> {
  const poses: Record<string, RigTrackSample> = {};
  for (const track of Object.values(scene.tracks)) {
    poses[track.elementId] = sampleRigTrack(elapsedMs, track, scene.duration);
  }
  return poses;
}

function applyRigFrameFlat(
  svgRoot: Element,
  scene: RigScene,
  elapsedMs: number,
  animatedIds: Set<string>,
  layerIds: string[],
): void {
  for (const track of Object.values(scene.tracks)) {
    const elementId = track.elementId;

    if (shouldSkipDomInheritedPlayback(svgRoot, elementId, scene, animatedIds, layerIds)) {
      clearRigLayerTransform(svgRoot, elementId);
      continue;
    }

    const sample = sampleRigTrack(elapsedMs, track, scene.duration);
    if (isSampleNearAnchor(track, sample)) {
      clearRigLayerTransform(svgRoot, elementId);
      continue;
    }

    const bone = scene.rig[elementId];
    const origin = bone?.anchor ?? { x: 0.5, y: 0.5 };
    applyRigLayerTransform(svgRoot, elementId, sample, origin);
  }
}

function applyRigFrameComposed(
  svg: SVGSVGElement,
  scene: RigScene,
  elapsedMs: number,
  animatedIds: Set<string>,
  layerIds: string[],
): void {
  const localPoses = sampleAllTracks(scene, elapsedMs);
  const applyIds = layerIds.filter(
    (id) => !shouldSkipDomInheritedPlayback(svg, id, scene, animatedIds, layerIds),
  );

  for (const id of layerIds) {
    clearRigLayerTransform(svg, id);
  }

  const needsAny = applyIds.some((id) =>
    needsComposedTransform(id, scene, localPoses, layerIds),
  );
  if (!needsAny) return;

  const worldMatrices = buildWorldAnimationMatrices(
    svg,
    applyIds,
    layerIds,
    localPoses,
    scene.rig,
  );

  for (const id of applyIds) {
    const sample = localPoses[id]!;
    applyOpacity(svg, id, sample.opacity);

    if (!needsComposedTransform(id, scene, localPoses, layerIds)) {
      clearRigLayerTransform(svg, id);
      continue;
    }

    applyComposedRigTransform(svg, id, worldMatrices.get(id) ?? null);
  }
}

function isSvgRoot(el: Element): el is SVGSVGElement {
  return el.tagName.toLowerCase() === "svg";
}

/** True when SVGMatrix / getCTM compose is available (browser; not JSDOM). */
function supportsSvgCompose(svg: SVGSVGElement): boolean {
  const probe = svg.querySelector("g") as SVGGraphicsElement | null;
  return typeof probe?.getCTM === "function";
}

/** Apply all rig track samples for the current animation time. */
export function applyRigFrame(svgRoot: Element, scene: RigScene, elapsedMs: number): void {
  const animatedIds = animatedElementIds(scene);
  const layerIds = layerIdsFromScene(scene);

  if (rigHasParentLinks(scene.rig) && isSvgRoot(svgRoot) && supportsSvgCompose(svgRoot)) {
    applyRigFrameComposed(svgRoot, scene, elapsedMs, animatedIds, layerIds);
    return;
  }

  applyRigFrameFlat(svgRoot, scene, elapsedMs, animatedIds, layerIds);
}

const SVG_VIEWBOX_RE = /viewBox\s*=\s*["']([^"']+)["']/i;

/** Inkscape / SVG document viewBox (not editor world viewport coords). */
export function parseSvgViewBox(rawSvgString: string): string | null {
  const match = SVG_VIEWBOX_RE.exec(rawSvgString);
  const value = match?.[1]?.trim();
  return value && value.length > 0 ? value : null;
}

/** ViewBox for displaying the rig scene; uses embedded SVG coords. */
export function rigViewBox(scene: RigScene): string {
  return parseSvgViewBox(scene.rawSvgString) ?? "0 0 210 297";
}
