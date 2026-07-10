"use client";

import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SecondaryFocusWordsPanel } from "@/components/secondary/SecondaryFocusWordsPanel";
import { SecondaryDailyWordIntroOverlay } from "@/components/secondary/intro/SecondaryDailyWordIntroOverlay";
import { SecondaryFocusWordSwapTransition } from "@/components/secondary/intro/SecondaryFocusWordSwapTransition";
import { SecondaryFocusWordRow } from "@/components/secondary/learn/SecondaryFocusWordRow";
import { SecondaryWordLearnDrawer } from "@/components/secondary/learn/SecondaryWordLearnDrawer";
import { useMinWidthMedia } from "@/lib/hooks/use-min-width-media";
import {
  getFocusHighlightWordIds,
  sortWordItemIdsByWeakness,
} from "@/lib/secondary/secondary-mastery-display";
import { useStudentStorageIdReady } from "@/lib/auth/use-student-storage-id-ready";
import { hasSeenDailyWordIntro } from "@/lib/secondary/secondary-daily-word-intro";
import { useSecondaryDebugEnabled } from "@/lib/secondary/use-secondary-debug-enabled";
import { useSecondaryFocusWordSwapQueue } from "@/lib/secondary/use-secondary-focus-word-swap-queue";
import { useSecondaryTodaySession } from "@/lib/secondary/use-secondary-today-session";
import { useSecondaryWordImages } from "@/lib/secondary/use-secondary-word-images";

type WordListProps = {
  hydrated: boolean;
  hasWordsToday: boolean;
  warmUpWordItemIds: string[];
  focusWordItemIds: string[];
  focusHighlightWordIds: ReadonlySet<string>;
  newTodayWordItemIds: ReadonlySet<string>;
  selectionReasons: Record<string, string>;
  imageUrlsByWordId: Record<string, string | null>;
  debugEnabled: boolean;
  selectedWordItemId: string | null;
  onWordSelect: (wordItemId: string, trigger: HTMLButtonElement) => void;
  inert?: boolean;
};

