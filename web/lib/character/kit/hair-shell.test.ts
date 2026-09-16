import { describe, expect, it } from "vitest";
import { DEFAULT_HEAD_PROFILE } from "./head-profile";
import { deriveHairShell, resolveHairShell } from "./hair-shell";
import { REFERENCE_KID_HAIR } from "./reference-kid-hair";

function frontZ(ring: { rz: number; z?: number }) {
  return (ring.z ?? 0) + ring.rz;
}

describe("hair shell", () => {
  it("pulls the hairline behind the skull so the forehead stays skin", () => {
    const skull = DEFAULT_HEAD_PROFILE;
    const shell = deriveHairShell(skull, 0.26, 0.06, -0.14);
    const skullHairline =
      skull.find((ring) => Math.abs(ring.y - 0.26) < 0.08) ?? skull[Math.floor(skull.length * 0.6)]!;
    expect(frontZ(shell[0]!)).toBeLessThan(frontZ(skullHairline));
    expect(shell[0]!.z).toBeLessThan(skullHairline.z ?? 0);
    expect(shell[shell.length - 1]!.z).toBeCloseTo(0, 1);
  });

  it("uses the authored reference shell when present", () => {
    const shell = resolveHairShell(REFERENCE_KID_HAIR, DEFAULT_HEAD_PROFILE);
    expect(shell).toHaveLength(REFERENCE_KID_HAIR.shell!.length);
    expect(shell[0]!.rz).toBeCloseTo(0.48 * 1.08);
    expect(shell[0]!.z).toBeCloseTo(-0.2);
  });
});
