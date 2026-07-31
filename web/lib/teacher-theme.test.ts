import { describe, expect, it } from "vitest";
import {
  TEACHER_THEME_DEFAULT,
  createTeacherThemePreset,
  defaultTeacherThemePresetName,
} from "./teacher-theme";

describe("teacher theme defaults and presets", () => {
  it("defaults to light purple across the teacher ecosystem", () => {
    expect(TEACHER_THEME_DEFAULT).toEqual({ mode: "light", tint: "purple" });
  });

  it("names presets from mode and tint labels", () => {
    expect(defaultTeacherThemePresetName(TEACHER_THEME_DEFAULT)).toBe("Light · Purple");
  });

  it("creates a clipped named preset from the active selection", () => {
    const preset = createTeacherThemePreset("  Morning desk  ", {
      mode: "sepia",
      tint: "orange",
    }, "preset-test");
    expect(preset).toEqual({
      id: "preset-test",
      name: "Morning desk",
      mode: "sepia",
      tint: "orange",
    });
  });
});
