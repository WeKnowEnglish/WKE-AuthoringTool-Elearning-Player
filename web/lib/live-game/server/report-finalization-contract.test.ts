import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Live Game report finalization contract", () => {
  it("does not create a report round while finalizing a repeated completion", () => {
    const source = readFileSync(
      new URL("./report-repository.ts", import.meta.url),
      "utf8",
    );
    const finalizer = source.slice(
      source.indexOf("export async function finalizeLiveGameReportRound"),
      source.indexOf("export async function loadLatestCompletedLiveGameReportRound"),
    );

    expect(finalizer).toContain('.eq("status", "active")');
    expect(finalizer).toContain("if (!activeRound?.id) return");
    expect(finalizer).not.toContain("ensureActiveLiveGameReportRound(");
  });
});
