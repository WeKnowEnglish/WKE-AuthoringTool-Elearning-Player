import { describe, expect, it } from "vitest";
import { LAYOUT_LAB_BY_LAYOUT_TYPE } from "../layout-lab-index";
import { getLayoutTypeScaffold, mergeCardLayoutScaffold } from "./layout-type-scaffolds";
import { safeParseGrammarModule } from "../validate-module";

describe("layout-type-scaffolds", () => {
  it("provides a valid scaffold for every layout type", () => {
    for (const entry of LAYOUT_LAB_BY_LAYOUT_TYPE) {
      const scaffold = getLayoutTypeScaffold(entry.layoutType);
      expect(scaffold.layoutType).toBe(entry.layoutType);

      const parsed = safeParseGrammarModule(
        {
          moduleTitle: "TEST",
          displayMode: "showcase",
          pageLayout: "single-column",
          cards: [scaffold],
        },
        { posterContentRules: false },
      );
      expect(parsed.success).toBe(true);
    }
  });

  it("merge preserves card chrome", () => {
    const scaffold = getLayoutTypeScaffold("two-equal");
    const merged = mergeCardLayoutScaffold(
      {
        ...scaffold,
        id: 9,
        title: "KEEP",
        kidTitle: "Kid",
        theme: "mint-green",
        glanceRule: { text: "Rule" },
      },
      "banner",
    );
    expect(merged.id).toBe(9);
    expect(merged.kidTitle).toBe("Kid");
    expect(merged.layoutType).toBe("banner");
    expect(merged.bannerText).toBeTruthy();
  });
});
