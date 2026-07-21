"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { SignOutForm } from "@/components/auth/SignOutForm";
import { TeacherPrimaryTabs } from "@/components/teacher/TeacherPrimaryTabs";
import { SoftChromePresetSwatches } from "@/components/ui/SoftChromePresetSwatches";
import type { TeacherTier } from "@/lib/auth/roles";
import {
  getSoftChromePreset,
  teacherSoftChromeStore,
  type SoftChromePresetId,
} from "@/lib/soft-chrome-theme";

type Props = {
  userEmail: string;
  teacherTier?: TeacherTier;
  isAdmin?: boolean;
  children: React.ReactNode;
};

function isWordPackEditorPath(pathname: string): boolean {
  return /^\/teacher\/word-packs\/[^/]+$/.test(pathname);
}

function TeacherChromeHeader({
  userEmail,
  teacherTier,
  isAdmin,
  headerBackground,
  presetId,
  onPresetChange,
}: {
  userEmail: string;
  teacherTier: TeacherTier;
  isAdmin: boolean;
  headerBackground: string;
  presetId: SoftChromePresetId;
  onPresetChange: (id: SoftChromePresetId) => void;
}) {
  return (
    <header
      className="shrink-0 border-b border-black/[0.08] px-2 py-1 sm:px-3"
      style={{ backgroundColor: headerBackground }}
    >
      <div className="grid w-full grid-cols-1 items-center gap-y-2 gap-x-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-x-1 sm:gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 sm:justify-self-start">
          <Link href="/teacher/classes" className="shrink-0 text-sm font-bold sm:text-base">
            Teacher
          </Link>
        </div>
        <div className="flex justify-center justify-self-center sm:col-start-2 sm:row-start-1">
          <TeacherPrimaryTabs teacherTier={teacherTier} isAdmin={isAdmin} />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-xs sm:justify-self-end sm:text-sm">
          <SoftChromePresetSwatches
            headerBackground={headerBackground}
            presetId={presetId}
            onPresetChange={onPresetChange}
          />
          <span className="max-w-[min(42vw,12rem)] truncate text-neutral-600 sm:max-w-[14rem]">
            {userEmail}
          </span>
          <Link href="/primary" className="shrink-0 text-blue-700 underline">
            Student site
          </Link>
          <SignOutForm label="Sign out" />
        </div>
      </div>
    </header>
  );
}

export function TeacherSecureShell({
  userEmail,
  teacherTier = "plus",
  isAdmin = false,
  children,
}: Props) {
  const pathname = usePathname();
  const lockToViewport = isWordPackEditorPath(pathname);
  const presetId = useSyncExternalStore(
    teacherSoftChromeStore.subscribe,
    teacherSoftChromeStore.getSnapshot,
    teacherSoftChromeStore.getServerSnapshot,
  );
  const preset = getSoftChromePreset(presetId);
  const pageBackground = preset.page;
  const teacherChromeVars = {
    "--teacher-chrome-page": preset.page,
    "--teacher-chrome-header": preset.header,
    "--teacher-chrome-card": preset.card,
  } as React.CSSProperties;

  return (
    <div
      className={lockToViewport ? "flex h-dvh flex-col overflow-hidden" : "min-h-screen"}
      style={{ backgroundColor: pageBackground, ...teacherChromeVars }}
    >
      <TeacherChromeHeader
        userEmail={userEmail}
        teacherTier={teacherTier}
        isAdmin={isAdmin}
        headerBackground={preset.header}
        presetId={presetId}
        onPresetChange={teacherSoftChromeStore.persist}
      />
      <div
        className={
          lockToViewport
            ? "flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-2 pb-3 sm:px-6 lg:px-8"
            : "w-full max-w-none px-4 pt-0 pb-8 sm:px-6 lg:px-8"
        }
        style={{ backgroundColor: pageBackground, ...teacherChromeVars }}
      >
        {children}
      </div>
    </div>
  );
}
