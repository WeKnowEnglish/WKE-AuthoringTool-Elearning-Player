import { describe, expect, it, vi } from "vitest";

const recordAppDiagnostic = vi.fn();
vi.mock("@/lib/app-diagnostics/client", () => ({ recordAppDiagnostic }));

describe("homework journey diagnostics", () => {
  it("records only stable correlation and synthetic metadata", async () => {
    const { recordHomeworkJourneyEvent } = await import("./diagnostics");
    recordHomeworkJourneyEvent({
      surface: "student",
      name: "submit_settled",
      homeworkId: "11111111-1111-4111-8111-111111111111",
      classId: "22222222-2222-4222-8222-222222222222",
      status: "succeeded",
      durationMs: 420,
      synthetic: true,
    });
    expect(recordAppDiagnostic).toHaveBeenCalledWith(
      "student",
      "homework_journey",
      "submit_settled",
      { correlation: "homework_id", synthetic: true },
      expect.objectContaining({ kind: "span", durationMs: 420, status: "succeeded" }),
    );
    expect(JSON.stringify(recordAppDiagnostic.mock.calls)).not.toMatch(/answer|response|text|email|password/i);
  });
});
