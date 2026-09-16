import { describe, expect, it } from "vitest";
import { houseModulesForLevel } from "@/components/world/campus/house/house-upgrades";

describe("houseModulesForLevel", () => {
  it("keeps the starter cottage at level 1", () => {
    expect(houseModulesForLevel(1)).toEqual([
      "body",
      "roof",
      "chimney",
      "door",
      "windows",
      "planters",
      "mailbox",
      "path",
    ]);
  });

  it("adds porch modules at level 2 without dropping the starter", () => {
    const modules = houseModulesForLevel(2);
    expect(modules).toContain("body");
    expect(modules).toContain("porch");
    expect(modules).toContain("lantern");
    expect(modules).toContain("garden");
    expect(modules).not.toContain("wing");
  });

  it("adds the wing and turret at level 3", () => {
    const modules = houseModulesForLevel(3);
    expect(modules).toContain("porch");
    expect(modules).toContain("wing");
    expect(modules).toContain("turret");
    expect(modules).toContain("dormer");
  });
});
