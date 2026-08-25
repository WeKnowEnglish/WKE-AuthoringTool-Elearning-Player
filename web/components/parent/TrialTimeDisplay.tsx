"use client";

import { useEffect, useState } from "react";
import { formatTrialSlotLabelInTimeZone } from "@/lib/class-schedule/trial-format";
import { detectBrowserTimeZone } from "@/lib/class-schedule/timezone";

type Props = {
  startsAt: string;
  durationMinutes: number;
  timezone: string;
  compact?: boolean;
};

export function TrialTimeDisplay({
  startsAt,
  durationMinutes,
  timezone,
  compact = false,
}: Props) {
  const [viewerTimezone, setViewerTimezone] = useState<string | null>(null);

  useEffect(() => {
    setViewerTimezone(detectBrowserTimeZone());
  }, []);

  const localZone = viewerTimezone || timezone;
  const input = { startsAt, durationMinutes, timezone };
  const localLabel = formatTrialSlotLabelInTimeZone(input, localZone);
  const teacherLabel = formatTrialSlotLabelInTimeZone(input, timezone);
  const differs = localZone !== timezone;

  return (
    <span className="block">
      <span className="block font-semibold text-slate-800">
        {differs ? "Your time: " : ""}{localLabel}
      </span>
      {differs && !compact ? (
        <span className="mt-0.5 block text-xs font-semibold text-slate-500">
          Teacher time: {teacherLabel}
        </span>
      ) : null}
    </span>
  );
}
