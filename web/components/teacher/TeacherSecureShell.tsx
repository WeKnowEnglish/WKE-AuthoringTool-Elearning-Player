"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { SignOutForm } from "@/components/auth/SignOutForm";
import { TeacherToolkitFloat } from "@/components/classroom-tools/TeacherToolkitFloat";
import { TeacherPrimaryTabs } from "@/components/teacher/TeacherPrimaryTabs";
import {
  TeacherNavDropdown,
  TeacherNavMenuDivider,
  TeacherNavMenuLink,
} from "@/components/teacher/TeacherNavDropdown";
import { TeacherThemeControls } from "@/components/teacher/TeacherThemeControls";
import { adminTeacherPreviewStore } from "@/lib/admin-teacher-preview";
import type { TeacherTier } from "@/lib/auth/roles";
import {
  resolveTeacherThemeCssVars,
  teacherThemeStore,
} from "@/lib/teacher-theme";
import "./teacher-theme.css";

type Props = {
  userEmail: string;
  teacherTier?: TeacherTier;
  isAdmin?: boolean;
  children: React.ReactNode;
};

/** Hide the teacher chrome after the pointer leaves it this long (LTC only). */
const HEADER_RECESS_MS = 5000;

function isWordPackEditorPath(pathname: string): boolean {
  return /^\/teacher\/word-packs\/[^/]+$/.test(pathname);
}

function isActivityBuilderWorkspacePath(pathname: string): boolean {
  return (
    pathname.startsWith("/teacher/activity-builder/") &&
    pathname !== "/teacher/activity-builder"
  );
}

function isLearningTrackCompilerPath(pathname: string): boolean {
  return (
    pathname === "/teacher/activity-builder/learning-tracks" ||
    pathname.startsWith("/teacher/activity-builder/learning-tracks/") ||
    // Practice workspace hosts LTC (auto-hide chrome like the old compiler).
    /^\/teacher\/activity-builder\/tracks\/[^/]+$/.test(pathname)
  );
}

/** Live class session — no teacher global header (immersive Meeting/Learn). */
function isVirtualClassroomLivePath(pathname: string): boolean {
  return /^\/teacher\/virtual-classroom\/[^/]+$/.test(pathname);
}

function SettingsGearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

function TeacherSettingsMenu({
  userEmail,
  isAdmin,
}: {
  userEmail: string;
  isAdmin: boolean;
}) {
  const theme = useSyncExternalStore(
    teacherThemeStore.subscribe,
    teacherThemeStore.getSnapshot,
    teacherThemeStore.getServerSnapshot,
  );
  const previewAsTeacherLight = useSyncExternalStore(
    adminTeacherPreviewStore.subscribe,
    adminTeacherPreviewStore.getSnapshot,
    adminTeacherPreviewStore.getServerSnapshot,
  );

  return (
    <TeacherNavDropdown
      label={<SettingsGearIcon />}
      ariaLabel="Settings"
      align="right"
      triggerClassName="teacher-tab inline-flex h-8 w-8 items-center justify-center rounded-full border"
    >
      <div className="px-2 pb-1 pt-1.5">
        <p className="teacher-chrome-muted max-w-[14rem] truncate text-[11px]">
          {userEmail}
        </p>
      </div>
      <TeacherNavMenuDivider />
      <div className="px-2 py-2">
        <TeacherThemeControls
          compact
          value={theme}
          onChange={teacherThemeStore.persist}
        />
      </div>
      {isAdmin ? (
        <>
          <TeacherNavMenuDivider />
          <div className="px-2 py-2">
            <label className="flex cursor-pointer items-start gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border"
                checked={previewAsTeacherLight}
                onChange={(event) =>
                  adminTeacherPreviewStore.setPreviewAsTeacherLight(
                    event.target.checked,
                  )
                }
              />
              <span>
                <span className="block">Preview Teacher Light</span>
                <span className="teacher-chrome-muted mt-0.5 block text-[11px] font-normal leading-snug">
                  Hide Go Live, Admin, and unshipped Activity Builder tools.
                </span>
              </span>
            </label>
          </div>
        </>
      ) : null}
      <TeacherNavMenuDivider />
      <TeacherNavMenuLink href="/primary">View student site</TeacherNavMenuLink>
      <div className="px-1 py-1">
        <SignOutForm
          label="Sign out"
          buttonClassName="teacher-nav-menu-item block w-full rounded-md px-2.5 py-1.5 text-left text-sm font-medium !no-underline"
        />
      </div>
    </TeacherNavDropdown>
  );
}

