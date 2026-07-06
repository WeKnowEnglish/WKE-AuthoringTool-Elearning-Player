import { describe, expect, it } from "vitest";
import { LAYOUT_LAB_BY_LAYOUT_TYPE } from "./layout-lab-index";
import { loadAllLayoutLabCards, loadLayoutLabCard } from "./load-layout-lab-card";

describe("layout-lab-index", () => {
  it("covers all nine layoutType values", () => {
    const layoutTypes = LAYOUT_LAB_BY_LAYOUT_TYPE.map((entry) => entry.layoutType);
    expect(new Set(layoutTypes).size).toBe(9);
    expect(layoutTypes).toContain("summary-grid");
    expect(layoutTypes).toContain("four-card-grid");
  });

  it("loads each indexed fixture card", () => {
    for (const entry of LAYOUT_LAB_BY_LAYOUT_TYPE) {
      const view = loadLayoutLabCard(entry);
      expect(view.section.kidTitle.length).toBeGreaterThan(0);
      expect(view.section.layoutType).toBe(entry.layoutType);
    }
  });

  it("loads all cards without error", () => {
    expect(loadAllLayoutLabCards()).toHaveLength(9);
  });
});
