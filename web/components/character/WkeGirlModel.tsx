"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import {
  Color,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { CharacterConfig } from "@/lib/character/character-types";
import {
  WKE_GIRL_BASE,
  WKE_GIRL_MODEL_HEIGHT,
  WKE_GIRL_SOURCE_HEIGHT,
} from "@/lib/character/wke-girl-assets";

type Props = {
  config: CharacterConfig;
  scale?: number;
  walkingRef?: MutableRefObject<boolean>;
};

type TintUniforms = {
  hair: { value: Color };
  skin: { value: Color };
  outfit: { value: Color };
};

type WalkBone = {
  object: Object3D;
  rest: Quaternion;
  phase: 1 | -1;
  amount: number;
};

function maskedMaterial(source: Material, uniforms: TintUniforms): Material {
  if (!(source instanceof MeshStandardMaterial)) return source.clone();

  const material = source.clone();
  material.onBeforeCompile = (shader) => {
    shader.uniforms.wkeHairColor = uniforms.hair;
    shader.uniforms.wkeSkinColor = uniforms.skin;
    shader.uniforms.wkeOutfitColor = uniforms.outfit;
    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      `uniform vec3 wkeHairColor;
uniform vec3 wkeSkinColor;
uniform vec3 wkeOutfitColor;
void main() {`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
#ifdef USE_MAP
  // The source atlas is a fused Tripo texture. These soft masks target its
  // deliberately distinct brown, peach, and purple color families while
  // leaving eyes, whites, seams, and texture detail intact.
  vec3 wkeSource = sampledDiffuseColor.rgb;
  float wkeR = wkeSource.r;
  float wkeG = wkeSource.g;
  float wkeB = wkeSource.b;
  float wkeMax = max(wkeR, max(wkeG, wkeB));
  float wkeLuma = dot(wkeSource, vec3(0.2126, 0.7152, 0.0722));

  float wkeSkinMask =
    smoothstep(0.28, 0.52, wkeR) *
    smoothstep(0.07, 0.17, wkeG) *
    (1.0 - smoothstep(0.48, 0.68, wkeG)) *
    smoothstep(1.2, 1.65, wkeR / max(wkeG, 0.01)) *
    smoothstep(1.0, 1.25, wkeG / max(wkeB, 0.01));

  float wkeHairMask =
    smoothstep(1.25, 1.7, wkeR / max(wkeG, 0.01)) *
    smoothstep(1.05, 1.35, wkeG / max(wkeB, 0.01)) *
    (1.0 - smoothstep(0.32, 0.52, wkeMax));

  float wkeOutfitMask =
    smoothstep(0.10, 0.22, wkeB) *
    smoothstep(1.05, 1.18, wkeB / max(wkeR, 0.01)) *
    smoothstep(1.45, 1.9, wkeR / max(wkeG, 0.01));

  vec3 wkeResult = wkeSource;
  vec3 wkeHair = wkeHairColor * clamp(wkeLuma / 0.075, 0.28, 1.75);
  vec3 wkeSkin = wkeSkinColor * clamp(wkeLuma / 0.40, 0.45, 1.45);
  vec3 wkeOutfit = wkeOutfitColor * clamp(wkeLuma / 0.26, 0.35, 1.55);

  wkeResult = mix(wkeResult, wkeHair, clamp(wkeHairMask, 0.0, 1.0));
  wkeResult = mix(wkeResult, wkeSkin, clamp(wkeSkinMask, 0.0, 1.0));
  wkeResult = mix(wkeResult, wkeOutfit, clamp(wkeOutfitMask, 0.0, 1.0));
  diffuseColor.rgb = wkeResult;
#endif`,
    );
  };
  material.customProgramCacheKey = () => "wke-girl-fused-atlas-tint-v2";
  material.needsUpdate = true;
  return material;
}

