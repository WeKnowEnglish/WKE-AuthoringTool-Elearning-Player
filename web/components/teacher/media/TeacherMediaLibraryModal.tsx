"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { TeacherMediaLibraryBrowser } from "@/components/teacher/media/TeacherMediaLibraryBrowser";
import {
  closeTeacherMediaLibrary,
  subscribeTeacherMediaLibrary,
  teacherMediaLibrarySnapshot,
} from "@/components/teacher/media/teacherMediaLibraryShared";

type Props = {
  ownerId: string;
};

function useTeacherMediaLibrary() {
  return useSyncExternalStore(
    subscribeTeacherMediaLibrary,
    teacherMediaLibrarySnapshot,
    teacherMediaLibrarySnapshot,
  );
}

/** Modal shell around TeacherMediaLibraryBrowser (field pickers / MediaUrlControls). */
export function TeacherMediaLibraryModal({ ownerId }: Props) {
  const library = useTeacherMediaLibrary();
  const owns =
    library.open &&
    library.ownerId === ownerId &&
    library.presentation === "modal";

  useEffect(() => {
    if (!owns) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closeTeacherMediaLibrary();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [owns]);

  if (!owns || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Media library"
      onClick={() => closeTeacherMediaLibrary()}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h3 className="truncate font-semibold text-neutral-900">Media library</h3>
          <button
            type="button"
            className="rounded px-2 py-1 text-sm font-semibold text-neutral-600 underline hover:bg-neutral-100"
            onClick={() => closeTeacherMediaLibrary()}
          >
            Close
          </button>
        </div>
        <TeacherMediaLibraryBrowser ownerId={ownerId} />
      </div>
    </div>,
    document.body,
  );
}
