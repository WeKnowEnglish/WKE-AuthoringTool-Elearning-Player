"use client";

import {
  TEACHER_MODE_LABELS,
  TEACHER_THEME_MODES,
  TEACHER_THEME_TINTS,
  TEACHER_TINT_LABELS,
  type TeacherThemeMode,
  type TeacherThemeSelection,
  type TeacherThemeTint,
} from "@/lib/teacher-theme";

type Props = {
  value: TeacherThemeSelection;
  onChange: (next: TeacherThemeSelection) => void;
  compact?: boolean;
};

export function TeacherThemeControls({ value, onChange, compact = false }: Props) {
  return (
    <div
      className={`teacher-theme-controls flex flex-wrap items-center gap-1.5 rounded-lg border px-1.5 py-1 ${
        compact ? "" : "sm:gap-2 sm:px-2 sm:py-1.5"
      }`}
    >
      <span className="teacher-theme-label text-[10px] font-semibold uppercase tracking-wide">
        Theme
      </span>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Contrast mode">
        {TEACHER_THEME_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            className="teacher-theme-chip rounded px-1.5 py-0.5 text-[10px] font-medium"
            data-active={value.mode === mode ? "true" : "false"}
            onClick={() => onChange({ ...value, mode: mode as TeacherThemeMode })}
          >
            {TEACHER_MODE_LABELS[mode]}
          </button>
        ))}
      </div>
      <span className="teacher-theme-label text-[10px]">·</span>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Accent tint">
        {TEACHER_THEME_TINTS.map((tint) => (
          <button
            key={tint}
            type="button"
            className="teacher-theme-chip rounded px-1.5 py-0.5 text-[10px] font-medium"
            data-active={value.tint === tint ? "true" : "false"}
            onClick={() => onChange({ ...value, tint: tint as TeacherThemeTint })}
            title={TEACHER_TINT_LABELS[tint]}
          >
            {TEACHER_TINT_LABELS[tint]}
          </button>
        ))}
      </div>
    </div>
  );
}
