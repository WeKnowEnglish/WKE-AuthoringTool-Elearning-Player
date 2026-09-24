import { describe, expect, it } from "vitest";
import { DEFAULT_CHARACTER_CONFIG } from "@/lib/character/character-defaults";
import { kitFromCharacterConfig } from "./kit-from-config";
import { DEFAULT_CHARACTER_KIT, VINYL_SCULPT_RECIPE } from "./kit-defaults";
import { hairPreset } from "./kit-presets";
import { normalizeCharacterKit } from "./kit-normalize";

describe("normalizeCharacterKit", () => {
  it("fills an empty document with the locked hero defaults", () => {
    const kit = normalizeCharacterKit(null);
    expect(kit.hero).toBe("toy_head_v1");
    expect(kit.hair.tufts.length).toBe(DEFAULT_CHARACTER_KIT.hair.tufts.length);
    expect(kit.hair.hairlineY).toBe(DEFAULT_CHARACTER_KIT.hair.hairlineY);
    expect(kit.sculpts).toHaveLength(VINYL_SCULPT_RECIPE.length);
    expect(kit.sculpts?.map((stroke) => stroke.id)).toEqual(VINYL_SCULPT_RECIPE.map((stroke) => stroke.id));
  });

  it("keeps an explicit empty sculpt list instead of the vinyl recipe", () => {
    const kit = normalizeCharacterKit({ sculpts: [] });
    expect(kit.sculpts).toEqual([]);
  });

  it("replaces the squat 16-ring apple skull with the hair-dropped seed profile", () => {
    const kit = normalizeCharacterKit({
      profile: [
        { y: -0.63, rx: 0.06, rz: 0.06, z: 0.03 },
        { y: -0.57, rx: 0.37, rz: 0.3, z: 0.05 },
        { y: -0.53, rx: 0.61, rz: 0.5, z: 0.06 },
        { y: -0.43, rx: 0.73, rz: 0.62, z: 0.04 },
        { y: -0.34, rx: 0.76, rz: 0.67, z: 0.02 },
        { y: -0.24, rx: 0.76, rz: 0.68, z: 0 },
        { y: -0.14, rx: 0.77, rz: 0.69, z: -0.01 },
        { y: -0.05, rx: 0.78, rz: 0.71, z: -0.01 },
        { y: 0.05, rx: 0.77, rz: 0.7, z: -0.01 },
        { y: 0.15, rx: 0.74, rz: 0.68, z: -0.01 },
        { y: 0.25, rx: 0.71, rz: 0.64, z: -0.01 },
        { y: 0.34, rx: 0.66, rz: 0.6, z: -0.01 },
        { y: 0.44, rx: 0.57, rz: 0.52, z: -0.01 },
        { y: 0.54, rx: 0.42, rz: 0.38, z: 0 },
        { y: 0.57, rx: 0.23, rz: 0.21, z: 0 },
        { y: 0.63, rx: 0.06, rz: 0.06, z: 0 },
      ],
    });
    expect(kit.profile).toHaveLength(DEFAULT_CHARACTER_KIT.profile.length);
    expect(kit.profile?.[0]?.y).toBe(DEFAULT_CHARACTER_KIT.profile[0]!.y);
    expect(kit.profile?.[1]?.rx).toBeGreaterThan(0.2);
    expect(kit.eyes.forward).toBe(DEFAULT_CHARACTER_KIT.eyes.forward);
  });

  it("replaces the first hair-dropped 16-ring bake with the GLB face retarget", () => {
    const kit = normalizeCharacterKit({
      profile: [
        { y: -0.73, rx: 0.06, rz: 0.06, z: 0.03 },
        { y: -0.66, rx: 0.37, rz: 0.29, z: 0.05 },
        { y: -0.62, rx: 0.61, rz: 0.48, z: 0.06 },
        { y: -0.5, rx: 0.73, rz: 0.57, z: 0.04 },
        { y: -0.39, rx: 0.76, rz: 0.59, z: 0.02 },
        { y: -0.28, rx: 0.76, rz: 0.59, z: 0 },
        { y: -0.17, rx: 0.77, rz: 0.6, z: -0.01 },
        { y: -0.05, rx: 0.78, rz: 0.61, z: -0.01 },
        { y: 0.06, rx: 0.77, rz: 0.6, z: -0.01 },
        { y: 0.17, rx: 0.74, rz: 0.58, z: -0.01 },
        { y: 0.28, rx: 0.71, rz: 0.55, z: -0.01 },
        { y: 0.4, rx: 0.66, rz: 0.51, z: -0.01 },
        { y: 0.51, rx: 0.57, rz: 0.44, z: -0.01 },
        { y: 0.62, rx: 0.42, rz: 0.33, z: 0 },
        { y: 0.66, rx: 0.23, rz: 0.18, z: 0 },
        { y: 0.73, rx: 0.06, rz: 0.06, z: 0 },
      ],
    });
    expect(kit.profile?.[0]?.y).toBe(DEFAULT_CHARACTER_KIT.profile[0]!.y);
    expect(kit.eyes.size).toBe(DEFAULT_CHARACTER_KIT.eyes.size);
    expect(kit.mouth.width).toBe(DEFAULT_CHARACTER_KIT.mouth.width);
  });

  it("replaces the pointed 14-ring egg with the hair-dropped seed profile", () => {
    const kit = normalizeCharacterKit({
      profile: [
        { y: -0.76, rx: 0.07, rz: 0.06, z: 0.2 },
        { y: -0.66, rx: 0.42, rz: 0.34, z: 0.22 },
        { y: -0.54, rx: 0.62, rz: 0.4, z: 0.12 },
        { y: -0.4, rx: 0.68, rz: 0.44, z: 0.06 },
        { y: -0.26, rx: 0.72, rz: 0.46, z: 0.04 },
        { y: -0.12, rx: 0.74, rz: 0.46, z: 0.03 },
        { y: 0.02, rx: 0.7, rz: 0.45, z: 0.01 },
        { y: 0.16, rx: 0.64, rz: 0.42, z: 0 },
        { y: 0.3, rx: 0.54, rz: 0.38, z: -0.01 },
        { y: 0.44, rx: 0.48, rz: 0.36, z: -0.01 },
        { y: 0.56, rx: 0.4, rz: 0.3, z: 0 },
        { y: 0.64, rx: 0.3, rz: 0.24, z: 0 },
        { y: 0.7, rx: 0.16, rz: 0.14, z: 0 },
        { y: 0.74, rx: 0.05, rz: 0.05, z: 0 },
      ],
    });
    expect(kit.profile).toHaveLength(16);
    const cheek = kit.profile!.reduce((best, ring) => (ring.rx > best.rx ? ring : best));
    expect(cheek.rx).toBeCloseTo(0.6, 2);
  });

  it("replaces the pre-seed 9-ring toy skull with the closed seed profile", () => {
    const kit = normalizeCharacterKit({
      profile: [
        { y: -0.7, rx: 0.2, rz: 0.18 },
        { y: -0.58, rx: 0.5, rz: 0.48 },
        { y: -0.4, rx: 0.68, rz: 0.64 },
        { y: -0.18, rx: 0.76, rz: 0.72 },
        { y: 0.04, rx: 0.78, rz: 0.74 },
        { y: 0.26, rx: 0.74, rz: 0.7 },
        { y: 0.48, rx: 0.62, rz: 0.6 },
        { y: 0.66, rx: 0.38, rz: 0.38 },
        { y: 0.76, rx: 0.08, rz: 0.08 },
      ],
    });
    expect(kit.profile).toHaveLength(DEFAULT_CHARACTER_KIT.profile.length);
    expect(kit.profile?.[0]?.rx).toBeLessThan(0.08);
    expect(kit.profile?.[kit.profile.length - 1]?.rx).toBeLessThan(0.08);
  });

  it("clamps region inflate and drops unknown heroes", () => {
    const kit = normalizeCharacterKit({
      hero: "blender_head",
      regions: { crown: 99, cheeks: -4, chin: 1 },
    });
    expect(kit.hero).toBe("toy_head_v1");
    expect(kit.regions.crown).toBe(2.4);
    expect(kit.regions.cheeks).toBe(0);
  });

  it("migrates a cap + clump recipe into a shell + tufts recipe", () => {
    const kit = normalizeCharacterKit({
      hair: {
        cap: { height: 0.2, radius: 0.6, back: -0.05 },
        clumps: [{ id: "side", position: [0.3, 0.4, 0.1], radius: 0.2, puff: 1.1 }],
      },
    });
    expect(kit.hair.hairlineY).toBeCloseTo(0.13);
    expect(kit.hair.backBias).toBeCloseTo(-0.05);
    expect(kit.hair.tufts).toEqual([
      { id: "side", position: [0.3, 0.4, 0.1], radius: 0.2, length: 0.132, tilt: [0.5, 0, 0.1] },
    ]);
  });

  it("keeps a valid tuft list Cursor can author", () => {
    const kit = normalizeCharacterKit({
      hair: {
        hairlineY: 0.3,
        overshoot: 0.05,
        backBias: -0.1,
        tufts: [{ id: "crown", position: [0, 0.8, 0], radius: 0.06, length: 0.18, tilt: [0.2, 0, 0] }],
      },
    });
    expect(kit.hair.tufts).toEqual([
      { id: "crown", position: [0, 0.8, 0], radius: 0.06, length: 0.18, tilt: [0.2, 0, 0] },
    ]);
    expect(kit.hair.hairlineY).toBe(0.3);
  });

  it("keeps Cursor sculpt strokes on the dense skull", () => {
    const kit = normalizeCharacterKit({
      sculpts: [{ id: "cheek", origin: [0.5, -0.16, 0.34], radius: 0.22, delta: [-0.03, 0, 0] }],
    });
    expect(kit.sculpts).toHaveLength(1);
    expect(kit.sculpts?.[0]?.id).toBe("cheek");
    expect(kit.sculpts?.[0]?.mode).toBe("move");
    expect(kit.sculpts?.[0]?.mirror).toBe(true);
  });
});

