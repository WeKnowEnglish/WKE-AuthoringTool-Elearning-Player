import { describe, expect, it } from "vitest";
import { loadoutForPreset } from "@/lib/avatar/defaults";
import { resolvePetLoadoutFromSnapshot } from "@/lib/progress/resolve-pet-loadout";
import { emptySnapshot } from "@/lib/progress/types";

describe("resolvePetLoadoutFromSnapshot", () => {
  it("prefers petLoadout over legacy avatar fields", () => {
    const snap = emptySnapshot("test");
    snap.petLoadout = loadoutForPreset("robot");
    snap.avatarLoadout = loadoutForPreset("fox");
    expect(resolvePetLoadoutFromSnapshot(snap)).toEqual(loadoutForPreset("robot"));
  });

  it("falls back to legacy avatar loadout", () => {
    const snap = emptySnapshot("test");
    snap.avatarLoadout = loadoutForPreset("alien");
    expect(resolvePetLoadoutFromSnapshot(snap)).toEqual(loadoutForPreset("alien"));
  });

  it("returns null when nothing chosen", () => {
    expect(resolvePetLoadoutFromSnapshot(emptySnapshot("test"))).toBeNull();
  });
});
