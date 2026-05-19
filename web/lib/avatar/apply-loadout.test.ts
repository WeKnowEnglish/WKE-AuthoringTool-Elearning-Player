import { describe, expect, it } from "vitest";
import {
  itemGroupId,
  normalizeLoadout,
  resolveEquippedGroupIds,
} from "@/lib/avatar/apply-loadout";
import { AVATAR_PRESET_LOADOUTS, DEFAULT_AVATAR_LOADOUT } from "@/lib/avatar/defaults";
import {
  migrateLegacyLoadout,
  presetIdForLoadout,
  resolveAvatarLoadout,
} from "@/lib/avatar/progress";

describe("normalizeLoadout", () => {
  it("fills missing fields with defaults", () => {
    expect(normalizeLoadout({ top: "fox" })).toMatchObject({
      top: "fox",
      hair: DEFAULT_AVATAR_LOADOUT.hair,
    });
  });
});

describe("resolveEquippedGroupIds", () => {
  it("maps slots to svg group ids", () => {
    const ids = resolveEquippedGroupIds(AVATAR_PRESET_LOADOUTS.robot);
    expect(ids.top).toBe(itemGroupId("top", "robot"));
    expect(ids.hair).toBe(itemGroupId("hair", "spiky"));
    expect(ids.hat).toBeNull();
    expect(ids.accessory).toBe("item-accessory-none");
  });
});

describe("resolveAvatarLoadout", () => {
  it("migrates legacy star avatarId to alien loadout", () => {
    expect(resolveAvatarLoadout(null, "star")).toEqual(AVATAR_PRESET_LOADOUTS.alien);
  });

  it("prefers stored loadout over avatarId", () => {
    const custom = { ...DEFAULT_AVATAR_LOADOUT, top: "hoodie" };
    expect(resolveAvatarLoadout(custom, "fox").top).toBe("hoodie");
  });
});

describe("presetIdForLoadout", () => {
  it("detects fox robot alien presets", () => {
    expect(presetIdForLoadout(AVATAR_PRESET_LOADOUTS.fox)).toBe("fox");
    expect(presetIdForLoadout(AVATAR_PRESET_LOADOUTS.alien)).toBe("alien");
    expect(presetIdForLoadout({ ...DEFAULT_AVATAR_LOADOUT, top: "hoodie" })).toBeNull();
  });
});

describe("migrateLegacyLoadout", () => {
  it("maps old star top to alien preset", () => {
    expect(migrateLegacyLoadout({ ...DEFAULT_AVATAR_LOADOUT, top: "star" })).toEqual(
      AVATAR_PRESET_LOADOUTS.alien,
    );
  });

  it("maps old fox top-only to full fox preset", () => {
    expect(
      migrateLegacyLoadout({
        ...DEFAULT_AVATAR_LOADOUT,
        top: "fox",
      }),
    ).toEqual(AVATAR_PRESET_LOADOUTS.fox);
  });
});

describe("shouldHideBaseFace", () => {
  it("hides human face for fox and alien accessories", async () => {
    const { shouldHideBaseFace } = await import("@/lib/avatar/apply-loadout");
    expect(shouldHideBaseFace(AVATAR_PRESET_LOADOUTS.fox)).toBe(true);
    expect(shouldHideBaseFace(AVATAR_PRESET_LOADOUTS.alien)).toBe(true);
    expect(shouldHideBaseFace(AVATAR_PRESET_LOADOUTS.robot)).toBe(false);
  });
});
