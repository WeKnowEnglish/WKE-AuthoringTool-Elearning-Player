import { describe, expect, it } from "vitest";
import {
  appDiagnosticBatchSchema,
  sanitizeDiagnosticMetadata,
  sanitizeDiagnosticRoute,
} from "@/lib/app-diagnostics/schema";

describe("central app diagnostics schema", () => {
  it("accepts a bounded authenticated event batch", () => {
    const result = appDiagnosticBatchSchema.safeParse({
      events: [{
        id: "event-12345678",
        sessionId: "session-1",
        deviceId: "device-1",
        at: Date.now(),
        surface: "student",
        phase: "activity",
        name: "activity_started",
        kind: "mark",
        activityId: "vocab-food-fruit",
      }],
    });
    expect(result.success).toBe(true);
  });

  it("removes query strings and sensitive metadata", () => {
    expect(sanitizeDiagnosticRoute("/login?next=/primary&secret=1234")).toBe("/login");
    expect(sanitizeDiagnosticMetadata({
      status: 500,
      password: "1234",
      error: "private stack detail",
      timeToHeadersMs: 400,
    })).toEqual({ status: 500, timeToHeadersMs: 400 });
  });
});
