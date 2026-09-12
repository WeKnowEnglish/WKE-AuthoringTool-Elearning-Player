import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveNextOutputMode } from "./next-output-mode";

describe("Next deployment output mode", () => {
  it("lets Vercel's adapter own deployment packaging", () => {
    expect(resolveNextOutputMode({ vercel: "1" })).toBeUndefined();
  });

  it("keeps standalone output for local and self-hosted builds", () => {
    expect(resolveNextOutputMode({})).toBe("standalone");
    expect(resolveNextOutputMode({ vercel: "" })).toBe("standalone");
  });

  it("wires the environment decision into next.config.ts", () => {
    const config = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
    expect(config).toContain(
      "output: resolveNextOutputMode({ vercel: process.env.VERCEL })",
    );
  });
});
