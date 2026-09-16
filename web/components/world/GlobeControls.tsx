"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import { Raycaster, Vector2, Vector3, type Group, type Object3D } from "three";
import {
  DAMPING_PER_SECOND,
  FLICK_MAX_AGE_SECONDS,
  MAX_ANGULAR_VELOCITY,
  MAX_PITCH,
  VELOCITY_EPSILON,
  YAW_SENSITIVITY,
  clamp,
  clampCameraDistance,
} from "./globe-config";
import { lookAtLatLon, shortestAngleDelta, type GlobeFocus } from "./look-at-hub";
import { vectorToLatLon } from "./sphere-wrap";

const CLICK_PIXELS = 8;

type PointerSample = {
  x: number;
  y: number;
};

export type GlobePick = {
  landmassId: string;
  spot?: string;
  placementId?: string;
  lat: number;
  lon: number;
};

type Props = {
  globeRef: RefObject<Group | null>;
  distanceRef: RefObject<number>;
  focus?: GlobeFocus | null;
  editMode?: boolean;
  selectedPlacementId?: string | null;
  onPick?: (pick: GlobePick | null) => void;
  onEditPick?: (placementId: string | null) => void;
  onEditMove?: (pick: GlobePick) => void;
};

function pointerGap(a: PointerSample, b: PointerSample): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pickFromObject(object: Object3D): { landmassId: string; spot?: string; placementId?: string } | null {
  let current: Object3D | null = object;
  let landmassId: string | null = null;
  let spot: string | undefined;
  let placementId: string | undefined;
  while (current) {
    if (!placementId && typeof current.userData.placementId === "string") placementId = current.userData.placementId;
    if (!spot && typeof current.userData.homeSpot === "string") spot = current.userData.homeSpot;
    if (!landmassId && typeof current.userData.landmassId === "string") landmassId = current.userData.landmassId;
    current = current.parent;
  }
  return landmassId ? { landmassId, spot, placementId } : null;
}

/**
 * Spin-the-globe controls. Drag turns left/right only so students cannot
 * flip the ball. Zoom is owned by Place / Whole map, not pinch or wheel.
 */
