import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { buildHeadGeometryFromProfile, profileHeadTriangleCount, profileHeadVertexCount } from "./build-head-geometry";
import { buildHeroObject, disposeHeroObject } from "./build-hero-object";
import { applyProfileRegions, DEFAULT_HEAD_PROFILE, densifyProfileRings } from "./head-profile";
import { DEFAULT_CHARACTER_KIT } from "./kit-defaults";
import { normalizeCharacterKit } from "./kit-normalize";

describe("head profile mesher", () => {
  it("builds a watertight skull from Cursor-authored rings", () => {
    const geometry = buildHeadGeometryFromProfile(DEFAULT_HEAD_PROFILE);
    expect(geometry.attributes.position.count).toBe(profileHeadVertexCount());
    expect(geometry.getIndex()!.count / 3).toBe(profileHeadTriangleCount());
    expect(geometry.getIndex()!.count / 3).toBeGreaterThan(20000);
    const size = new Box3().setFromBufferAttribute(geometry.attributes.position).getSize(new Vector3());
    expect(size.y).toBeGreaterThan(1.2);
    expect(size.x).toBeGreaterThan(1.05);
    expect(size.y / size.x).toBeGreaterThan(0.95);
    const maxRx = Math.max(...DEFAULT_HEAD_PROFILE.map((ring) => ring.rx));
    const maxRz = Math.max(...DEFAULT_HEAD_PROFILE.map((ring) => ring.rz));
    expect(maxRz / maxRx).toBeLessThan(0.9);
    expect(DEFAULT_HEAD_PROFILE).toHaveLength(16);
    expect(DEFAULT_HEAD_PROFILE[1]!.rx).toBeGreaterThan(0.2);
    expect(DEFAULT_HEAD_PROFILE[1]!.z).toBeGreaterThan(0.02);
    expect(DEFAULT_HEAD_PROFILE[1]!.z).toBeLessThan(0.08);
    const cheek = DEFAULT_HEAD_PROFILE.reduce((best, ring) => (ring.rx > best.rx ? ring : best));
    expect(cheek.y).toBeLessThan(0.05);
    const temple = DEFAULT_HEAD_PROFILE.find((ring) => ring.y > 0.12 && ring.y < 0.32)!;
    expect(temple.rx).toBeLessThan(cheek.rx + 0.02);
    expect(cheek.rx).toBeCloseTo(0.6, 2);
    expect(cheek.rx).toBeLessThan(0.64);
    const dome = DEFAULT_HEAD_PROFILE.find((ring) => ring.y > 0.5 && ring.y < 0.6)!;
    expect(dome.rx).toBeGreaterThan(0.35);
    const counts = new Map<string, number>();
    const index = geometry.getIndex()!.array;
    for (let i = 0; i < index.length; i += 3) {
      const tri = [index[i]!, index[i + 1]!, index[i + 2]!];
      for (let edge = 0; edge < 3; edge += 1) {
        const a = tri[edge]!;
        const b = tri[(edge + 1) % 3]!;
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    expect([...counts.values()].filter((count) => count === 1)).toHaveLength(0);
    expect(DEFAULT_HEAD_PROFILE[0]!.rx).toBeLessThan(0.08);
    expect(DEFAULT_HEAD_PROFILE[DEFAULT_HEAD_PROFILE.length - 1]!.rx).toBeLessThan(0.08);
    const dense = densifyProfileRings(DEFAULT_HEAD_PROFILE, 96);
    expect(dense).toHaveLength(96);
    expect(dense[0]!.rx).toBeCloseTo(DEFAULT_HEAD_PROFILE[0]!.rx);
    expect(dense[dense.length - 1]!.rx).toBeCloseTo(DEFAULT_HEAD_PROFILE[DEFAULT_HEAD_PROFILE.length - 1]!.rx);
    geometry.dispose();
  });

  it("crown inflate raises the silhouette", () => {
    const low = applyProfileRegions(DEFAULT_HEAD_PROFILE, { crown: 0, cheeks: 1, chin: 1 });
    const high = applyProfileRegions(DEFAULT_HEAD_PROFILE, { crown: 2.4, cheeks: 1, chin: 1 });
    expect(high[high.length - 1]!.y).toBeGreaterThan(low[low.length - 1]!.y);
  });
});

describe("buildHeroObject", () => {
  it("assembles a named head Cursor can export", () => {
    const group = buildHeroObject(DEFAULT_CHARACTER_KIT);
    expect(group.name).toBe("characterKitHead");
    expect(group.getObjectByName("heroSkull")).toBeTruthy();
    expect(group.getObjectByName("kitFace")).toBeTruthy();
    expect(group.getObjectByName("hairShell")).toBeTruthy();
    expect(group.getObjectByName("tuft_top")).toBeTruthy();
    expect(DEFAULT_CHARACTER_KIT.eyes.size).toBeGreaterThan(0.85);
    expect(DEFAULT_CHARACTER_KIT.mouth.width).toBeGreaterThan(0.95);
    disposeHeroObject(group);
  });

  it("keeps a custom profile Cursor wrote from a photo", () => {
    const kit = normalizeCharacterKit({
      profile: [
        { y: -0.6, rx: 0.3, rz: 0.28 },
        { y: 0, rx: 0.9, rz: 0.5 },
        { y: 0.7, rx: 0.2, rz: 0.2 },
      ],
    });
    expect(kit.profile).toHaveLength(3);
    expect(kit.profile?.[1]?.rx).toBe(0.9);
  });
});
