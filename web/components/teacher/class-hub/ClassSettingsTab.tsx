"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateClassStudentTabSettings } from "@/lib/actions/teacher-classes";
import {
  CLASSROOM_TAB_LABELS,
  OPTIONAL_CLASSROOM_TABS,
  type OptionalClassroomTabId,
  type StudentClassroomTabSettings,
} from "@/lib/classroom/classroom-tabs";

type Props = {
  classId: string;
  archived: boolean;
  initialSettings: StudentClassroomTabSettings;
};

const TAB_HELP: Record<OptionalClassroomTabId, string> = {
  schedule: "Weekly class times and the next lesson for students.",
  noticeboard: "Full archive of stream posts beyond the recent Stream feed.",
  materials: "Published lesson materials students can open on their own.",
};

export function ClassSettingsTab({ classId, archived, initialSettings }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const dirty =
    settings.schedule !== initialSettings.schedule ||
    settings.noticeboard !== initialSettings.noticeboard ||
    settings.materials !== initialSettings.materials;

  const toggle = (tab: OptionalClassroomTabId) => {
    setSettings((current) => ({ ...current, [tab]: !current[tab] }));
    setError(null);
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateClassStudentTabSettings({
        classId,
        schedule: settings.schedule,
        noticeboard: settings.noticeboard,
        materials: settings.materials,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice("Student classroom tabs updated.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Classroom settings
        </p>
        <h2 className="mt-1 text-lg font-semibold text-neutral-900">
          Student classroom tabs
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Students always get <span className="font-semibold">Stream</span> (posts, live status,
          homework, and next class). Turn on extra tabs only when you want them in the student
          classroom.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3">
          <p className="text-sm font-semibold text-neutral-900">Stream</p>
          <p className="mt-0.5 text-sm text-neutral-600">
            Always on — the minimum classroom home for enrolled students.
          </p>
        </div>

        {OPTIONAL_CLASSROOM_TABS.map((tab) => (
          <label
            key={tab}
            className={`flex cursor-pointer items-start justify-between gap-4 rounded-xl border px-3.5 py-3 ${
              settings[tab]
                ? "border-neutral-900 bg-neutral-50"
                : "border-neutral-200 bg-white"
            } ${archived ? "opacity-60" : ""}`}
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-neutral-900">
                {CLASSROOM_TAB_LABELS[tab]}
              </span>
              <span className="mt-0.5 block text-sm text-neutral-600">{TAB_HELP[tab]}</span>
            </span>
            <input
              type="checkbox"
              checked={settings[tab]}
              disabled={archived || isPending}
              onChange={() => toggle(tab)}
              className="mt-1 h-4 w-4 rounded border-neutral-300"
            />
          </label>
        ))}

        {archived ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            This class is archived. Unarchive it before changing settings.
          </p>
        ) : null}

        {error ? (
          <p className="text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
            {notice}
          </p>
        ) : null}

        <button
          type="button"
          disabled={archived || isPending || !dirty}
          onClick={handleSave}
          className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save tab settings"}
        </button>
      </section>
    </div>
  );
}
