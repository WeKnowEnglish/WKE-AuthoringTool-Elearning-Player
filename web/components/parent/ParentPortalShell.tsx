"use client";

import Link from "next/link";
import { Bell, BookOpenText, House, Settings, UsersRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { SignOutForm } from "@/components/auth/SignOutForm";
import { ParentStudentSelector } from "@/components/parent/ParentStudentSelector";
import type { ParentLinkedStudent } from "@/lib/parent/guardian-data";
import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";

function selectedStudentId(pathname: string): string | null {
  const match = pathname.match(/^\/parent\/students\/([^/]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function NavLink(props: {
  href: string;
  active: boolean;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={props.href}
      aria-current={props.active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold transition ${
        props.active
          ? "bg-indigo-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
      }`}
    >
      {props.icon}
      <span>{props.label}</span>
      {props.badge ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-black text-white">
          {Math.min(props.badge, 99)}
        </span>
      ) : null}
    </Link>
  );
}

export function ParentPortalShell(props: {
  userEmail: string;
  students: ParentLinkedStudent[];
  unreadNotificationCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const selectedId = selectedStudentId(pathname);
  const selected = props.students.find((student) => student.studentId === selectedId) ?? null;
  const fallbackId = props.students[0]?.studentId ?? null;
  const navStudentId = selected?.studentId ?? fallbackId;
  const streamHref = navStudentId ? `/parent/students/${navStudentId}/stream` : "/parent";
  const progressHref = navStudentId ? `/parent/students/${navStudentId}/progress` : "/parent";

  useEffect(() => {
    const eventName =
      pathname.endsWith("/stream")
        ? "parent_stream_viewed"
        : pathname.endsWith("/progress")
          ? "parent_progress_viewed"
          : pathname === "/parent/manage-children"
            ? "parent_children_viewed"
            : pathname === "/parent/notifications"
              ? "parent_notifications_viewed"
              : pathname === "/parent/settings"
                ? "parent_settings_viewed"
                : "parent_portal_viewed";
    recordAppDiagnostic("parent", "navigation", eventName);
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/parent" className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.17em] text-indigo-600">
              We Know English
            </p>
            <p className="truncate text-lg font-black tracking-tight">Parent portal</p>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-56 truncate text-xs text-slate-500 sm:block">
              {props.userEmail}
            </span>
            <Link
              href="/parent/notifications"
              aria-label={`Notifications${props.unreadNotificationCount ? `, ${props.unreadNotificationCount} unread` : ""}`}
              className="relative rounded-xl border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
            >
              <Bell className="h-5 w-5" aria-hidden />
              {props.unreadNotificationCount > 0 ? (
                <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                  {Math.min(props.unreadNotificationCount, 99)}
                </span>
              ) : null}
            </Link>
            <Link
              href="/parent/settings"
              aria-label="Parent settings"
              className="rounded-xl border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
            >
              <Settings className="h-5 w-5" aria-hidden />
            </Link>
            <SignOutForm
              label="Sign out"
              buttonClassName="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 no-underline hover:bg-slate-50"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5 pb-24 sm:px-6 sm:pb-8">
        {props.students.length > 0 ? (
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="min-w-[13rem] flex-1">
              <ParentStudentSelector students={props.students} selectedStudentId={selectedId} />
              {selected?.classTitle ? (
                <p className="mt-2 text-sm text-slate-500">{selected.classTitle}</p>
              ) : null}
            </div>
            <nav className="hidden items-center gap-1 sm:flex" aria-label="Parent portal">
              <NavLink
                href={streamHref}
                active={pathname.endsWith("/stream")}
                label="Class stream"
                icon={<House className="h-4 w-4" aria-hidden />}
              />
              <NavLink
                href={progressHref}
                active={pathname.endsWith("/progress")}
                label="Progress"
                icon={<BookOpenText className="h-4 w-4" aria-hidden />}
              />
              <NavLink
                href="/parent/manage-children"
                active={pathname === "/parent/manage-children"}
                label="Children"
                icon={<UsersRound className="h-4 w-4" aria-hidden />}
              />
              <NavLink
                href="/parent/notifications"
                active={pathname === "/parent/notifications"}
                label="Alerts"
                badge={props.unreadNotificationCount}
                icon={<Bell className="h-4 w-4" aria-hidden />}
              />
            </nav>
          </div>
        ) : null}

        <main>{props.children}</main>
      </div>

      {props.students.length > 0 ? (
        <nav
          aria-label="Parent portal"
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 gap-1 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur sm:hidden"
        >
          <NavLink
            href={streamHref}
            active={pathname.endsWith("/stream")}
            label="Stream"
            icon={<House className="h-4 w-4" aria-hidden />}
          />
          <NavLink
            href={progressHref}
            active={pathname.endsWith("/progress")}
            label="Progress"
            icon={<BookOpenText className="h-4 w-4" aria-hidden />}
          />
          <NavLink
            href="/parent/manage-children"
            active={pathname === "/parent/manage-children"}
            label="Children"
            icon={<UsersRound className="h-4 w-4" aria-hidden />}
          />
          <NavLink
            href="/parent/notifications"
            active={pathname === "/parent/notifications"}
            label="Alerts"
            badge={props.unreadNotificationCount}
            icon={<Bell className="h-4 w-4" aria-hidden />}
          />
        </nav>
      ) : null}
    </div>
  );
}
