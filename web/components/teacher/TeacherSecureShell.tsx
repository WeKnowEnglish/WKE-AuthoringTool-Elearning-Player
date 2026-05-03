"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { teacherSignOut } from "@/lib/actions/auth";
import {
  TeacherEditorHeaderProvider,
  TeacherNavEditorTitle,
  useLessonToolbarSlot,
} from "@/components/teacher/TeacherEditorHeaderContext";
import { TeacherPrimaryTabs } from "@/components/teacher/TeacherPrimaryTabs";
import { SoftChromePresetSwatches } from "@/components/ui/SoftChromePresetSwatches";
import {
  getSoftChromePreset,
  teacherSoftChromeStore,
  type SoftChromePresetId,
} from "@/lib/soft-chrome-theme";

type Props = {
  userEmail: string;
  children: React.ReactNode;
};

/** Lesson editor: edge-to-edge canvas (no horizontal inset). */
function isLessonEditorPath(pathname: string | null) {
  if (!pathname) return false;
  return /^\/teacher\/modules\/[^/]+\/lessons\/[^/]+/.test(pathname);
}

function TeacherChromeHeader({
  userEmail,
  headerBackground,
  presetId,
  onPresetChange,
}: {
  userEmail: string;
  headerBackground: string;
  presetId: SoftChromePresetId;
  onPresetChange: (id: SoftChromePresetId) => void;
}) {
  const pathname = usePathname();
  const lessonEditorFullBleed = isLessonEditorPath(pathname);
  const headerRef = useRef<HTMLElement | null>(null);
  const lessonToolbarSlot = useLessonToolbarSlot();

  useLayoutEffect(() => {
    if (!lessonEditorFullBleed) {
      document.documentElement.style.removeProperty("--lesson-editor-toolbar-height");
      return;
    }
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const sync = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--lesson-editor-toolbar-height", `${h}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--lesson-editor-toolbar-height");
    };
    /** Toolbar slot updates change header height; ResizeObserver sees that without re-subscribing. */
  }, [lessonEditorFullBleed]);

  return (
    <header
      ref={headerRef}
      className="shrink-0 border-b border-black/[0.08] px-2 py-1 sm:px-3"
      style={{ backgroundColor: headerBackground }}
    >
      <div className="grid w-full grid-cols-1 items-center gap-y-2 gap-x-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-x-1 sm:gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 sm:justify-self-start">
          <Link href="/teacher" className="shrink-0 text-sm font-bold sm:text-base">
            Teacher
          </Link>
          <TeacherNavEditorTitle />
          {lessonToolbarSlot ?
            <>
              <span className="hidden h-5 w-px shrink-0 bg-neutral-200 sm:block" aria-hidden />
              <div className="flex min-w-0 flex-wrap items-center gap-0.5">{lessonToolbarSlot}</div>
            </>
          : null}
        </div>
        <div className="flex justify-center justify-self-center sm:col-start-2 sm:row-start-1">
          <TeacherPrimaryTabs />
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
          <Link href="/" className="shrink-0 text-blue-700 underline">
            Student site
          </Link>
          <form action={teacherSignOut}>
            <button
              type="submit"
              className="rounded px-1 text-red-700 underline hover:bg-red-50 active:bg-red-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function TeacherSecureShell({ userEmail, children }: Props) {
  const pathname = usePathname();
  const lessonEditorFullBleed = isLessonEditorPath(pathname);
  const presetId = useSyncExternalStore(
    teacherSoftChromeStore.subscribe,
    teacherSoftChromeStore.getSnapshot,
    teacherSoftChromeStore.getServerSnapshot,
  );
  const preset = getSoftChromePreset(presetId);
  const pageBackground = preset.page;

  return (
    <TeacherEditorHeaderProvider>
      <div
        className={
          lessonEditorFullBleed ?
            "flex h-dvh min-h-0 flex-col overflow-hidden"
          : "min-h-screen"
        }
        style={{ backgroundColor: pageBackground }}
      >
        <TeacherChromeHeader
          userEmail={userEmail}
          headerBackground={preset.header}
          presetId={presetId}
          onPresetChange={teacherSoftChromeStore.persist}
        />
        <div
          className={
            lessonEditorFullBleed ?
              "flex min-h-0 flex-1 flex-col overflow-hidden px-0"
            : "w-full max-w-none px-4 pt-0 pb-8 sm:px-6 lg:px-8"
          }
          style={{ backgroundColor: pageBackground }}
        >
          {children}
        </div>
      </div>
    </TeacherEditorHeaderProvider>
  );
}
