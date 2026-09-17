"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";
import { cameraPose } from "@/lib/house/house-camera";
import type { HouseDesignerCamera } from "@/lib/house/house-types";

const POS = new Vector3();
const LOOK = new Vector3();

export function HouseDesignerCamera({ view }: { view: HouseDesignerCamera }) {
  const camera = useThree((state) => state.camera);
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    const pose = cameraPose(view);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.lookAt);
  }, [camera, view.preset]);

  useFrame(() => {
    const pose = cameraPose(viewRef.current);
    camera.position.lerp(POS.set(...pose.position), 0.12);
    camera.lookAt(LOOK.set(...pose.lookAt));
  });

  return null;
}
