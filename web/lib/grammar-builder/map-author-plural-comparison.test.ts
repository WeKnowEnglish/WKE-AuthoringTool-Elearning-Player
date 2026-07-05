import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mapPosterModule } from "./map-poster-module";
import { parseGrammarModule } from "./validate-module";

const FIXTURE_PATH = join(
  process.cwd(),
  "docs/grammar-module/examples/plural-spelling-comparison.json",
);

describe("mapPosterModule plural spelling comparison fixture", () => {
  it("maps plural-spelling-comparison.json", () => {
    const raw = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
    const module = parseGrammarModule(raw, { posterContentRules: false });
    const view = mapPosterModule(module);

    expect(view.sections).toHaveLength(2);
    expect(view.sections[0]?.internalLayout).toBe("comparison");
    expect(view.sections[0]?.comparisonLeft?.items[0]?.sentence).toBe("leaf → leaves");
    expect(view.sections[1]?.internalLayout).toBe("comparison");
    expect(view.sections[1]?.comparisonRight?.title).toBe("Exceptions (+s)");
  });
});
