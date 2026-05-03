"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import {
  getProgressSnapshot,
  setAudioMuted,
} from "@/lib/progress/local-storage";
import { KidButton } from "@/components/kid-ui/KidButton";
import { SoftChromePresetSwatches } from "@/components/ui/SoftChromePresetSwatches";
import {
  getSoftChromePreset,
  studentSoftChromeStore,
} from "@/lib/soft-chrome-theme";

export function StudentShell({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(false);
  const presetId = useSyncExternalStore(
    studentSoftChromeStore.subscribe,
    studentSoftChromeStore.getSnapshot,
    studentSoftChromeStore.getServerSnapshot,
  );
  const preset = getSoftChromePreset(presetId);
  const pageBackground = preset.page;
  const headerBackground = preset.header;

  useLayoutEffect(() => {
    document.documentElement.style.setProperty("--student-chrome-page", pageBackground);
    return () => {
      document.documentElement.style.removeProperty("--student-chrome-page");
    };
  }, [pageBackground]);

  useEffect(() => {
    queueMicrotask(() =>
      setMuted(getProgressSnapshot().audioMuted === true),
    );
  }, []);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
  }

  return (
    <div
      data-student-shell
      className="flex min-h-min flex-col text-neutral-900"
      style={{ backgroundColor: pageBackground }}
    >
      <header
        className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-neutral-900 px-4 py-3"
        style={{ backgroundColor: headerBackground }}
      >
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-neutral-900"
        >
          We Know English
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
          <SoftChromePresetSwatches
            headerBackground={headerBackground}
            presetId={presetId}
            onPresetChange={studentSoftChromeStore.persist}
          />
          <Link
            href="/learn"
            className="rounded-md border-2 border-neutral-900 px-3 py-2 text-sm font-semibold transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] hover:bg-neutral-100 active:scale-[0.96] active:bg-neutral-200 motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Lessons
          </Link>
          <Link
            href="/activities"
            className="rounded-md border-2 border-neutral-900 px-3 py-2 text-sm font-semibold transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] hover:bg-neutral-100 active:scale-[0.96] active:bg-neutral-200 motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Activities
          </Link>
          <Link
            href="/profile"
            className="rounded-md border-2 border-neutral-900 px-3 py-2 text-sm font-semibold transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] hover:bg-neutral-100 active:scale-[0.96] active:bg-neutral-200 motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Achievements
          </Link>
          <KidButton
            type="button"
            variant="secondary"
            className="!min-h-10 !min-w-0 px-3 py-2 text-sm"
            onClick={toggleMute}
          >
            {muted ? "Sound off" : "Sound on"}
          </KidButton>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
