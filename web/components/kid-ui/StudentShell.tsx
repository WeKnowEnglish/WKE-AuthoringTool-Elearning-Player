"use client";

import type { ReactNode } from "react";
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
  fullWidth = false,
  hidePrimaryNav = false,
  homeHref = "/primary",
  classMenu,
  headerNav,
  mobileNav,
}: {
  children: ReactNode;
  /** Wider main column for grammar infographics and multi-column layouts. */
  wide?: boolean;
  /** Tighter vertical padding for dense infographic pages. */
  compact?: boolean;
  /** Use the full viewport width (secondary portal). */
  fullWidth?: boolean;
  /** Hide Achievements (secondary portal). */
  hidePrimaryNav?: boolean;
  /** Brand link target — secondary pages stay on `/secondary`. */
  homeHref?: string;
  /** Optional class join/select control for student enrollment UI. */
  classMenu?: ReactNode;
  /** Optional primary portal links in the header (e.g. Secondary Home/Learn/Progress). */
  headerNav?: ReactNode;
  /** Optional fixed mobile bottom nav (e.g. Secondary). */
  mobileNav?: ReactNode;
}) {
  const isSecondary = homeHref === "/secondary" || hidePrimaryNav;
  const presetId = useSyncExternalStore(
    studentSoftChromeStore.subscribe,
    studentSoftChromeStore.getSnapshot,
    studentSoftChromeStore.getServerSnapshot,
  );
  const preset = getSoftChromePreset(presetId);
  const pageBackground = isSecondary
    ? "var(--sec-bg, #f3f6fa)"
    : preset.page;
  const headerBackground = isSecondary
    ? "var(--sec-card, #ffffff)"
    : preset.header;

  useLayoutEffect(() => {
    const pageValue = isSecondary ? "#f3f6fa" : pageBackground;
    document.documentElement.style.setProperty("--student-chrome-page", pageValue);
    return () => {
      document.documentElement.style.removeProperty("--student-chrome-page");
    };
  }, [isSecondary, pageBackground]);

  return (
    <div
      data-student-shell
      data-portal={isSecondary ? "secondary" : "primary"}
      className={`flex min-h-min flex-col ${
        isSecondary ? "text-[var(--sec-ink,#1e293b)]" : "text-neutral-900"
      }`}
      style={{ backgroundColor: pageBackground }}
    >
      <header
        className={
          isSecondary
            ? "flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sec-border,#cbd5e1)] px-4 py-3"
            : "flex flex-wrap items-center justify-between gap-3 border-b-4 border-neutral-900 px-4 py-3"
        }
        style={{ backgroundColor: headerBackground }}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Link
            href={homeHref}
            className={`text-xl font-bold tracking-tight ${
              isSecondary ? "text-[var(--sec-ink,#1e293b)]" : "text-neutral-900"
            }`}
          >
            We Know English
          </Link>
          {headerNav}
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {!isSecondary ? (
            <SoftChromePresetSwatches
              headerBackground={headerBackground}
              presetId={presetId}
              onPresetChange={studentSoftChromeStore.persist}
            />
          ) : null}
          {!hidePrimaryNav ? (
            <Link
              href="/primary?nav=progress"
              className="rounded-md border-2 border-neutral-900 px-3 py-2 text-sm font-semibold transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] hover:bg-neutral-100 active:scale-[0.96] active:bg-neutral-200 motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Achievements
            </Link>
          ) : null}
          {classMenu}
          <SoundMuteButton />
          <SignOutForm
            label="Log out"
            variant={isSecondary ? "secondary" : "kid"}
            className="!min-h-10"
          />
        </nav>
      </header>
      <main
        className={`${
          fullWidth ?
            compact ? "w-full px-4 py-4 sm:px-6"
            : "w-full px-4 py-6 sm:px-6"
          : wide && compact ?
            "mx-auto w-full max-w-[90rem] px-4 py-4"
          : wide ?
            "mx-auto w-full max-w-[90rem] px-4 py-6"
          : "mx-auto w-full max-w-3xl px-4 py-8"
        }${mobileNav ? " pb-20 sm:pb-0" : ""}`}
      >
        {children}
      </main>
      {mobileNav}
    </div>
  );
}
