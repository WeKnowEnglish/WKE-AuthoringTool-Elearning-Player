"use client";

const WOOD_GLSL = `
vec2 plank = vec2(floor(vWp.x / 0.55), floor(vWp.z / 0.42));
float n = fract(sin(dot(plank, vec2(12.9898, 78.233))) * 43758.5453);
vec3 dark = vec3(0.42, 0.25, 0.13);
vec3 mid = vec3(0.55, 0.35, 0.20);
vec3 light = vec3(0.62, 0.40, 0.24);
diffuseColor.rgb = mix(dark, mix(mid, light, n), 0.9);
float gap = step(0.9, fract(vWp.z / 0.42));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.29, 0.17, 0.09), gap);
`;

const STRIPE_GLSL = `
float along = mix(vWp.x, vWp.z, step(0.5, abs(vWorldN.x)));
float stripe = step(0.5, fract(along / 0.34));
vec3 cream = vec3(0.96, 0.92, 0.85);
vec3 peach = vec3(0.83, 0.63, 0.48);
diffuseColor.rgb = mix(cream, peach, stripe);
`;

const CHECKER_GLSL = `
vec2 c = floor(vWp.xz / 0.55);
float k = mod(c.x + c.y, 2.0);
diffuseColor.rgb = mix(vec3(0.11), vec3(0.96, 0.95, 0.92), k);
`;

function patternChunk(kind: "wood" | "stripes" | "checkers"): string {
  if (kind === "wood") return WOOD_GLSL;
  if (kind === "stripes") return STRIPE_GLSL;
  return CHECKER_GLSL;
}

export function PatternedBox({
  args,
  position,
  kind,
  roughness = 0.86,
}: {
  args: [number, number, number];
  position?: [number, number, number];
  kind: "wood" | "stripes" | "checkers";
  roughness?: number;
}) {
  return (
    <mesh key={kind} position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={kind === "wood" ? "#8d5a32" : kind === "stripes" ? "#f6ead8" : "#e8e8e8"}
        roughness={roughness}
        metalness={0}
        customProgramCacheKey={() => kind}
        onBeforeCompile={(shader) => {
          shader.vertexShader = shader.vertexShader
            .replace(
              "#include <common>",
              `#include <common>
varying vec3 vWp;
varying vec3 vWorldN;`,
            )
            .replace(
              "#include <project_vertex>",
              `#include <project_vertex>
vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;
vWorldN = normalize(mat3(modelMatrix) * objectNormal);`,
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "#include <common>",
              `#include <common>
varying vec3 vWp;
varying vec3 vWorldN;`,
            )
            .replace(
              "#include <color_fragment>",
              `#include <color_fragment>
${patternChunk(kind)}`,
            );
        }}
      />
    </mesh>
  );
}
