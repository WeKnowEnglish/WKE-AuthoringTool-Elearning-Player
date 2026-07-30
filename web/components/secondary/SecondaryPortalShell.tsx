"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Home,
  Library,
  Menu,
  School,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { SignOutForm } from "@/components/auth/SignOutForm";
import { useAudioMuted } from "@/lib/audio/use-audio-muted";
import {
  SECONDARY_CHROME_CLASS,
  SECONDARY_CHROME_STYLE,
} from "@/lib/secondary/secondary-chrome";
import {
  SECONDARY_PORTAL_NAV,
  resolveSecondaryPortalNavId,
  type SecondaryPortalNavId,
} from "@/lib/secondary/secondary-nav";

const NAV_ICONS = {
  home: Home,
  class: School,
  learn: Library,
  progress: Trophy,
} as const;

const MOBILE_TAB_IDS: SecondaryPortalNavId[] = ["home", "learn", "class", "progress"];

type Props = {
  children: ReactNode;
  /** Optional controls in the top bar (e.g. class menu). */
  classMenu?: ReactNode;
};

export function SecondaryPortalShell({ children, classMenu }: Props) {
  const pathname = usePathname();
  const activeId = resolveSecondaryPortalNavId(pathname);
  const { muted, toggleMuted } = useAudioMuted();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const sidebar = (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-[var(--sec-border)] bg-[var(--sec-card)] px-3 py-4">
      <nav className="flex flex-1 flex-col gap-1" aria-label="Secondary">
        {SECONDARY_PORTAL_NAV.map((item) => {
          const Icon = NAV_ICONS[item.id];
          const active = activeId === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold transition ${
                active
                  ? "bg-[var(--sec-accent-soft)] text-[var(--sec-accent)]"
                  : "text-[var(--sec-muted)] hover:bg-[var(--sec-panel-muted)] hover:text-[var(--sec-ink)]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  active
                    ? "bg-[var(--sec-accent)] text-white"
                    : "bg-[var(--sec-panel-muted)] text-[var(--sec-muted)]"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex flex-col gap-2">
        {classMenu ? <div className="lg:hidden">{classMenu}</div> : null}

        <button
          type="button"
          onClick={toggleMuted}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--sec-border)] bg-[var(--sec-panel-muted)] px-3 py-2.5 text-sm font-extrabold text-[var(--sec-muted)] transition hover:bg-white hover:text-[var(--sec-ink)]"
          aria-pressed={muted}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {muted ? "Sound off" : "Sound on"}
        </button>

        <SignOutForm variant="secondary" label="Log out" />
      </div>
    </aside>
  );

  return (
    <div
      data-student-shell
      data-portal="secondary"
      data-secondary-chrome
      className={`flex h-[100dvh] w-full flex-col overflow-hidden ${SECONDARY_CHROME_CLASS}`}
      style={SECONDARY_CHROME_STYLE}
    >
      <header className="z-30 flex shrink-0 items-center justify-between gap-3 border-b border-[var(--sec-border)] bg-[var(--sec-card)] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--sec-border)] bg-[var(--sec-panel-muted)] text-[var(--sec-ink)] lg:hidden"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/secondary" className="flex min-w-0 items-center gap-2.5 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--sec-accent)] text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-extrabold tracking-tight">
                WeKnow <span className="text-[var(--sec-accent)]">English</span>
              </span>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sec-muted)] sm:block">
                Secondary
              </span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {classMenu ? <div className="hidden min-w-0 sm:block">{classMenu}</div> : null}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div className="hidden lg:flex">{sidebar}</div>

        {mobileNavOpen ? (
          <div className="absolute inset-0 z-40 flex lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/30"
              aria-label="Close menu overlay"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="relative z-10 h-full shadow-xl">{sidebar}</div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 overflow-y-auto bg-[var(--sec-bg)] px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:pb-8">
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--sec-border)] bg-[var(--sec-card)] px-2 py-2 lg:hidden"
        aria-label="Secondary mobile"
      >
        {SECONDARY_PORTAL_NAV.filter((item) => MOBILE_TAB_IDS.includes(item.id)).map(
          (item) => {
            const Icon = NAV_ICONS[item.id];
            const active = activeId === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-extrabold [touch-action:manipulation] ${
                  active ? "text-[var(--sec-accent)]" : "text-[var(--sec-muted)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          },
        )}
      </nav>
    </div>
  );
}
