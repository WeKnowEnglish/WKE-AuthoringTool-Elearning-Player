import { describe, expect, it } from "vitest";
import { loadoutForPreset } from "@/lib/avatar/defaults";
import { migrateProgressSnapshotFields } from "@/lib/progress/migrate-pet-player";
import { emptySnapshot, type ProgressSnapshotV1 } from "@/lib/progress/types";

describe("migrateProgressSnapshotFields", () => {
  it("copies legacy avatar loadout to petLoadout", () => {
    const base = emptySnapshot("test");
    base.avatarLoadout = loadoutForPreset("fox");
    const { snapshot, changed } = migrateProgressSnapshotFields(base);
    expect(changed).toBe(true);
    expect(snapshot.petLoadout).toEqual(loadoutForPreset("fox"));
    expect(snapshot.playerAppearanceId).toBe("default");
  });

  it("sets default player appearance when missing", () => {
    const base = emptySnapshot("test");
    base.petLoadout = loadoutForPreset("robot");
    base.playerAppearanceId = null;
    const { snapshot, changed } = migrateProgressSnapshotFields(base);
    expect(changed).toBe(true);
    expect(snapshot.playerAppearanceId).toBe("default");
  });

  it("is unchanged when already migrated", () => {
    const base: ProgressSnapshotV1 = {
      ...emptySnapshot("test"),
      petLoadout: loadoutForPreset("alien"),
      playerAppearanceId: "default",
      avatarLoadout: null,
      avatarId: null,
    };
    const { changed } = migrateProgressSnapshotFields(base);
    expect(changed).toBe(false);
  });
});
