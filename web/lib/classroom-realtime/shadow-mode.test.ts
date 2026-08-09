import { afterEach, describe, expect, it } from "vitest";
import { classroomRealtimeShadowModeEnabled } from "@/lib/classroom-realtime/shadow-mode";

const original = process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE;

afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE;
  else process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = original;
});
describe("classroom realtime shadow-mode flag", () => {
  it("is disabled unless explicitly enabled", () => {
    delete process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE;
    expect(classroomRealtimeShadowModeEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE = "true";
    expect(classroomRealtimeShadowModeEnabled()).toBe(true);
  });
});