export function GlobeControls({
  globeRef,
  distanceRef,
  focus,
  editMode = false,
  selectedPlacementId = null,
  onPick,
  onEditPick,
  onEditMove,
}: Props) {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);

  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const yawVelocityRef = useRef(0);
  const pitchVelocityRef = useRef(0);
  const pointersRef = useRef(new Map<number, PointerSample>());
  const lastDragRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const pinchRef = useRef<{ gap: number; distance: number } | null>(null);
  const downRef = useRef<PointerSample | null>(null);
  const draggedRef = useRef(false);
  const pinchedRef = useRef(false);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const onEditPickRef = useRef(onEditPick);
  onEditPickRef.current = onEditPick;
  const onEditMoveRef = useRef(onEditMove);
  onEditMoveRef.current = onEditMove;
  const editModeRef = useRef(editMode);
  editModeRef.current = editMode;
  const selectedPlacementIdRef = useRef(selectedPlacementId);
  selectedPlacementIdRef.current = selectedPlacementId;
  const focusingRef = useRef(false);
  const targetYawRef = useRef(0);
  const targetPitchRef = useRef(0);
  const targetDistanceRef = useRef(distanceRef.current);

  useEffect(() => {
    if (!focus) return;
    const pose = lookAtLatLon(focus.lat, focus.lon);
    targetYawRef.current = pose.yaw;
    targetPitchRef.current = pose.pitch;
    targetDistanceRef.current = focus.distance;
    yawVelocityRef.current = 0;
    pitchVelocityRef.current = 0;
    if (focus.snap) {
      yawRef.current = pose.yaw;
      pitchRef.current = pose.pitch;
      distanceRef.current = focus.distance;
      focusingRef.current = false;
      return;
    }
    focusingRef.current = true;
  }, [focus]);

  useEffect(() => {
    const canvas = gl.domElement;
    const raycaster = new Raycaster();
    const ndc = new Vector2();

    const pickAt = (clientX: number, clientY: number) => {
      const globe = globeRef.current;
      if (!globe) return null;
      const rect = canvas.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(globe.children, true);
      let nearest: { pick: { landmassId: string; spot?: string; placementId?: string }; distance: number; point: Vector3 } | null =
        null;
      let nearestSpot: { pick: { landmassId: string; spot?: string; placementId?: string }; distance: number; point: Vector3 } | null =
        null;
      for (const hit of hits) {
        const pick = pickFromObject(hit.object);
        if (!pick) continue;
        if (!nearest) nearest = { pick, distance: hit.distance, point: hit.point };
        if ((pick.placementId || pick.spot) && !nearestSpot) nearestSpot = { pick, distance: hit.distance, point: hit.point };
      }
      const chosen =
        nearestSpot && nearest && nearestSpot.distance <= nearest.distance + 0.55 ? nearestSpot : nearest;
      if (!chosen) return null;
      const local = chosen.point.clone();
      globe.worldToLocal(local);
      return { ...chosen.pick, ...vectorToLatLon(local) };
    };

    const applyDrag = (point: PointerSample, time: number) => {
      const previous = lastDragRef.current;
      lastDragRef.current = { ...point, time };
      if (!previous) return;

      if (downRef.current && pointerGap(downRef.current, point) > CLICK_PIXELS) {
        draggedRef.current = true;
        focusingRef.current = false;
      }

      if (editModeRef.current && selectedPlacementIdRef.current && draggedRef.current) {
        const pick = pickAt(point.x, point.y);
        if (pick) onEditMoveRef.current?.(pick);
        yawVelocityRef.current = 0;
        pitchVelocityRef.current = 0;
        return;
      }

      const elapsed = (time - previous.time) / 1000;
      const yawDelta = (point.x - previous.x) * YAW_SENSITIVITY;
      yawRef.current += yawDelta;

      if (elapsed > 0 && elapsed <= FLICK_MAX_AGE_SECONDS) {
        yawVelocityRef.current = clamp(yawDelta / elapsed, -MAX_ANGULAR_VELOCITY, MAX_ANGULAR_VELOCITY);
      } else {
        yawVelocityRef.current = 0;
      }
      pitchVelocityRef.current = 0;
    };

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      canvas.style.cursor = "grabbing";

      if (pointersRef.current.size >= 2) {
        const [first, second] = [...pointersRef.current.values()];
        pinchRef.current = { gap: pointerGap(first, second), distance: distanceRef.current };
        lastDragRef.current = null;
        yawVelocityRef.current = 0;
        pitchVelocityRef.current = 0;
        pinchedRef.current = true;
        draggedRef.current = true;
        return;
      }

      pinchRef.current = null;
      pinchedRef.current = false;
      draggedRef.current = false;
      downRef.current = { x: event.clientX, y: event.clientY };
      lastDragRef.current = { x: event.clientX, y: event.clientY, time: performance.now() };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointersRef.current.has(event.pointerId) && pointersRef.current.size === 0) {
        canvas.style.cursor = pickAt(event.clientX, event.clientY) ? "pointer" : "grab";
        return;
      }
      if (!pointersRef.current.has(event.pointerId)) return;
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointersRef.current.size >= 2) {
        const [first, second] = [...pointersRef.current.values()];
        const gap = pointerGap(first, second);
        const pinch = pinchRef.current;
        pinchRef.current = { gap, distance: distanceRef.current };
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

      const wasClick = !draggedRef.current && !pinchedRef.current && downRef.current;
      pinchRef.current = null;
      lastDragRef.current = null;
      downRef.current = null;
      canvas.style.cursor = "grab";

      if (wasClick) {
        const pick = pickAt(event.clientX, event.clientY);
        if (editModeRef.current) {
          if (pick?.placementId) onEditPickRef.current?.(pick.placementId);
          else if (pick && selectedPlacementIdRef.current) onEditMoveRef.current?.(pick);
          else onEditPickRef.current?.(null);
          return;
        }
        onPickRef.current?.(pick);
      }
    };

    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      canvas.style.cursor = "";
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endPointer);
      canvas.removeEventListener("pointercancel", endPointer);
      canvas.removeEventListener("wheel", onWheel);
    };

    function onWheel(event: WheelEvent) {
      event.preventDefault();
    }
  }, [camera, distanceRef, gl, globeRef]);

  useFrame((_, delta) => {
    const interacting = pointersRef.current.size > 0;
    const safeDelta = Math.min(delta, 0.05);

    if (focusingRef.current && !interacting) {
      const yawStep = shortestAngleDelta(yawRef.current, targetYawRef.current);
      const pitchStep = targetPitchRef.current - pitchRef.current;
      const distanceStep = targetDistanceRef.current - distanceRef.current;
      const ease = 1 - Math.exp(-12.5 * safeDelta);
      yawRef.current += yawStep * ease;
      pitchRef.current = clamp(pitchRef.current + pitchStep * ease, -MAX_PITCH, MAX_PITCH);
      distanceRef.current = clampCameraDistance(distanceRef.current + distanceStep * ease);
      if (Math.abs(yawStep) < 0.004 && Math.abs(pitchStep) < 0.004 && Math.abs(distanceStep) < 0.012) {
        focusingRef.current = false;
      }
    } else if (!interacting) {
      yawRef.current += yawVelocityRef.current * safeDelta;
      const damping = Math.pow(DAMPING_PER_SECOND, safeDelta);
      yawVelocityRef.current *= damping;
      if (Math.abs(yawVelocityRef.current) < VELOCITY_EPSILON) yawVelocityRef.current = 0;
    }

    const globe = globeRef.current;
    if (!globe) return;
    globe.rotation.order = "YXZ";
    globe.rotation.y = yawRef.current;
    globe.rotation.x = pitchRef.current;
  });

  return null;
}
