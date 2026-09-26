import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Next deployment output mode", () => {
  it("keeps managed hosting on the normal Next.js server and Docker on standalone", () => {
    const config = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
    expect(config).toContain("process.env.WKE_MANAGED_HOSTING?.trim()");
    expect(config).toContain("process.env.VERCEL?.trim()");
    expect(config).toContain(
      'const nextOutputMode: "standalone" | undefined = managedRuntime ? undefined : "standalone"',
    );
    expect(config).toContain('nextOutputMode === "standalone" ? repositoryRoot : undefined');
  });
});
