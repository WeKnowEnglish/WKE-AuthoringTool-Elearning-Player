import { describe, expect, it } from "vitest";
import { buildHeadGeometryFromProfile } from "./build-head-geometry";
import { DEFAULT_HEAD_PROFILE } from "./head-profile";
import { DEFAULT_CHARACTER_KIT } from "./kit-defaults";
import { nearestVertexZ, sculptToySkull } from "./sculpt-toy-skull";

describe("sculptToySkull", () => {
  it("indents sockets so globes can nest instead of sitting on the egg", () => {
    const geometry = buildHeadGeometryFromProfile(DEFAULT_HEAD_PROFILE);
    const half = DEFAULT_CHARACTER_KIT.eyes.spacing / 2;
    const eye: [number, number, number] = [half, DEFAULT_CHARACTER_KIT.eyes.height, DEFAULT_CHARACTER_KIT.eyes.forward];
    sculptToySkull(geometry, {
      leftEye: [-half, eye[1], eye[2]],
      rightEye: eye,
      eyeRadius: 0.185 * DEFAULT_CHARACTER_KIT.eyes.size,
    });
    const socket = nearestVertexZ(geometry, half, eye[1]);
    const cheek = nearestVertexZ(geometry, 0.36, -0.16);
    expect(socket).toBeLessThan(cheek - 0.02);
    geometry.dispose();
  });
});
