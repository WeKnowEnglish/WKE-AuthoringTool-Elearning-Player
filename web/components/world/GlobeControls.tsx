"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import type { Group } from "three";
import {
  DAMPING_PER_SECOND,
  FLICK_MAX_AGE_SECONDS,
  IDLE_RESUME_DELAY_MS,
  IDLE_RESUME_FADE_MS,
  IDLE_YAW_SPEED,
  MAX_ANGULAR_VELOCITY,
  MAX_PITCH,
  PITCH_SENSITIVITY,
  VELOCITY_EPSILON,
  WHEEL_ZOOM_SPEED,
  YAW_SENSITIVITY,
  clamp,
  clampCameraDistance,
  prefersReducedMotion,
} from "./globe-config";

type PointerSample = {
  x: number;
  y: number;
};

type Props = {
  globeRef: RefObject<Group | null>;
  distanceRef: RefObject<number>;
};

function pointerGap(a: PointerSample, b: PointerSample): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalizedWheelDelta(event: WheelEvent): number {
  let delta = event.deltaY;
  if (event.deltaMode === 1) delta *= 16;
  if (event.deltaMode === 2) delta *= 800;
  return delta;
}

/**
 * Spin-the-globe controls. The camera stays put; this writes Euler rotation
 * onto `globeRoot` and a clamped zoom distance onto `distanceRef`.
 */
export function GlobeControls({ globeRef, distanceRef }: Props) {
  const gl = useThree((state) => state.gl);

  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const yawVelocityRef = useRef(0);
  const pitchVelocityRef = useRef(0);
  const pointersRef = useRef(new Map<number, PointerSample>());
  const lastDragRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const pinchRef = useRef<{ gap: number; distance: number } | null>(null);
  const lastInteractedAtRef = useRef(typeof performance === "undefined" ? 0 : performance.now());
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      reducedMotionRef.current = media.matches;
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;

    const markInteraction = () => {
      lastInteractedAtRef.current = performance.now();
    };

    const applyDrag = (point: PointerSample, time: number) => {
      const previous = lastDragRef.current;
      lastDragRef.current = { ...point, time };
      if (!previous) return;

      const elapsed = (time - previous.time) / 1000;
      const yawDelta = (point.x - previous.x) * YAW_SENSITIVITY;
      const pitchDelta = (point.y - previous.y) * PITCH_SENSITIVITY;

      yawRef.current += yawDelta;
      pitchRef.current = clamp(pitchRef.current + pitchDelta, -MAX_PITCH, MAX_PITCH);

      if (elapsed > 0 && elapsed <= FLICK_MAX_AGE_SECONDS) {
        yawVelocityRef.current = clamp(yawDelta / elapsed, -MAX_ANGULAR_VELOCITY, MAX_ANGULAR_VELOCITY);
        pitchVelocityRef.current = clamp(pitchDelta / elapsed, -MAX_ANGULAR_VELOCITY, MAX_ANGULAR_VELOCITY);
      } else {
        yawVelocityRef.current = 0;
        pitchVelocityRef.current = 0;
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      markInteraction();
      canvas.setPointerCapture(event.pointerId);
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointersRef.current.size >= 2) {
        const [first, second] = [...pointersRef.current.values()];
        pinchRef.current = { gap: pointerGap(first, second), distance: distanceRef.current };
        lastDragRef.current = null;
        yawVelocityRef.current = 0;
        pitchVelocityRef.current = 0;
        return;
      }

      pinchRef.current = null;
      lastDragRef.current = { x: event.clientX, y: event.clientY, time: performance.now() };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointersRef.current.has(event.pointerId)) return;
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      markInteraction();

      if (pointersRef.current.size >= 2) {
        const [first, second] = [...pointersRef.current.values()];
        const gap = pointerGap(first, second);
        const pinch = pinchRef.current;
        if (!pinch || pinch.gap < 1) {
          pinchRef.current = { gap, distance: distanceRef.current };
          return;
        }
        // Pinching in (smaller gap) moves the camera farther away.
        distanceRef.current = clampCameraDistance(pinch.distance * (pinch.gap / gap));
        return;
      }

      applyDrag({ x: event.clientX, y: event.clientY }, performance.now());
    };

    const endPointer = (event: PointerEvent) => {
      if (!pointersRef.current.has(event.pointerId)) return;
      pointersRef.current.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      if (pointersRef.current.size === 1) {
        const remaining = [...pointersRef.current.values()][0];
        pinchRef.current = null;
        lastDragRef.current = { ...remaining, time: performance.now() };
        return;
      }

      pinchRef.current = null;
      lastDragRef.current = null;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      markInteraction();
      distanceRef.current = clampCameraDistance(
        distanceRef.current + normalizedWheelDelta(event) * WHEEL_ZOOM_SPEED,
      );
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endPointer);
      canvas.removeEventListener("pointercancel", endPointer);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [distanceRef, gl]);

  useFrame((_, delta) => {
    const interacting = pointersRef.current.size > 0;
    const safeDelta = Math.min(delta, 0.05);

    if (!interacting) {
      yawRef.current += yawVelocityRef.current * safeDelta;
      pitchRef.current = clamp(pitchRef.current + pitchVelocityRef.current * safeDelta, -MAX_PITCH, MAX_PITCH);

      const damping = Math.pow(DAMPING_PER_SECOND, safeDelta);
      yawVelocityRef.current *= damping;
      pitchVelocityRef.current *= damping;
      if (Math.abs(yawVelocityRef.current) < VELOCITY_EPSILON) yawVelocityRef.current = 0;
      if (Math.abs(pitchVelocityRef.current) < VELOCITY_EPSILON) pitchVelocityRef.current = 0;

      if (!reducedMotionRef.current) {
        const idleElapsed = performance.now() - lastInteractedAtRef.current - IDLE_RESUME_DELAY_MS;
        if (idleElapsed > 0) {
          const idleMix = clamp(idleElapsed / IDLE_RESUME_FADE_MS, 0, 1);
          yawRef.current += IDLE_YAW_SPEED * idleMix * safeDelta;
        }
      }
    }

    const globe = globeRef.current;
    if (!globe) return;
    // Yaw around world up, then pitch around local X, so pole tilt stays predictable.
    globe.rotation.order = "YXZ";
    globe.rotation.y = yawRef.current;
    globe.rotation.x = pitchRef.current;
  });

  return null;
}
