"use client";

import { HEAD_LANDMARKS } from "./student-head-landmarks";
import { ToySkinMaterial } from "./toy-materials";

type Props = {
  recipe: string;
  skinColor: string;
};

function Eye({
  landmark,
  open,
}: {
  landmark: readonly [number, number, number];
  open: boolean;
}) {
  const size = open ? 1.08 : 1;
  return (
    <group position={landmark} scale={size}>
      <mesh scale={[1, 1.02, 0.88]}>
        <sphereGeometry args={[0.185, 22, 18]} />
        <meshStandardMaterial color="#fffaf4" roughness={0.22} metalness={0} />
      </mesh>
      <mesh position={[0, -0.006, 0.115]} scale={[1, 1, 0.58]}>
        <sphereGeometry args={[0.122, 20, 16]} />
        <meshStandardMaterial color="#1c1410" roughness={0.28} metalness={0} />
      </mesh>
      <mesh position={[0, -0.006, 0.162]} scale={[1, 1, 0.4]}>
        <sphereGeometry args={[0.044, 12, 10]} />
        <meshStandardMaterial color="#070504" roughness={0.18} metalness={0} />
      </mesh>
      <mesh position={[-0.045, 0.05, 0.175]}>
        <sphereGeometry args={[0.034, 12, 10]} />
        <meshStandardMaterial color="#ffffff" roughness={0.12} metalness={0} />
      </mesh>
    </group>
  );
}

function Nose({ skinColor }: { skinColor: string }) {
  return (
    <mesh position={HEAD_LANDMARKS.nose} scale={[0.72, 0.55, 0.7]}>
      <sphereGeometry args={[0.055, 14, 12]} />
      <ToySkinMaterial color={skinColor} />
    </mesh>
  );
}

function Mouth({ cheer, open }: { cheer: boolean; open: boolean }) {
  const [x, y, z] = HEAD_LANDMARKS.mouth;
  if (open) {
    return (
      <mesh position={[x, y, z]} scale={[0.9, 1.05, 0.55]}>
        <sphereGeometry args={[0.055, 14, 12]} />
        <meshStandardMaterial color="#c45b66" roughness={0.45} metalness={0} />
      </mesh>
    );
  }

  return (
    <mesh
      position={[x, y + (cheer ? 0.008 : 0), z]}
      rotation={[1.35, 0, Math.PI]}
      scale={[cheer ? 1.22 : 1, 0.7, 0.85]}
    >
      <torusGeometry args={[0.075, 0.011, 10, 24, Math.PI * 0.92]} />
      <meshStandardMaterial color="#d06a72" roughness={0.4} metalness={0} />
    </mesh>
  );
}

export function StudentFaceKit({ recipe, skinColor }: Props) {
  const open = recipe === "face_03";
  const cheer = recipe === "face_02";

  return (
    <group name="studentFaceKit">
      <Eye landmark={HEAD_LANDMARKS.leftEye} open={open} />
      <Eye landmark={HEAD_LANDMARKS.rightEye} open={open} />
      <Nose skinColor={skinColor} />
      <Mouth cheer={cheer} open={open} />
    </group>
  );
}
