"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import type { Group } from "three";
import { prefersReducedMotion } from "@/components/world/detect-webgl";

const YAW_SENSITIVITY = 0.01;
const IDLE_SPIN = 0.32;

type Props = {
  children: ReactNode;
  idleSpin?: boolean;
  initialYaw?: number;
  yaw?: number;
  locked?: boolean;
};

/**
 * Spin-the-model controls. Camera stays fixed; only yaw changes.
 */
export function CharacterTurntable({
  children,
  idleSpin = true,
  initialYaw = 0.35,
  yaw,
  locked = false,
}: Props) {
  const groupRef = useRef<Group>(null);
  const gl = useThree((state) => state.gl);
  const yawRef = useRef(yaw ?? initialYaw);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const reducedRef = useRef(false);

  useEffect(() => {
    if (typeof yaw === "number") yawRef.current = yaw;
  }, [yaw]);

  useEffect(() => {
    reducedRef.current = prefersReducedMotion();
    const canvas = gl.domElement;
    canvas.style.cursor = locked ? "default" : "grab";
    canvas.style.touchAction = "none";

    const onDown = (event: PointerEvent) => {
      if (locked) return;
      event.preventDefault();
      draggingRef.current = true;
      lastXRef.current = event.clientX;
      canvas.style.cursor = "grabbing";
      canvas.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (locked || !draggingRef.current) return;
      yawRef.current += (event.clientX - lastXRef.current) * YAW_SENSITIVITY;
      lastXRef.current = event.clientX;
    };
    const onUp = (event: PointerEvent) => {
      draggingRef.current = false;
      canvas.style.cursor = locked ? "default" : "grab";
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [gl, locked]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (idleSpin && !locked && !draggingRef.current && !reducedRef.current) {
      yawRef.current += delta * IDLE_SPIN;
    }
    groupRef.current.rotation.y = yawRef.current;
  });

  return <group ref={groupRef}>{children}</group>;
}
