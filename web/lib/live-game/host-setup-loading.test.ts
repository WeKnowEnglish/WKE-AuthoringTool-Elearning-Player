import { describe, expect, it } from "vitest";
import {
  canCreateHostRoom,
  reconcileSelectedClassId,
  resolveHostClassLoadState,
  resolveHostSetsLoadState,
  shouldLoadClassesEagerly,
} from "@/lib/live-game/host-setup-loading";

describe("host setup progressive loading helpers", () => {
  it("keeps set states distinct", () => {
    expect(resolveHostSetsLoadState({ loading: true, error: null, count: 0 })).toBe("loading");
    expect(resolveHostSetsLoadState({ loading: false, error: "boom", count: 0 })).toBe("error");
    expect(resolveHostSetsLoadState({ loading: false, error: null, count: 0 })).toBe("empty");
    expect(resolveHostSetsLoadState({ loading: false, error: null, count: 2 })).toBe("ready");
  });

  it("keeps class states distinct and idle until requested", () => {
    expect(
      resolveHostClassLoadState({ requested: false, loading: false, error: null, count: 0 }),
    ).toBe("idle");
    expect(
      resolveHostClassLoadState({ requested: true, loading: true, error: null, count: 0 }),
    ).toBe("loading");
    expect(
      resolveHostClassLoadState({ requested: true, loading: false, error: "nope", count: 0 }),
    ).toBe("error");
    expect(
      resolveHostClassLoadState({ requested: true, loading: false, error: null, count: 0 }),
    ).toBe("empty");
    expect(
      resolveHostClassLoadState({ requested: true, loading: false, error: null, count: 3 }),
    ).toBe("ready");
  });

  it("never blocks room creation on class loading", () => {
    expect(
      canCreateHostRoom({
        isSubmitting: false,
        setsLoading: false,
        selectedQuestionSetId: "set-1",
        classesLoading: true,
      }),
    ).toBe(true);
    expect(
      canCreateHostRoom({
        isSubmitting: false,
        setsLoading: true,
        selectedQuestionSetId: "set-1",
        classesLoading: false,
      }),
    ).toBe(false);
    expect(
      canCreateHostRoom({
        isSubmitting: false,
        setsLoading: false,
        selectedQuestionSetId: null,
        classesLoading: false,
      }),
    ).toBe(false);
  });

  it("preserves a selected class across reconcile when still available", () => {
    expect(
      reconcileSelectedClassId("class-a", [
        { id: "class-a", title: "A" },
        { id: "class-b", title: "B" },
      ]),
    ).toBe("class-a");
    expect(reconcileSelectedClassId("gone", [{ id: "class-a", title: "A" }])).toBe("");
  });

  it("eager-loads classes only when deep-linked with a class id", () => {
    expect(shouldLoadClassesEagerly("")).toBe(false);
    expect(shouldLoadClassesEagerly("  ")).toBe(false);
    expect(shouldLoadClassesEagerly("class-1")).toBe(true);
  });
});
