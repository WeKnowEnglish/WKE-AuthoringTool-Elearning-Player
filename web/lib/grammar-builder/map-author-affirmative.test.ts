import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mapPosterModule } from "./map-poster-module";
import { parseGrammarModule } from "./validate-module";

const AUTHOR_FIXTURE_PATH = join(
  process.cwd(),
  "docs/grammar-module/examples/there-is-there-are.json",
);

describe("mapPosterModule author affirmative fixture", () => {
  it("maps there-is-there-are.json with showcase displayMode", () => {
    const raw = JSON.parse(readFileSync(AUTHOR_FIXTURE_PATH, "utf8"));
    const module = parseGrammarModule(raw, { posterContentRules: false });
    const view = mapPosterModule(module);

    expect(module.displayMode).toBe("showcase");
    expect(view.sections).toHaveLength(3);
    expect(view.sections[0]?.internalLayout).toBe("three_column");
    expect(view.sections[0]?.columns).toHaveLength(3);
    expect(view.sections[0]?.subHeader?.label).toBe("SINGULAR");
    expect(view.sections[1]?.internalLayout).toBe("three_column");
    expect(view.sections[2]?.internalLayout).toBe("full_width_split");
    expect(view.sections[2]?.leftPanel?.body).toContain("THERE'S");
    expect(view.sections[2]?.rightPanel?.warning).toContain("There're");
  });
});
