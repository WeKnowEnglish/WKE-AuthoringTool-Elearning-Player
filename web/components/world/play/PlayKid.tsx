"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type MutableRefObject } from "react";
import type { Group } from "three";
import { Box, Cylinder, Sphere } from "../campus/campus-primitives";

const HIP_Y = 0.43;
const LEG_LEN = 0.42;
const GAIT_SPEED = 10.5;
const LEG_SWING = 0.72;
const ARM_SWING = 0.5;

type Props = {
  walkingRef?: MutableRefObject<boolean>;
};

export function PlayKid({ walkingRef }: Props) {
  const bodyRef = useRef<Group>(null);
  const leftLegRef = useRef<Group>(null);
  const rightLegRef = useRef<Group>(null);
  const leftArmRef = useRef<Group>(null);
  const rightArmRef = useRef<Group>(null);
  const gait = useRef(0);
  const amp = useRef(0);

  useFrame((_, dt) => {
    const moving = walkingRef?.current === true;
    const step = Math.min(dt, 0.05);
    amp.current = moving
      ? Math.min(1, amp.current + step * 8)
      : Math.max(0, amp.current - step * 10);
    if (amp.current > 0.01) gait.current += step * GAIT_SPEED;
    const swing = Math.sin(gait.current) * amp.current;
    const bounce = Math.abs(swing) * 0.05;
    if (bodyRef.current) bodyRef.current.position.y = bounce;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing * LEG_SWING;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing * LEG_SWING;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * ARM_SWING;
    if (rightArmRef.current) rightArmRef.current.rotation.x = swing * ARM_SWING;
  });

  return (
    <group name="play-kid">
      <group ref={bodyRef}>
        <Sphere radius={0.16} position={[0, 1.08, 0.02]} tone={{ color: "#f2c9a1" }} />
        <Cylinder args={[0.15, 0.18, 0.5, 10]} position={[0, 0.64, 0]} tone={{ color: "#38bdf8" }} />
        <group ref={leftArmRef} position={[-0.22, 0.82, 0]}>
          <Box args={[0.11, 0.36, 0.11]} position={[0, -0.14, 0]} tone={{ color: "#38bdf8" }} />
        </group>
        <group ref={rightArmRef} position={[0.22, 0.82, 0]}>
          <Box args={[0.11, 0.36, 0.11]} position={[0, -0.14, 0]} tone={{ color: "#38bdf8" }} />
        </group>
      </group>
      <group ref={leftLegRef} position={[-0.12, HIP_Y, 0]}>
        <Cylinder args={[0.05, 0.06, LEG_LEN, 8]} position={[0, -LEG_LEN / 2, 0]} tone={{ color: "#1d4ed8" }} />
        <Sphere radius={0.07} position={[0, -LEG_LEN, 0.04]} tone={{ color: "#0f172a" }} />
      </group>
      <group ref={rightLegRef} position={[0.12, HIP_Y, 0]}>
        <Cylinder args={[0.05, 0.06, LEG_LEN, 8]} position={[0, -LEG_LEN / 2, 0]} tone={{ color: "#1d4ed8" }} />
        <Sphere radius={0.07} position={[0, -LEG_LEN, 0.04]} tone={{ color: "#0f172a" }} />
      </group>
    </group>
  );
}