describe("kitFromCharacterConfig", () => {
  it("uses the registered hair recipe", () => {
    const kit = kitFromCharacterConfig({ ...DEFAULT_CHARACTER_CONFIG, hair: "hair_03" });
    expect(kit.hair).toEqual(hairPreset("hair_03"));
    expect(kit.mouth.expression).toBe("smile");
  });

  it("maps wow to an open mouth", () => {
    const kit = kitFromCharacterConfig({ ...DEFAULT_CHARACTER_CONFIG, face: "face_03" });
    expect(kit.eyes.open).toBe(true);
    expect(kit.mouth.expression).toBe("wow");
  });

  it("applies big-eyes face layout, not only expression", () => {
    const kit = kitFromCharacterConfig({ ...DEFAULT_CHARACTER_CONFIG, face: "face_04" });
    expect(kit.eyes.size).toBeGreaterThan(1.4);
    expect(kit.mouth.expression).toBe("smile");
  });

  it("loads fringe and fluffy hair recipes", () => {
    expect(hairPreset("hair_07")?.tufts).toHaveLength(3);
    expect(hairPreset("hair_10")?.tufts.length).toBeGreaterThan(3);
    const kit = kitFromCharacterConfig({ ...DEFAULT_CHARACTER_CONFIG, hair: "hair_09" });
    expect(kit.hair.tufts.map((tuft) => tuft.id)).toEqual(["tail_left", "tail_right", "crown"]);
  });
});
