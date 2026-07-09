"use client";

import Link from "next/link";
import { useLayoutEffect, useSyncExternalStore } from "react";
import { SignOutForm } from "@/components/auth/SignOutForm";
import { SoundMuteButton } from "@/components/kid-ui/SoundMuteButton";
import { SoftChromePresetSwatches } from "@/components/ui/SoftChromePresetSwatches";
import {
  getSoftChromePreset,
  studentSoftChromeStore,
} from "@/lib/soft-chrome-theme";

export function StudentShell({
  children,
  wide = false,
  compact = false,
  hidePrimaryNav = false,
  homeHref = "/home",
  classMenu,
}: {
  children: React.ReactNode;
  /** Wider main column for grammar infographics and multi-column layouts. */
  wide?: boolean;
  /** Tighter vertical padding for dense infographic pages. */
  compact?: boolean;
  /** Hide Learn / Achievements (secondary portal). */
  hidePrimaryNav?: boolean;
  /** Brand link target — secondary pages stay on `/secondary`. */
  homeHref?: string;
  /** Optional class join/select control for student enrollment UI. */
  classMenu?: React.ReactNode;
}) {
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
          href={homeHref}
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
          {!hidePrimaryNav ? (
            <>
              <Link
                href="/learn"
                className="rounded-md border-2 border-neutral-900 px-3 py-2 text-sm font-semibold transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] hover:bg-neutral-100 active:scale-[0.96] active:bg-neutral-200 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Learn
              </Link>
              <Link
                href="/profile"
                className="rounded-md border-2 border-neutral-900 px-3 py-2 text-sm font-semibold transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] hover:bg-neutral-100 active:scale-[0.96] active:bg-neutral-200 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Achievements
              </Link>
            </>
          ) : null}
          {classMenu}
          <SoundMuteButton />
          <SignOutForm label="Log out" variant="kid" className="!min-h-10" />
        </nav>
      </header>
      <main
        className={
          wide && compact ?
            "mx-auto w-full max-w-[90rem] px-4 py-4"
          : wide ?
            "mx-auto w-full max-w-[90rem] px-4 py-6"
          : "mx-auto w-full max-w-3xl px-4 py-8"
        }
      >
        {children}
      </main>
    </div>
  );
}
