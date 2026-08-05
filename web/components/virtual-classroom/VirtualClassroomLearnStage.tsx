"use client";

import { useEffect, useState } from "react";
import { VirtualClassroomActivityEmbed } from "@/components/virtual-classroom/VirtualClassroomActivityEmbed";
import { VirtualClassroomWhiteboardEmbed } from "@/components/virtual-classroom/VirtualClassroomWhiteboardEmbed";
import type { ClassLesson } from "@/lib/class-lessons/types";
import { playPathForStudioActivity } from "@/lib/studio-activities/paths";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";
import type {
  VirtualClassroomLearnActivity,
  VirtualClassroomLearnStage,
} from "@/lib/virtual-classroom/liveblocks/initial-storage";
import type { WhiteboardSessionContext } from "@/lib/whiteboard/liveblocks/identity";

type BankItem = {
  id: string;
  title: string;
  format: StudioActivityFormat;
  playPath: string;
};

type Props = {
  sessionId: string;
  classId: string;
  role: "host" | "member";
  userId: string;
  displayName: string;
  busy: boolean;
  learnStage: VirtualClassroomLearnStage;
  learnActivity: VirtualClassroomLearnActivity | null;
  whiteboardLive: boolean;
  whiteboardJoinCode: string | null;
  onSetStage: (stage: VirtualClassroomLearnStage) => void;
  onSetActivity: (activity: VirtualClassroomLearnActivity | null) => void;
  onLaunchWhiteboard: () => Promise<WhiteboardSessionContext | null>;
  studentPensEnabled: boolean;
  onToggleStudentPens: (enabled: boolean) => void;
  pensBusy?: boolean;
};

export function VirtualClassroomLearnStage({
  sessionId,
  classId,
  role,
  userId,
  displayName,
  busy,
  learnStage,
  learnActivity,
  whiteboardLive,
  whiteboardJoinCode,
  onSetStage,
  onSetActivity,
  onLaunchWhiteboard,
  studentPensEnabled,
  onToggleStudentPens,
  pensBusy = false,
}: Props) {
  const isHost = role === "host";
  const [pickerOpen, setPickerOpen] = useState(false);
  const [boundSteps, setBoundSteps] = useState<VirtualClassroomLearnActivity[]>([]);
  const [bank, setBank] = useState<BankItem[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHost || !classId) return;
    let cancelled = false;
    void fetch(`/api/virtual-classroom/${sessionId}/lesson`)
      .then(async (res) => {
        const payload = (await res.json()) as {
          lesson?: ClassLesson | null;
        };
        if (!res.ok || cancelled) return;
        const steps = (payload.lesson?.steps ?? [])
          .filter((step) => step.kind === "studio_activity")
          .map((step) => {
            const config = step.config as {
              activityId?: string;
              activityTitle?: string;
              format?: string;
              playPath?: string;
            };
            if (!config.activityId || !config.playPath) return null;
            return {
              activityId: config.activityId,
              format: config.format || "learning_track",
              title: config.activityTitle || step.title,
              playPath: config.playPath,
            } satisfies VirtualClassroomLearnActivity;
          })
          .filter(Boolean) as VirtualClassroomLearnActivity[];
        setBoundSteps(steps);
      })
      .catch(() => {
        if (!cancelled) setBoundSteps([]);
      });
    return () => {
      cancelled = true;
    };
  }, [classId, isHost, sessionId]);

  useEffect(() => {
    if (!isHost || !pickerOpen) return;
    let cancelled = false;
    setBankLoading(true);
    setBankError(null);
    void fetch("/api/studio/activities?limit=40", { credentials: "include" })
      .then(async (res) => {
        const payload = (await res.json()) as {
          error?: string;
          activities?: BankItem[];
        };
        if (!res.ok) throw new Error(payload.error ?? "Could not load Activity Bank.");
        if (!cancelled) setBank(payload.activities ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setBankError(err instanceof Error ? err.message : "Could not load bank.");
          setBank([]);
        }
      })
      .finally(() => {
        if (!cancelled) setBankLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isHost, pickerOpen]);

  const selectActivity = (activity: VirtualClassroomLearnActivity) => {
    onSetActivity(activity);
    setPickerOpen(false);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
          role="tablist"
          aria-label="Learn stage"
        >
          {(
            [
              { id: "whiteboard" as const, label: "Whiteboard" },
              { id: "activity" as const, label: "Activity" },
            ] as const
          ).map((tab) => {
            const active = learnStage === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={!isHost}
                onClick={() => {
                  if (isHost) onSetStage(tab.id);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : isHost
                      ? "text-slate-700 hover:bg-slate-100"
                      : "cursor-default text-slate-500"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {isHost && learnStage === "activity" ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              {pickerOpen ? "Close picker" : learnActivity ? "Change activity" : "Pick activity"}
            </button>
            <a
              href="/teacher/activity-builder/tracks"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-100"
            >
              Start new track
            </a>
          </div>
        ) : null}
      </div>

      {isHost && learnStage === "activity" && pickerOpen ? (
        <div className="max-h-56 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          {boundSteps.length > 0 ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Prepared for today
              </p>
              <ul className="mt-1 space-y-1">
                {boundSteps.map((step) => (
                  <li key={step.activityId}>
                    <button
                      type="button"
                      onClick={() => selectActivity(step)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-teal-50"
                    >
                      <span className="truncate font-semibold text-slate-900">{step.title}</span>
                      <span className="shrink-0 text-[10px] font-bold uppercase text-teal-800">
                        {step.format.replace(/_/g, " ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              No studio activities on today’s bound lesson. Pick from your bank or start a new
              track.
            </p>
          )}

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Activity Bank
            </p>
            {bankLoading ? (
              <p className="mt-1 text-xs text-slate-500">Loading…</p>
            ) : bankError ? (
              <p className="mt-1 text-xs text-red-600">{bankError}</p>
            ) : bank.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">No bank activities yet.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {bank.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() =>
                        selectActivity({
                          activityId: item.id,
                          format: item.format,
                          title: item.title,
                          playPath:
                            item.playPath ||
                            playPathForStudioActivity(item.format, item.id),
                        })
                      }
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="truncate font-semibold text-slate-900">{item.title}</span>
                      <span className="shrink-0 text-[10px] font-bold uppercase text-slate-500">
                        {item.format.replace(/_/g, " ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        {learnStage === "whiteboard" ? (
          <VirtualClassroomWhiteboardEmbed
            sessionId={sessionId}
            role={role}
            userId={userId}
            displayName={displayName}
            classId={classId}
            whiteboardLive={whiteboardLive}
            joinCode={whiteboardJoinCode}
            busy={busy}
            onLaunch={onLaunchWhiteboard}
            studentPensEnabled={studentPensEnabled}
            onToggleStudentPens={onToggleStudentPens}
            pensBusy={pensBusy}
          />
        ) : learnActivity ? (
          <VirtualClassroomActivityEmbed
            sessionId={sessionId}
            learnActivity={learnActivity}
          />
        ) : (
          <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50/40 px-4 text-center">
            <p className="text-base font-bold text-slate-900">Activity stage</p>
            <p className="max-w-sm text-sm text-slate-600">
              {isHost
                ? "Pick a prepared lesson activity, choose from your bank, or start a new track."
                : "Waiting for the teacher to open an activity."}
            </p>
            {isHost ? (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="rounded-lg bg-violet-800 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700"
              >
                Pick activity
              </button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
