"use client";

import { useEffect, useState } from "react";
import { GradedTrackStudentPreview } from "@/components/teacher/activity-builder/GradedTrackStudentPreview";
import { getActivityTrackDraft } from "@/lib/activity-tracks/draft-storage";
import type { ActivityTrackDocument } from "@/lib/activity-tracks";

type Props = {
  trackId: string;
};

type PreviewMessage = {
  type: "wke-activity-track-preview";
  document: ActivityTrackDocument;
  focusPartId?: string | null;
};

function isPreviewMessage(value: unknown): value is PreviewMessage {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.type === "wke-activity-track-preview" &&
    Boolean(record.document) &&
    typeof record.document === "object"
  );
}

export function ActivityTrackPreviewBridge({ trackId }: Props) {
  const [track, setTrack] = useState<ActivityTrackDocument | null>(() =>
    getActivityTrackDraft(trackId),
  );
  const [focusPartId, setFocusPartId] = useState<string | null>(null);

  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) return;
      if (!isPreviewMessage(event.data)) return;
      if (event.data.document.id !== trackId) return;
      setTrack(event.data.document);
      setFocusPartId(event.data.focusPartId ?? null);
    };
    window.addEventListener("message", receive);
    window.parent.postMessage(
      { type: "wke-activity-track-preview-ready", trackId },
      window.location.origin,
    );
    return () => window.removeEventListener("message", receive);
  }, [trackId]);

  if (!track) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-100 p-6">
        <p className="text-sm font-bold text-stone-600">
          Loading student preview…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-white">
      <GradedTrackStudentPreview doc={track} focusPartId={focusPartId} />
    </main>
  );
}
