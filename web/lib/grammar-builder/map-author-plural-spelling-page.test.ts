import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getPosterSectionWrapperClass } from "./poster-page-layout";
import { mapPosterModule } from "./map-poster-module";
import { parseGrammarModule } from "./validate-module";

const FIXTURE_PATH = join(
  process.cwd(),
  "docs/grammar-module/examples/plural-spelling-page-shell.json",
);

describe("mapPosterModule plural spelling page shell", () => {
  it("maps plural-spelling-page-shell.json", () => {
    const raw = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
    const module = parseGrammarModule(raw, { posterContentRules: false });
    const view = mapPosterModule(module);

    expect(module.pageLayout).toBe("four-card-grid-then-split");
    expect(view.sections).toHaveLength(6);
    expect(view.sections[0]?.internalLayout).toBe("full_width");
    expect(view.sections[4]?.internalLayout).toBe("comparison");
    expect(view.sections[5]?.comparisonRight?.title).toBe("Exceptions (+s)");
  });

  it("does not span cards on four-card-grid-then-split", () => {
    for (let index = 0; index < 6; index += 1) {
      expect(getPosterSectionWrapperClass(index, "four-card-grid-then-split", 6)).toBeUndefined();
    }
  });
});
