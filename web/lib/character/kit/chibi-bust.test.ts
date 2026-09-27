import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { buildHeroObject, disposeHeroObject } from "./build-hero-object";
import { CHIBI_BUST_KIT, CHIBI_BUST_PROFILE, isChibiBustHero } from "./chibi-bust";
import { findHero, isRegisteredHero } from "./hero-assets";
import { normalizeCharacterKit } from "./kit-normalize";
import { CHIBI_BUST_HERO_ID } from "./kit-types";

describe("chibi vinyl bust", () => {
  it("registers as a selectable procedural hero", () => {
    expect(isRegisteredHero(CHIBI_BUST_HERO_ID)).toBe(true);
    expect(findHero(CHIBI_BUST_HERO_ID).blankBust).toBe(true);
    expect(isChibiBustHero(CHIBI_BUST_HERO_ID)).toBe(true);
    expect(normalizeCharacterKit({ hero: CHIBI_BUST_HERO_ID }).hero).toBe(CHIBI_BUST_HERO_ID);
  });

  it("builds a blank bust with concha ears and pedestal neck", () => {
    const group = buildHeroObject(CHIBI_BUST_KIT);
    expect(group.getObjectByName("heroSkull")).toBeTruthy();
    expect(group.getObjectByName("kitFace")).toBeFalsy();
    expect(group.getObjectByName("leftEar")).toBeTruthy();
    expect(group.getObjectByName("rightEar")).toBeTruthy();
    expect(group.getObjectByName("heroPedestal")).toBeTruthy();
    expect(group.getObjectByName("kitHair")).toBeFalsy();
    const cheek = CHIBI_BUST_PROFILE.reduce((best, ring) => (ring.rx > best.rx ? ring : best));
    expect(cheek.y).toBeLessThan(0);
    expect(cheek.rx).toBeGreaterThan(0.55);
    const size = new Box3().setFromObject(group).getSize(new Vector3());
    expect(size.y).toBeGreaterThan(1.4);
    disposeHeroObject(group);
  });
});
