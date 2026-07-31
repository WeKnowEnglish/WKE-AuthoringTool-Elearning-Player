"use client";

import { useState, useSyncExternalStore } from "react";
import {
  TEACHER_MODE_LABELS,
  TEACHER_THEME_MODES,
  TEACHER_THEME_PRESET_MAX,
  TEACHER_THEME_TINTS,
  TEACHER_TINT_LABELS,
  defaultTeacherThemePresetName,
  teacherThemePresetStore,
  type TeacherThemeMode,
  type TeacherThemeSelection,
  type TeacherThemeTint,
} from "@/lib/teacher-theme";

type Props = {
  value: TeacherThemeSelection;
  onChange: (next: TeacherThemeSelection) => void;
  compact?: boolean;
  /** Show named preset save/apply (default true). */
  showPresets?: boolean;
};

export function TeacherThemeControls({
  value,
  onChange,
  compact = false,
  showPresets = true,
}: Props) {
  const presets = useSyncExternalStore(
    teacherThemePresetStore.subscribe,
    teacherThemePresetStore.getSnapshot,
    teacherThemePresetStore.getServerSnapshot,
  );
  const [naming, setNaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const atLimit = presets.length >= TEACHER_THEME_PRESET_MAX;
  const alreadySaved = presets.some(
    (preset) => preset.mode === value.mode && preset.tint === value.tint,
  );

  function beginSave() {
    setNotice(null);
    setDraftName(defaultTeacherThemePresetName(value));
    setNaming(true);
  }

  function confirmSave() {
    if (atLimit) {
      setNotice(`You can save up to ${TEACHER_THEME_PRESET_MAX} presets.`);
      setNaming(false);
      return;
    }
    const saved = teacherThemePresetStore.save(draftName, value);
    setNaming(false);
    setNotice(saved ? `Saved “${saved.name}”.` : "Could not save preset.");
  }

  return (
    <div className={`flex flex-col gap-2 ${compact ? "" : "gap-2.5"}`}>
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

      {showPresets ? (
        <div className="teacher-theme-presets rounded-lg border px-1.5 py-1.5">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
            <span className="teacher-theme-label text-[10px] font-semibold uppercase tracking-wide">
              Saved presets
            </span>
            {naming ? (
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1">
                <input
                  className="teacher-theme-preset-input min-w-[7rem] flex-1 rounded border px-1.5 py-0.5 text-[11px]"
                  value={draftName}
                  maxLength={40}
                  aria-label="Preset name"
                  autoFocus
                  onChange={(event) => setDraftName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      confirmSave();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setNaming(false);
                    }
                  }}
                />
                <button
                  type="button"
                  className="teacher-theme-chip rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  onClick={confirmSave}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="teacher-theme-chip rounded px-1.5 py-0.5 text-[10px] font-medium"
                  onClick={() => setNaming(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="teacher-theme-chip rounded px-1.5 py-0.5 text-[10px] font-semibold"
                disabled={atLimit}
                title={
                  atLimit
                    ? `Limit of ${TEACHER_THEME_PRESET_MAX} presets`
                    : alreadySaved
                      ? "Save another copy of this theme"
                      : `Save ${defaultTeacherThemePresetName(value)}`
                }
                onClick={beginSave}
              >
                Save current
              </button>
            )}
          </div>

          {presets.length === 0 ? (
            <p className="teacher-theme-label text-[10px] leading-snug">
              Save Light · Purple (or any combo) to reuse it later.
            </p>
          ) : (
            <ul className="flex flex-col gap-1" aria-label="Theme presets">
              {presets.map((preset) => {
                const active = preset.mode === value.mode && preset.tint === value.tint;
                return (
                  <li key={preset.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      className="teacher-theme-chip min-w-0 flex-1 truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium"
                      data-active={active ? "true" : "false"}
                      onClick={() =>
                        onChange({ mode: preset.mode, tint: preset.tint })
                      }
                      title={`${preset.name} (${TEACHER_MODE_LABELS[preset.mode]} · ${TEACHER_TINT_LABELS[preset.tint]})`}
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      className="teacher-theme-chip shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                      aria-label={`Delete preset ${preset.name}`}
                      onClick={() => teacherThemePresetStore.remove(preset.id)}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {notice ? (
            <p className="teacher-theme-label mt-1.5 text-[10px]" role="status">
              {notice}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