function findWalkBones(root: Object3D): WalkBone[] {
  const rows: Array<[string, 1 | -1, number]> = [
    ["mixamorig:LeftArm", 1, 0.34],
    ["mixamorig:RightArm", -1, 0.34],
    ["mixamorig:LeftUpLeg", -1, 0.28],
    ["mixamorig:RightUpLeg", 1, 0.28],
  ];
  return rows.flatMap(([name, phase, amount]) => {
    const object = root.getObjectByName(name);
    return object ? [{ object, rest: object.quaternion.clone(), phase, amount }] : [];
  });
}

function restoreBindPose(root: Object3D): void {
  root.traverse((object) => {
    const mesh = object as Mesh & {
      isSkinnedMesh?: boolean;
      skeleton?: { pose: () => void };
    };
    if (mesh.isSkinnedMesh) mesh.skeleton?.pose();
  });
  root.updateMatrixWorld(true);
}

export function WkeGirlModel({ config, scale = 1, walkingRef }: Props) {
  const gltf = useGLTF(WKE_GIRL_BASE.src);
  const walkBlend = useRef(0);
  const walkRotation = useRef(new Quaternion());
  const walkAxis = useRef(new Vector3(1, 0, 0));

  const instance = useMemo(() => {
    const root = cloneSkeleton(gltf.scene);
    // This Tripo export's authored node transforms do not match its inverse
    // bind matrices. Reconstruct the bind pose before recording animation rest
    // rotations; otherwise weighted vertices stretch toward displaced joints.
    restoreBindPose(root);
    const uniforms: TintUniforms = {
      hair: { value: new Color(config.hairColor) },
      skin: { value: new Color(config.skinColor) },
      outfit: { value: new Color(config.outfitColor) },
    };
    const materials: Material[] = [];

    root.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const next = source.map((material) => {
        const cloned = maskedMaterial(material, uniforms);
        materials.push(cloned);
        return cloned;
      });
      mesh.material = Array.isArray(mesh.material) ? next : next[0]!;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });

    return {
      root,
      uniforms,
      materials,
      walkBones: findWalkBones(root),
    };
  }, [gltf.scene]);

  const { actions, mixer } = useAnimations(gltf.animations, instance.root);
  const authoredMotion = gltf.animations.some((clip) => clip.duration >= 0.2);

  useEffect(() => {
    instance.uniforms.hair.value.set(config.hairColor);
    instance.uniforms.skin.value.set(config.skinColor);
    instance.uniforms.outfit.value.set(config.outfitColor);
  }, [
    config.hairColor,
    config.outfitColor,
    config.skinColor,
    instance.uniforms,
  ]);

  useEffect(() => {
    const clip = gltf.animations[0];
    if (!clip) return;
    const action = actions[clip.name];
    if (!action) return;
    action.reset().play();
    if (!authoredMotion) {
      action.paused = true;
      mixer.setTime(0);
    }
    return () => {
      action.stop();
    };
  }, [actions, authoredMotion, gltf.animations, mixer]);

  useEffect(
    () => () => {
      instance.materials.forEach((material) => material.dispose());
    },
    [instance.materials],
  );

  useFrame((state, delta) => {
    if (authoredMotion) return;
    const moving = walkingRef?.current === true;
    const step = Math.min(delta, 0.05);
    walkBlend.current = moving
      ? Math.min(1, walkBlend.current + step * 8)
      : Math.max(0, walkBlend.current - step * 10);
    const wave = Math.sin(state.clock.elapsedTime * 9) * walkBlend.current;
    for (const bone of instance.walkBones) {
      walkRotation.current.setFromAxisAngle(
        walkAxis.current,
        wave * bone.phase * bone.amount,
      );
      bone.object.quaternion
        .copy(bone.rest)
        .multiply(walkRotation.current);
    }
  });

  return (
    <group
      name="wkeGirlRoot"
      scale={scale * (WKE_GIRL_MODEL_HEIGHT / WKE_GIRL_SOURCE_HEIGHT)}
    >
      <primitive object={instance.root} />
    </group>
  );
}

useGLTF.preload(WKE_GIRL_BASE.src);
