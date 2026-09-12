import { describe, expect, it } from "vitest";
import { homeworkFinalizationDiagnosticName } from "./diagnostics";

describe("homework finalization diagnostics", () => {
  it("distinguishes each safe operational outcome", () => {
    expect(homeworkFinalizationDiagnosticName({ ok: false })).toBe("submit_failed");
    expect(homeworkFinalizationDiagnosticName({ ok: true })).toBe("submit_succeeded");
    expect(homeworkFinalizationDiagnosticName({
      ok: true,
      receipt: { homeworkId: "h", format: "writing_prompt", status: "submitted", submittedAt: "s", completedAt: "c", duplicate: true, reconciled: false },
    })).toBe("duplicate_prevented");
    expect(homeworkFinalizationDiagnosticName({
      ok: true,
      receipt: { homeworkId: "h", format: "graded_track", status: "submitted", submittedAt: "s", completedAt: "c", duplicate: true, reconciled: true },
    })).toBe("reconciliation_succeeded");
  });
});
