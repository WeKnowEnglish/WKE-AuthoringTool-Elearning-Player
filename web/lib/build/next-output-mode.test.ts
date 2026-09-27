import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Next deployment output mode", () => {
  it("keeps Vercel on adapter output and self-hosted targets on standalone", () => {
    const config = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
    expect(config).toContain("process.env.VERCEL?.trim()");
    expect(config).toContain(
      'const nextOutputMode: "standalone" | undefined = vercelRuntime ? undefined : "standalone"',
    );
    expect(config).toContain('nextOutputMode === "standalone" ? repositoryRoot : undefined');
  });

  it("packages and starts the managed-hosting standalone server", () => {
    const rootPackage = JSON.parse(
      readFileSync(resolve(process.cwd(), "..", "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    const webPackage = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    const packagingScript = readFileSync(
      resolve(process.cwd(), "scripts", "prepare-managed-standalone.mjs"),
      "utf8",
    );

    expect(rootPackage.scripts.start).toContain("web/.next/standalone/server.js");
    expect(packagingScript).toContain('process.env.HOSTNAME = "0.0.0.0"');
    expect(packagingScript).toContain('require("./web/server.js")');
    expect(webPackage.scripts["build:managed"]).toBe("next build --webpack");
    expect(webPackage.scripts["postbuild:managed"]).toBe(
      "node ./scripts/prepare-managed-standalone.mjs",
    );
  });
});
