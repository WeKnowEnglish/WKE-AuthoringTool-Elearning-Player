import type {
  BlenderInteractManifest,
  BlenderInteractState,
  BlenderScene,
  BlenderTrack,
  BlenderTrackKeyframe,
  JuiceColor,
  SplashPosition,
} from "./types";

export type TrackSample = {
  x: number;
  y: number;
  rotate: number;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateProperties(
  a: BlenderTrackKeyframe["properties"],
  b: BlenderTrackKeyframe["properties"],
  t: number,
): TrackSample {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    rotate: lerp(a.rotate, b.rotate, t),
  };
}

/** Sample a looping track at elapsed milliseconds. */
export function sampleTrack(
  elapsedMs: number,
  track: BlenderTrack,
  durationMs: number,
): TrackSample {
  const keyframes = track.keyframes;
  if (keyframes.length === 0) {
    return { x: 0, y: 0, rotate: 0 };
  }
  if (keyframes.length === 1) {
    return { ...keyframes[0]!.properties };
  }

  const duration = Math.max(1, durationMs);
  const t = ((elapsedMs % duration) + duration) % duration;

  let prev = keyframes[keyframes.length - 1]!;
  for (let i = 0; i < keyframes.length; i++) {
    const next = keyframes[i]!;
    if (t < next.time) {
      const span = next.time - prev.time;
      const localT = span <= 0 ? 0 : (t - prev.time) / span;
      return interpolateProperties(prev.properties, next.properties, localT);
    }
    prev = next;
  }

  const last = keyframes[keyframes.length - 1]!;
  const first = keyframes[0]!;
  const wrapSpan = duration - last.time + first.time;
  const localT = wrapSpan <= 0 ? 0 : (t - last.time) / wrapSpan;
  return interpolateProperties(last.properties, first.properties, localT);
}

function layerElement(svgRoot: Element, layerId: string): Element | null {
  if (typeof svgRoot.querySelector === "function") {
    const escaped = layerId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return svgRoot.querySelector(`#${escaped}`);
  }
  return null;
}

/** Override Illustrator-exported inline display:none on splash/knob groups. */
export function setLayerVisibility(
  el: Element | null,
  visible: boolean,
  opacity?: number,
): void {
  if (!el) return;
  const node = el as HTMLElement;
  if (visible) {
    node.style.setProperty("display", "inline", "important");
    node.style.setProperty("visibility", "visible", "important");
    if (opacity !== undefined) {
      node.style.setProperty("opacity", String(opacity), "important");
    } else {
      node.style.removeProperty("opacity");
    }
  } else {
    node.style.setProperty("display", "none", "important");
    node.style.setProperty("visibility", "hidden", "important");
  }
}

export function hideAllInteractLayers(
  svgRoot: Element,
  manifest: BlenderInteractManifest,
): void {
  for (const layerId of collectInteractLayerIds(manifest)) {
    setLayerVisibility(layerElement(svgRoot, layerId), false);
  }
}

/** Apply discrete interact visibility from a state onto the mounted SVG. */
export function applyInteractState(
  svgRoot: Element,
  state: BlenderInteractState,
): void {
  for (const [layerId, layerState] of Object.entries(state.layers)) {
    const el = layerElement(svgRoot, layerId);
    setLayerVisibility(el, layerState.visible, layerState.opacity);
  }
}

export function applyInteractStateById(
  svgRoot: Element,
  scene: BlenderScene,
  stateId: string,
): string {
  const state =
    scene.interact.states[stateId] ??
    scene.interact.states.powerOn ??
    scene.interact.states[scene.interact.defaultStateId];
  if (!state) return stateId;
  applyInteractState(svgRoot, state);
  return state.id;
}

export function applyTrackTransform(
  svgRoot: Element,
  bodyLayerId: string,
  sample: TrackSample,
): void {
  const el = layerElement(svgRoot, bodyLayerId);
  if (!el) return;
  const htmlEl = el as HTMLElement;
  htmlEl.style.transformOrigin = "center";
  htmlEl.style.transform = `translate(${sample.x}px, ${sample.y}px) rotate(${sample.rotate}deg)`;
}

export function splashInteractStateId(
  color: JuiceColor,
  position: SplashPosition,
): string {
  const cap = position.charAt(0).toUpperCase() + position.slice(1);
  return `${color}${cap}`;
}

/** Resolve splash state id during blend; falls back to powerOn if missing. */
export function resolveBlendInteractStateId(
  scene: BlenderScene,
  juiceColor: JuiceColor,
  splashIndex: number,
  positions: readonly SplashPosition[] = ["left", "middle", "right"],
): string {
  const pos = positions[splashIndex % positions.length] ?? "left";
  const splashId = splashInteractStateId(juiceColor, pos);
  if (scene.interact.states[splashId]) return splashId;
  if (scene.interact.states.powerOn) return "powerOn";
  return scene.interact.defaultStateId;
}

/** Layer ids referenced by interact (knob + splashes). */
export function collectInteractLayerIds(manifest: BlenderInteractManifest): string[] {
  const { knob, splashes } = manifest;
  return [
    knob.on,
    knob.off,
    splashes.orange.left,
    splashes.orange.middle,
    splashes.orange.right,
    splashes.pink.left,
    splashes.pink.middle,
    splashes.pink.right,
  ];
}
