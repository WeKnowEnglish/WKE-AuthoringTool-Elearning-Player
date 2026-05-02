import { describe, expect, it } from "vitest";
import { parseScreensWithDiagnostics } from "./gemini";

describe("parseScreensWithDiagnostics", () => {
  it("keeps valid rows and reports invalid story rows", () => {
    const {
      screens,
      parseWarnings,
      modelScreensArrayLength,
      validatedScreenCount,
      failedScreens,
    } = parseScreensWithDiagnostics({
      screens: [
        {
          screen_type: "story",
          payload: {
            type: "story",
            body_text: " ",
            pages: [
              {
                id: "p1",
                phases: [
                  { id: "a", is_start: true },
                  { id: "b", is_start: true },
                ],
              },
            ],
          },
        },
        {
          screen_type: "interaction",
          payload: {
            type: "interaction",
            subtype: "mc_quiz",
            question: "Q?",
            options: [{ id: "x", label: "Yes" }],
            correct_option_id: "x",
            shuffle_options: true,
            quiz_group_id: "g",
            quiz_group_title: "T",
            quiz_group_order: 0,
          },
        },
      ],
    });
    expect(screens.length).toBe(1);
    expect(screens[0].screen_type).toBe("interaction");
    expect(parseWarnings.length).toBeGreaterThan(0);
    expect(parseWarnings.some((w) => w.includes("story"))).toBe(true);
    expect(modelScreensArrayLength).toBe(2);
    expect(validatedScreenCount).toBe(1);
    expect(failedScreens.length).toBe(1);
    expect(failedScreens[0].modelIndex).toBe(0);
    expect(failedScreens[0].screen_type).toBe("story");
    expect(failedScreens[0].issues.length).toBeGreaterThan(0);
  });

  it("throws when every row fails", () => {
    expect(() =>
      parseScreensWithDiagnostics({
        screens: [{ screen_type: "interaction", payload: { type: "interaction" } }],
      }),
    ).toThrow(/No valid screens parsed/);
  });
});
