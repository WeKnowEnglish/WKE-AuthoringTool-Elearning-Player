import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getPosterSectionWrapperClass } from "./poster-page-layout";
import { mapPosterModule } from "./map-poster-module";
import { parseGrammarModule } from "./validate-module";

const FIXTURE_PATH = join(
  process.cwd(),
  "docs/grammar-module/examples/some-and-any-author.json",
);

describe("mapPosterModule some and any author fixture", () => {
  it("maps some-and-any-author.json", () => {
    const raw = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
    const module = parseGrammarModule(raw, { posterContentRules: false });
    const view = mapPosterModule(module);

    expect(module.pageLayout).toBe("two-by-two-then-full");
    expect(view.sections).toHaveLength(5);
    expect(view.sections[0]?.internalLayout).toBe("two_equal");
    expect(view.sections[4]?.internalLayout).toBe("summary_grid");
    expect(view.sections[4]?.summaryGrid?.columns).toHaveLength(2);
  });

  it("spans the summary card full width on two-by-two-then-full", () => {
    expect(getPosterSectionWrapperClass(4, "two-by-two-then-full", 5)).toBe("sm:col-span-2");
    expect(getPosterSectionWrapperClass(0, "two-by-two-then-full", 5)).toBeUndefined();
  });
});