export function SecondaryPracticeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/secondary/login";
  const isHomePage = pathname === "/secondary";
  const { todaySession, completion, hydrated, sessionRevision } = useSecondaryTodaySession();
  const debugEnabled = useSecondaryDebugEnabled();
  const isDesktopLearnColumn = useMinWidthMedia("(min-width: 1024px)");
  const [selectedWordItemId, setSelectedWordItemId] = useState<string | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const mainAreaRef = useRef<HTMLDivElement>(null);

  const { ready: storageReady, studentId } = useStudentStorageIdReady();
  const dateKey = todaySession?.dateKey ?? "";

  const focusWordIds = todaySession?.todayWordItemIds ?? [];
  const warmUpWordIds = todaySession?.warmUpWordItemIds ?? [];
  const sessionWordIds = todaySession?.allWordItemIds ?? [];
  const hasWordsToday = sessionWordIds.length > 0;
  const imageUrlsByWordId = useSecondaryWordImages(sessionWordIds);
  const selectedWordImageUrl =
    selectedWordItemId !== null ? (imageUrlsByWordId[selectedWordItemId] ?? null) : null;

  const shouldShowIntro =
    storageReady &&
    isHomePage &&
    hydrated &&
    hasWordsToday &&
    Boolean(dateKey) &&
    !hasSeenDailyWordIntro(studentId, dateKey);

  useEffect(() => {
    setIntroOpen(shouldShowIntro);
  }, [shouldShowIntro]);

  const newTodayWordItemIds = useMemo(
    () => new Set(todaySession?.introducedWordItemIds ?? []),
    [todaySession?.introducedWordItemIds, sessionRevision],
  );

  const selectionReasons = useMemo(
    () => todaySession?.selectionReasons ?? {},
    [todaySession?.selectionReasons, sessionRevision],
  );

  const sortedFocusWordItemIds = useMemo(
    () => sortWordItemIdsByWeakness(focusWordIds),
    [focusWordIds, sessionRevision],
  );

  const sortedWarmUpWordItemIds = useMemo(
    () => sortWordItemIdsByWeakness(warmUpWordIds),
    [warmUpWordIds, sessionRevision],
  );

  const focusHighlightWordIds = useMemo(
    () => new Set(getFocusHighlightWordIds(sortedFocusWordItemIds)),
    [sortedFocusWordItemIds],
  );

  function handleWordSelect(wordItemId: string, trigger: HTMLButtonElement) {
    returnFocusRef.current = trigger;
    if (isDesktopLearnColumn) {
      setSelectedWordItemId(wordItemId);
      return;
    }
    setSelectedWordItemId((current) => (current === wordItemId ? null : wordItemId));
  }

  function handleCloseDrawer() {
    setSelectedWordItemId(null);
  }

  function handleIntroDismiss() {
    setIntroOpen(false);
  }

  const { currentSwap, swapModalOpen, acknowledgeCurrentSwap } = useSecondaryFocusWordSwapQueue({
    todaySession,
    sessionRevision,
    studentId,
    introOpen,
    enabled: !isLoginPage,
  });

  const drawerOpen = selectedWordItemId !== null;
  const desktopLearnConstrained =
    isDesktopLearnColumn && drawerOpen && !swapModalOpen;
  const shellInert =
    introOpen || swapModalOpen || (drawerOpen && !isDesktopLearnColumn);

  const drawerProps = {
    wordItemId: selectedWordItemId,
    open: drawerOpen && !swapModalOpen,
    layer: (introOpen ? "aboveIntro" : "default") as "default" | "aboveIntro",
    imageUrl: selectedWordImageUrl,
    isFocusWord:
      selectedWordItemId !== null && focusHighlightWordIds.has(selectedWordItemId),
    sessionWordItemIds: sessionWordIds,
    dateKey,
    returnFocusRef,
    onClose: handleCloseDrawer,
  };

  const wordListProps: WordListProps = {
    hydrated,
    hasWordsToday,
    warmUpWordItemIds: sortedWarmUpWordItemIds,
    focusWordItemIds: sortedFocusWordItemIds,
    focusHighlightWordIds,
    newTodayWordItemIds,
    selectionReasons,
    imageUrlsByWordId,
    debugEnabled,
    selectedWordItemId,
    onWordSelect: handleWordSelect,
    inert: shellInert,
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="secondary-practice w-full" {...(shellInert ? { inert: true } : {})}>
        <SecondaryFocusWordRow {...wordListProps} />

        <div
          className={clsx(
            "flex flex-col gap-4 lg:flex-row lg:items-stretch",
            desktopLearnConstrained &&
              "lg:max-h-[calc(100dvh-5.5rem)] lg:min-h-0 lg:overflow-hidden",
          )}
        >
          <SecondaryFocusWordsPanel {...wordListProps} />

          <div
            ref={mainAreaRef}
            className={clsx(
              "relative min-w-0 flex-1",
              desktopLearnConstrained && "lg:min-h-0 lg:overflow-hidden",
            )}
          >
            <main>{children}</main>
          </div>
        </div>
      </div>

      <SecondaryDailyWordIntroOverlay
        open={introOpen}
        studentId={studentId}
        dateKey={dateKey}
        sessionWordIds={sessionWordIds}
        warmUpWordItemIds={sortedWarmUpWordItemIds}
        focusWordItemIds={sortedFocusWordItemIds}
        selectionReasons={selectionReasons}
        completion={completion}
        imageUrlsByWordId={imageUrlsByWordId}
        selectedWordItemId={selectedWordItemId}
        drawerOpen={drawerOpen}
        onWordSelect={handleWordSelect}
        onDismiss={handleIntroDismiss}
      />

      <SecondaryFocusWordSwapTransition
        open={swapModalOpen}
        swap={currentSwap}
        onContinue={acknowledgeCurrentSwap}
      />

      {isDesktopLearnColumn ? (
        <SecondaryWordLearnDrawer
          {...drawerProps}
          coverage="main"
          centered
          anchorRef={mainAreaRef}
        />
      ) : (
        <SecondaryWordLearnDrawer {...drawerProps} coverage="viewport" />
      )}
    </>
  );
}
