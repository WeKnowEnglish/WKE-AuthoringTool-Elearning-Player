import { describe, expect, it } from "vitest";
import { join, resolve } from "node:path";
import { readFileSync } from "node:fs";
// @ts-expect-error JavaScript deployment script has no separate declaration file.
import { validateWebWorkspace } from "../../scripts/check-web-workspace.mjs";

describe("web workspace layout", () => {
  it("runs before the Next build", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
      scripts: { prebuild: string };
    };
    expect(pkg.scripts.prebuild.startsWith("node ./scripts/check-web-workspace.mjs")).toBe(true);
  });

  it("accepts the real monorepo checkout", () => {
    expect(validateWebWorkspace(process.cwd())).toEqual([]);
  });

  it("fails when sibling packages are missing", () => {
    const errors = validateWebWorkspace("/tmp/only-web", {
      exists: () => false,
    });
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("explore-hotspots-play");
    expect(errors[1]).toContain("explore-hotspots-author");
    expect(errors[0]).toContain("root directory to web/");
  });

  it("checks package.json next to web/", () => {
    const webRoot = resolve("/repo/web");
    const seen: string[] = [];
    validateWebWorkspace(webRoot, {
      exists: (path: string) => {
        seen.push(path);
        return true;
      },
    });
    expect(seen).toEqual([
      join(webRoot, "..", "packages", "explore-hotspots-play", "package.json"),
      join(webRoot, "..", "packages", "explore-hotspots-author", "package.json"),
    ]);
  });
});