function TeacherChromeHeader({
  userEmail,
  teacherTier,
  isAdmin,
  realIsAdmin,
}: {
  userEmail: string;
  teacherTier: TeacherTier;
  isAdmin: boolean;
  realIsAdmin: boolean;
}) {
  const previewAsTeacherLight = useSyncExternalStore(
    adminTeacherPreviewStore.subscribe,
    adminTeacherPreviewStore.getSnapshot,
    adminTeacherPreviewStore.getServerSnapshot,
  );

  return (
    <header className="teacher-chrome-header relative z-40 w-full min-w-0 shrink-0 overflow-visible border-b px-2 py-1 sm:px-3">
      {realIsAdmin && previewAsTeacherLight ? (
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-950">
          <span>Previewing Teacher Light</span>
          <button
            type="button"
            className="rounded border border-amber-400 bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide hover:bg-amber-100"
            onClick={() =>
              adminTeacherPreviewStore.setPreviewAsTeacherLight(false)
            }
          >
            Exit preview
          </button>
        </div>
      ) : null}
      <div className="grid w-full min-w-0 grid-cols-1 items-center gap-x-2 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] sm:gap-x-1 sm:gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 sm:justify-self-start">
          <Link
            href="/teacher/classes"
            className="teacher-chrome-link shrink-0 text-sm font-bold sm:text-base"
          >
            Teacher
          </Link>
        </div>
        <div className="flex min-w-0 max-w-full justify-center justify-self-center overflow-visible sm:col-start-2 sm:row-start-1">
          <Suspense
            fallback={
              <nav className="flex gap-1" aria-hidden>
                <span className="teacher-tab rounded-full border px-2 py-1 text-xs opacity-50">
                  …
                </span>
              </nav>
            }
          >
            <TeacherPrimaryTabs teacherTier={teacherTier} isAdmin={isAdmin} />
          </Suspense>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 text-xs sm:justify-self-end sm:text-sm">
          <TeacherSettingsMenu userEmail={userEmail} isAdmin={realIsAdmin} />
        </div>
      </div>
    </header>
  );
}

