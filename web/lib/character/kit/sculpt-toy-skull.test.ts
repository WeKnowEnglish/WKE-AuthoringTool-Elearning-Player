import { Mesh } from "three";
import { describe, expect, it } from "vitest";
import { buildHeadGeometryFromProfile } from "./build-head-geometry";
import { buildHeroObject, disposeHeroObject, EYE_RADIUS } from "./build-hero-object";
import { DEFAULT_HEAD_PROFILE } from "./head-profile";
import { DEFAULT_CHARACTER_KIT } from "./kit-defaults";
import { nearestVertexZ, sculptEyeSockets } from "./sculpt-toy-skull";

describe("sculptEyeSockets", () => {
  it("indents sockets so globes can nest instead of sitting on the egg", () => {
    const geometry = buildHeadGeometryFromProfile(DEFAULT_HEAD_PROFILE);
    const half = DEFAULT_CHARACTER_KIT.eyes.spacing / 2;
    const eye: [number, number, number] = [half, DEFAULT_CHARACTER_KIT.eyes.height, DEFAULT_CHARACTER_KIT.eyes.forward];
    sculptEyeSockets(geometry, {
      leftEye: [-half, eye[1], eye[2]],
      rightEye: eye,
      eyeRadius: EYE_RADIUS * DEFAULT_CHARACTER_KIT.eyes.size,
    });
    const socket = nearestVertexZ(geometry, half, eye[1]);
    const cheek = nearestVertexZ(geometry, 0.36, -0.16);
    expect(socket).toBeLessThan(cheek - 0.02);
    geometry.dispose();
  });

  it("keeps sockets deeper than cheeks after the vinyl chin/cheek recipe", () => {
    const group = buildHeroObject({ ...DEFAULT_CHARACTER_KIT, hair: { ...DEFAULT_CHARACTER_KIT.hair, tufts: [] } }, { showFace: false, showHair: false });
    const skull = group.getObjectByName("heroSkull");
    expect(skull).toBeInstanceOf(Mesh);
    const geometry = (skull as Mesh).geometry;
    const half = DEFAULT_CHARACTER_KIT.eyes.spacing / 2;
    const socket = nearestVertexZ(geometry, half, DEFAULT_CHARACTER_KIT.eyes.height);
    const cheek = nearestVertexZ(geometry, 0.36, -0.16);
    expect(socket).toBeLessThan(cheek - 0.02);
    disposeHeroObject(group);
  });
});
