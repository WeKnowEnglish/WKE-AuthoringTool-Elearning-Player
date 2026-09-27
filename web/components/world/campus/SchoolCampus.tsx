"use client";

import {
  SchoolBody,
  SchoolClock,
  SchoolEntrance,
  SchoolPlayground,
  SchoolRoof,
  SchoolSign,
  SchoolWindows,
  SchoolYard,
} from "./school/SchoolParts";

/** Two-wing clay school with a fenced yard and playground. */
export function SchoolCampus() {
  return (
    <group name="school">
      <SchoolYard />
      <SchoolPlayground />
      <SchoolBody />
      <SchoolRoof />
      <SchoolWindows />
      <SchoolEntrance />
      <SchoolClock />
      <SchoolSign />
      <mesh visible={false} position={[0.05, 0.72, 0.55]} name="school-hit">
        <boxGeometry args={[3.9, 1.75, 3.3]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}
