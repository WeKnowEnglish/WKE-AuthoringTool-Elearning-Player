"use client";

import { clsx } from "clsx";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { applyRigFrame, resetRigLayerTransforms, rigViewBox } from "@/lib/blender/rig-engine";
import type { RigScene } from "@/lib/blender/rig-types";

export type AnimatedPetSize = "mini" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<AnimatedPetSize, string> = {
  mini: "h-[4.5rem] w-[4.5rem]",
  sm: "h-[7rem] w-[7rem]",
  md: "h-[10rem] w-[10rem]",
  lg: "h-[14rem] w-[14rem]",
  xl: "h-[18rem] w-[18rem]",
};

type Props = {
  scene: RigScene;
  playing?: boolean;
  className?: string;
  size?: AnimatedPetSize;
  /** Compensates for poses authored smaller in rig data (default 1). */
  displayScale?: number;
  /** Scale origin when displayScale is applied (default center). */
  displayAnchor?: "center" | "bottom";
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

export function AnimatedPetPlayer({
  scene,
  playing = true,
  className,
  size = "md",
  displayScale = 1,
  displayAnchor = "center",
}: Props) {
  const scale = displayScale > 0 ? displayScale : 1;
  const scaleOrigin = displayAnchor === "bottom" ? "100% 100%" : "center";
  const alignClass =
    displayAnchor === "bottom" ?
      "items-end justify-end"
    : "items-center justify-center";
  const hostRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<number>(0);
  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const svg = host.querySelector("svg");
    if (!svg) return;
    svg.setAttribute("viewBox", rigViewBox(scene));
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    applyRigFrame(svg, scene, 0);
  }, [scene]);

  useEffect(() => {
    if (!playing) return;

    const host = hostRef.current;
    if (!host) return;

    let frame = 0;

    const tick = (now: number) => {
      const svg = host.querySelector("svg");
      if (!svg) return;
      if (reducedMotion) {
        applyRigFrame(svg, scene, 0);
        return;
      }
      if (startRef.current === 0) startRef.current = now;
      const elapsed = now - startRef.current;
      applyRigFrame(svg, scene, elapsed);
      frame = requestAnimationFrame(tick);
    };

    startRef.current = 0;
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      const svg = host.querySelector("svg");
      if (svg) resetRigLayerTransforms(svg, scene);
    };
  }, [playing, scene, reducedMotion]);

  return (
    <div
      className={clsx(
        "relative flex shrink-0",
        alignClass,
        SIZE_CLASS[size],
        scale > 1 && "overflow-visible",
        className,
      )}
    >
      <div
        ref={hostRef}
        className={clsx(
          "flex h-full w-full origin-center [&_svg]:max-h-full [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:w-full",
          alignClass,
        )}
        style={
          scale !== 1 ?
            { transform: `scale(${scale})`, transformOrigin: scaleOrigin }
          : undefined
        }
        dangerouslySetInnerHTML={{ __html: scene.rawSvgString }}
      />
    </div>
  );
}
