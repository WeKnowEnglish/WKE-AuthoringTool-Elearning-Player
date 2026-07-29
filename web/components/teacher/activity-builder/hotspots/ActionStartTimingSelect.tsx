"use client";

import type { WkeActionStartTiming } from "@/lib/wke-activity/types";

type Props = {
  value: WkeActionStartTiming | undefined;
  index: number;
  inputClass: string;
  onChange: (timing: WkeActionStartTiming) => void;
};

export function ActionStartTimingSelect({ value, index, inputClass, onChange }: Props) {
  const timing: WkeActionStartTiming =
    value === "with_previous" ? "with_previous" : "after_previous";

  return (
    <label className="block text-xs text-stone-600">
      Start
      <select
        className={inputClass}
        value={timing}
        onChange={(event) =>
          onChange(event.target.value as WkeActionStartTiming)
        }
      >
        <option value="after_previous">After previous</option>
        <option value="with_previous">With previous</option>
      </select>
      <span className="mt-1 block text-[10px] leading-snug text-stone-500">
        {index === 0
          ? "First step always starts when the sequence begins."
          : timing === "with_previous"
            ? "Starts at the same time as the previous step."
            : "Starts after the previous step finishes."}
      </span>
    </label>
  );
}
