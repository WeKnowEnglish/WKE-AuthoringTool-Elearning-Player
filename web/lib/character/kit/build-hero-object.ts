import {
  CapsuleGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  type Object3D,
} from "three";
import { HEAD_LANDMARKS } from "@/components/character/student-head-landmarks";
import { applyProfileRegions, DEFAULT_HEAD_PROFILE } from "./head-profile";
import { buildHeadGeometryFromProfile } from "./build-head-geometry";
import { resolveHairShell } from "./hair-shell";
import { sculptToySkull } from "./sculpt-toy-skull";
import { applySculptStrokes } from "./sculpt-strokes";
import type { CharacterKitDocument, HeadProfileRing, KitHairTuft } from "./kit-types";

export const EYE_RADIUS = 0.185;

export type BuildHeroOptions = {
  showFace?: boolean;
  showHair?: boolean;
};

function skinMaterial(hex: string): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: new Color(hex), roughness: 0.4, metalness: 0 });
}

function hairMaterial(hex: string): MeshStandardMaterial {
  return new MeshStandardMaterial({ color: new Color(hex), roughness: 0.55, metalness: 0 });
}

function addEye(parent: Group, x: number, y: number, z: number, size: number, open: boolean) {
  const group = new Group();
  group.position.set(x, y, z);
  group.scale.setScalar(size * (open ? 1.08 : 1));
  const sclera = new Mesh(
    new SphereGeometry(EYE_RADIUS, 22, 18),
    new MeshStandardMaterial({ color: "#fffaf4", roughness: 0.22, metalness: 0 }),
  );
  sclera.scale.set(1, 1.02, 0.88);
  const iris = new Mesh(
    new SphereGeometry(0.122, 20, 16),
    new MeshStandardMaterial({ color: "#1c1410", roughness: 0.28, metalness: 0 }),
  );
  iris.position.set(0, -0.006, 0.115);
  iris.scale.set(1, 1, 0.58);
  const pupil = new Mesh(
    new SphereGeometry(0.044, 12, 10),
    new MeshStandardMaterial({ color: "#070504", roughness: 0.18, metalness: 0 }),
  );
  pupil.position.set(0, -0.006, 0.162);
  pupil.scale.set(1, 1, 0.4);
  const highlight = new Mesh(
    new SphereGeometry(0.034, 12, 10),
    new MeshStandardMaterial({ color: "#ffffff", roughness: 0.12, metalness: 0 }),
  );
  highlight.position.set(-0.045, 0.05, 0.175);
  group.add(sclera, iris, pupil, highlight);
  parent.add(group);
}

function addEar(parent: Group, side: -1 | 1, color: string, scale: number) {
  const landmark = side < 0 ? HEAD_LANDMARKS.leftEar : HEAD_LANDMARKS.rightEar;
  const mesh = new Mesh(new SphereGeometry(0.24, 16, 14), skinMaterial(color));
  mesh.position.set(...landmark);
  mesh.rotation.set(0.08, side * 0.28, side * 0.08);
  mesh.scale.set(0.32 * scale, 0.62 * scale, 0.28 * scale);
  parent.add(mesh);
}

function addHair(parent: Group, kit: CharacterKitDocument, skull: HeadProfileRing[]) {
  const material = hairMaterial(kit.hairColor);
  const shell = new Mesh(buildHeadGeometryFromProfile(resolveHairShell(kit.hair, skull)), material);
  shell.name = "hairShell";
  parent.add(shell);
  for (const tuft of kit.hair.tufts) {
    addTuft(parent, tuft, material);
  }
}

function addTuft(parent: Group, tuft: KitHairTuft, material: MeshStandardMaterial) {
  const mesh = new Mesh(new CapsuleGeometry(tuft.radius, tuft.length, 6, 12), material);
  mesh.name = tuft.id;
  mesh.position.set(...tuft.position);
  mesh.rotation.set(...tuft.tilt);
  parent.add(mesh);
}

/**
 * Local mesh builder. Same object the kit preview and the CLI export.
 */
export function buildHeroObject(kit: CharacterKitDocument, options: BuildHeroOptions = {}): Group {
  const showFace = options.showFace ?? true;
  const showHair = options.showHair ?? true;
  const root = new Group();
  root.name = "characterKitHead";

  const rings = applyProfileRegions(kit.profile ?? DEFAULT_HEAD_PROFILE, kit.regions);
  const half = kit.eyes.spacing / 2;
  const skull = buildHeadGeometryFromProfile(rings);
  sculptToySkull(skull, {
    leftEye: [-half, kit.eyes.height, kit.eyes.forward],
    rightEye: [half, kit.eyes.height, kit.eyes.forward],
    eyeRadius: EYE_RADIUS * kit.eyes.size,
  });
  applySculptStrokes(skull, kit.sculpts ?? []);
  const head = new Mesh(skull, skinMaterial(kit.skinColor));
  head.name = "heroSkull";
  root.add(head);
  addEar(root, -1, kit.skinColor, kit.ears.size);
  addEar(root, 1, kit.skinColor, kit.ears.size);
  const neck = new Mesh(new CapsuleGeometry(0.11, 0.14, 8, 16), skinMaterial(kit.skinColor));
  neck.position.set(0, (rings[0]?.y ?? HEAD_LANDMARKS.neck[1]) + 0.04, 0.14);
  root.add(neck);

  if (showFace) {
    const face = new Group();
    face.name = "kitFace";
    const openMouth = kit.mouth.expression === "wow";
    const wideEyes = kit.eyes.open || openMouth;
    const cheer = kit.mouth.expression === "cheer";
    addEye(face, -half, kit.eyes.height, kit.eyes.forward, kit.eyes.size, wideEyes);
    addEye(face, half, kit.eyes.height, kit.eyes.forward, kit.eyes.size, wideEyes);
    const nose = new Mesh(new SphereGeometry(0.055, 14, 12), skinMaterial(kit.skinColor));
    nose.position.set(0, kit.nose.height, kit.nose.forward);
    nose.scale.set(0.72 * kit.nose.size, 0.55 * kit.nose.size, 0.7 * kit.nose.size);
    face.add(nose);
    if (openMouth) {
      const mouth = new Mesh(
        new SphereGeometry(0.055, 14, 12),
        new MeshStandardMaterial({ color: "#c45b66", roughness: 0.45, metalness: 0 }),
      );
      mouth.position.set(0, kit.mouth.height, kit.mouth.forward);
      mouth.scale.set(0.9 * kit.mouth.width, 1.05, 0.55);
      face.add(mouth);
    } else {
      const mouth = new Mesh(
        new TorusGeometry(0.092, 0.013, 10, 24, Math.PI * 0.96),
        new MeshStandardMaterial({ color: "#d06a72", roughness: 0.4, metalness: 0 }),
      );
      mouth.position.set(0, kit.mouth.height + (cheer ? 0.008 : 0), kit.mouth.forward);
      mouth.rotation.set(1.35, 0, Math.PI);
      mouth.scale.set(kit.mouth.width, 0.7, 0.85);
      face.add(mouth);
    }
    root.add(face);
  }

  if (showHair) {
    const hair = new Group();
    hair.name = "kitHair";
    addHair(hair, kit, rings);
    root.add(hair);
  }

  return root;
}

export function disposeHeroObject(root: Object3D) {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) material.dispose();
  });
}
