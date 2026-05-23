"use client";

import { clsx } from "clsx";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  applyInteractStateById,
  applyTrackTransform,
  sampleTrack,
} from "@/lib/blender/engine";
import type { BlenderScene } from "@/lib/blender/types";

type Props = {
  scene: BlenderScene;
  interactStateId: string;
  rumbleActive?: boolean;
  onKnobClick?: () => void;
  knobEnabled?: boolean;
  className?: string;
};

type KnobHitRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

function isLayerVisible(el: Element): boolean {
  const htmlEl = el as HTMLElement;
  if (htmlEl.style.display === "none" || htmlEl.style.visibility === "hidden") {
    return false;
  }
  const computed = window.getComputedStyle(htmlEl);
  return computed.display !== "none" && computed.visibility !== "hidden";
}

function resolveVisibleKnobId(
  svg: Element,
  knobOffId: string,
  knobOnId: string,
): string {
  const off = svg.querySelector(`#${knobOffId}`);
  const on = svg.querySelector(`#${knobOnId}`);
  if (off && isLayerVisible(off)) return knobOffId;
  if (on && isLayerVisible(on)) return knobOnId;
  return knobOffId;
}

function measureKnobHitRect(
  container: HTMLElement,
  host: HTMLElement,
  knobId: string,
): KnobHitRect | null {
  const svg = host.querySelector("svg");
  if (!svg) return null;
  const knob = svg.querySelector(`#${knobId}`);
  if (!knob) return null;

  const containerRect = container.getBoundingClientRect();
  const knobRect = knob.getBoundingClientRect();
  if (knobRect.width <= 0 || knobRect.height <= 0) return null;

  const pad = Math.max(4, Math.min(knobRect.width, knobRect.height) * 0.12);
  return {
    left: knobRect.left - containerRect.left - pad,
    top: knobRect.top - containerRect.top - pad,
    width: knobRect.width + pad * 2,
    height: knobRect.height + pad * 2,
  };
}

export function BlenderScenePlayer({
  scene,
  interactStateId,
  rumbleActive = false,
  onKnobClick,
  knobEnabled = false,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const svgInjectedForSceneRef = useRef<string | null>(null);
  const rumbleStartRef = useRef<number>(0);
  const reducedMotion = usePrefersReducedMotion();
  const [knobHitRect, setKnobHitRect] = useState<KnobHitRect | null>(null);

  const knobOffId = scene.interact.manifest.knob.off;
  const knobOnId = scene.interact.manifest.knob.on;

  const updateKnobHitRect = useCallback(() => {
    const container = containerRef.current;
    const host = hostRef.current;
    if (!container || !host) return;
    const svg = host.querySelector("svg");
    if (!svg) return;
    const knobId = resolveVisibleKnobId(svg, knobOffId, knobOnId);
    const rect = measureKnobHitRect(container, host, knobId);
    setKnobHitRect(rect);
  }, [knobOffId, knobOnId]);

  const mountSvgIfNeeded = useCallback(() => {
    const host = hostRef.current;
    if (!host) return null;
    if (svgInjectedForSceneRef.current !== scene.id) {
      host.innerHTML = scene.rawSvgString;
      svgInjectedForSceneRef.current = scene.id;
    }
    return host.querySelector("svg");
  }, [scene.id, scene.rawSvgString]);

  const applyState = useCallback(() => {
    const svg = mountSvgIfNeeded();
    if (!svg) return;
    applyInteractStateById(svg, scene, interactStateId);
  }, [scene, interactStateId, mountSvgIfNeeded]);

  useLayoutEffect(() => {
    applyState();
    updateKnobHitRect();
  }, [applyState, updateKnobHitRect]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      updateKnobHitRect();
    });
    observer.observe(container);

    const host = hostRef.current;
    if (host) observer.observe(host);

    return () => observer.disconnect();
  }, [updateKnobHitRect]);

  useEffect(() => {
    if (!rumbleActive || reducedMotion) {
      const host = hostRef.current;
      if (!host) return;
      const svg = host.querySelector("svg");
      if (!svg) return;
      const bodyId = scene.interact.manifest.bodyLayerId;
      applyTrackTransform(svg, bodyId, { x: 0, y: 0, rotate: 0 });
      return;
    }

    const track = scene.tracks[scene.interact.manifest.bodyLayerId];
    if (!track) return;

    rumbleStartRef.current = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const host = hostRef.current;
      if (!host) return;
      const svg = host.querySelector("svg");
      if (!svg) return;
      const elapsed = now - rumbleStartRef.current;
      const sample = sampleTrack(elapsed, track, scene.duration);
      applyTrackTransform(svg, scene.interact.manifest.bodyLayerId, sample);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [rumbleActive, reducedMotion, scene]);

  return (
    <div ref={containerRef} className={clsx("relative w-full", className)}>
      <div
        ref={hostRef}
        className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-h-[min(52dvh,320px)] [&_svg]:w-full"
      />
      {onKnobClick && knobHitRect ?
        <button
          type="button"
          aria-label="Turn blender on"
          disabled={!knobEnabled}
          className={clsx(
            "absolute rounded-full border-2 transition-colors",
            knobEnabled ?
              "pet-knob-hit--ready cursor-pointer hover:bg-amber-200/35"
            : "pointer-events-none border-transparent bg-transparent opacity-0",
          )}
          style={{
            left: knobHitRect.left,
            top: knobHitRect.top,
            width: knobHitRect.width,
            height: knobHitRect.height,
          }}
          onClick={() => {
            if (!knobEnabled) return;
            onKnobClick();
          }}
          data-testid="blender-knob-hit"
          data-knob-off={knobOffId}
          data-knob-on={knobOnId}
        />
      : null}
    </div>
  );
}
