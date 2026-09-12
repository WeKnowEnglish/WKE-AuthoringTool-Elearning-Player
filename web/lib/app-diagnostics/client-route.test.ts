import { describe, expect, it } from "vitest";
import { shouldDeferAppDiagnosticFlush } from "./client";

describe("diagnostic persistence route timing", () => {
  it.each(["/login", "/primary/login", "/secondary/login"])(
    "defers authenticated uploads while on %s",
    (pathname) => {
      expect(shouldDeferAppDiagnosticFlush(pathname)).toBe(true);
    },
  );

  it.each(["/primary", "/secondary", "/primary/homework/example"])(
    "allows queued uploads after navigation to %s",
    (pathname) => {
      expect(shouldDeferAppDiagnosticFlush(pathname)).toBe(false);
    },
  );
});