function TeacherChromeHeaderDrawer({
  userEmail,
  teacherTier,
  isAdmin,
  realIsAdmin,
}: {
  userEmail: string;
  teacherTier: TeacherTier;
  isAdmin: boolean;
  realIsAdmin: boolean;
}) {
  const [headerOpen, setHeaderOpen] = useState(true);
  const headerHoverRef = useRef(false);
  const headerNearRef = useRef(false);
  const headerRecessTimerRef = useRef<number | null>(null);

  const clearHeaderRecessTimer = () => {
    if (headerRecessTimerRef.current != null) {
      window.clearTimeout(headerRecessTimerRef.current);
      headerRecessTimerRef.current = null;
    }
  };

  const openHeaderDrawer = () => {
    clearHeaderRecessTimer();
    setHeaderOpen(true);
  };

  const scheduleHeaderRecess = () => {
    if (headerHoverRef.current || headerNearRef.current) return;
    if (headerRecessTimerRef.current != null) return;
    headerRecessTimerRef.current = window.setTimeout(() => {
      headerRecessTimerRef.current = null;
      if (!headerHoverRef.current && !headerNearRef.current) {
        setHeaderOpen(false);
      }
    }, HEADER_RECESS_MS);
  };

  useEffect(() => {
    scheduleHeaderRecess();
    return () => clearHeaderRecessTimer();
    // Mount-only idle recess for LTC chrome.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="teacher-chrome-header-drawer"
      data-open={headerOpen ? "true" : "false"}
    >
      <div
        className="teacher-chrome-header-hotzone"
        aria-hidden
        onPointerEnter={() => {
          headerNearRef.current = true;
          openHeaderDrawer();
        }}
        onPointerLeave={() => {
          headerNearRef.current = false;
          scheduleHeaderRecess();
        }}
      />
      <div
        className="teacher-chrome-header-panel"
        onPointerEnter={() => {
          headerHoverRef.current = true;
          openHeaderDrawer();
        }}
        onPointerLeave={() => {
          headerHoverRef.current = false;
          scheduleHeaderRecess();
        }}
      >
        <TeacherChromeHeader
          userEmail={userEmail}
          teacherTier={teacherTier}
          isAdmin={isAdmin}
          realIsAdmin={realIsAdmin}
        />
      </div>
    </div>
  );
}

export function TeacherSecureShell({
  userEmail,
  teacherTier = "plus",
  isAdmin = false,
  children,
}: Props) {
  const pathname = usePathname();
  const immersiveLiveClass = isVirtualClassroomLivePath(pathname);
  const lockToViewport =
    immersiveLiveClass ||
    isWordPackEditorPath(pathname) ||
    isActivityBuilderWorkspacePath(pathname);
  const autoHideChrome = isLearningTrackCompilerPath(pathname);
  const theme = useSyncExternalStore(
    teacherThemeStore.subscribe,
    teacherThemeStore.getSnapshot,
    teacherThemeStore.getServerSnapshot,
  );
  const previewAsTeacherLight = useSyncExternalStore(
    adminTeacherPreviewStore.subscribe,
    adminTeacherPreviewStore.getSnapshot,
    adminTeacherPreviewStore.getServerSnapshot,
  );
  const themeVars = useMemo(
    () => resolveTeacherThemeCssVars(theme) as React.CSSProperties,
    [theme],
  );
  const effectiveTier: TeacherTier =
    isAdmin && previewAsTeacherLight ? "light" : teacherTier;
  const effectiveIsAdmin = isAdmin && !previewAsTeacherLight;

  return (
    <div
      data-teacher-root
      data-teacher-themed="true"
      data-teacher-chrome-autohide={autoHideChrome ? "true" : undefined}
      className={
        lockToViewport
          ? "flex h-dvh max-w-full flex-col overflow-hidden"
          : "min-h-screen w-full max-w-full overflow-x-hidden"
      }
      style={themeVars}
    >
      {immersiveLiveClass ? null : autoHideChrome ? (
        <TeacherChromeHeaderDrawer
          userEmail={userEmail}
          teacherTier={effectiveTier}
          isAdmin={effectiveIsAdmin}
          realIsAdmin={isAdmin}
        />
      ) : (
        <TeacherChromeHeader
          userEmail={userEmail}
          teacherTier={effectiveTier}
          isAdmin={effectiveIsAdmin}
          realIsAdmin={isAdmin}
        />
      )}
      <div
        className={
          immersiveLiveClass
            ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0"
            : lockToViewport
              ? isActivityBuilderWorkspacePath(pathname)
                ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0"
                : "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 pt-2 pb-3 sm:px-6 lg:px-8"
              : "w-full min-w-0 max-w-full overflow-x-hidden px-4 pt-0 pb-8 sm:px-6 lg:px-8"
        }
        style={{
          backgroundColor: "var(--teacher-bg)",
          color: "var(--teacher-fg)",
        }}
      >
        {children}
      </div>
      {immersiveLiveClass ? null : <TeacherToolkitFloat />}
    </div>
  );
}
