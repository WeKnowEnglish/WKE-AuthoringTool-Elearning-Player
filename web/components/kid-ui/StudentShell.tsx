"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getProgressSnapshot,
  setAudioMuted,
} from "@/lib/progress/local-storage";
import { KidButton } from "@/components/kid-ui/KidButton";

export function StudentShell({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(false);

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
    <div className="flex min-h-full flex-col bg-white text-neutral-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-neutral-900 bg-white px-4 py-3">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-neutral-900"
        >
          We Know English
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t-2 border-neutral-300 bg-neutral-50 px-4 py-4 text-center text-sm text-neutral-600">
        <Link
          href="/teacher/login"
          className="font-semibold text-neutral-800 underline decoration-neutral-500 underline-offset-2 hover:text-neutral-950"
        >
          For teachers
        </Link>
        <span className="text-neutral-500"> — sign in to create lessons</span>
      </footer>
    </div>
  );
}
