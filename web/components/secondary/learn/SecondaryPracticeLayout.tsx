"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SecondaryFocusWordsPanel } from "@/components/secondary/SecondaryFocusWordsPanel";
import { SecondaryFocusWordRow } from "@/components/secondary/learn/SecondaryFocusWordRow";
import { SecondaryPracticeShellHeader } from "@/components/secondary/learn/SecondaryPracticeShellHeader";
import { SecondaryWordLearnDrawer } from "@/components/secondary/learn/SecondaryWordLearnDrawer";
import {
  getFocusHighlightWordIds,
  sortWordItemIdsByWeakness,
} from "@/lib/secondary/secondary-mastery-display";
import { useSecondaryDebugEnabled } from "@/lib/secondary/use-secondary-debug-enabled";
import { useSecondaryTodaySession } from "@/lib/secondary/use-secondary-today-session";

type WordListProps = {
  hydrated: boolean;
  hasWordsToday: boolean;
  warmUpWordItemIds: string[];
  focusWordItemIds: string[];
  focusHighlightWordIds: ReadonlySet<string>;
  newTodayWordItemIds: ReadonlySet<string>;
  selectionReasons: Record<string, string>;
  debugEnabled: boolean;
  selectedWordItemId: string | null;
  onWordSelect: (wordItemId: string, trigger: HTMLButtonElement) => void;
  inert?: boolean;
};

export function SecondaryPracticeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/secondary/login";
  const { todaySession, hydrated, sessionRevision } = useSecondaryTodaySession();
  const debugEnabled = useSecondaryDebugEnabled();
  const [selectedWordItemId, setSelectedWordItemId] = useState<string | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const focusWordIds = todaySession?.todayWordItemIds ?? [];
  const warmUpWordIds = todaySession?.warmUpWordItemIds ?? [];
  const sessionWordIds = todaySession?.allWordItemIds ?? [];
  const hasWordsToday = sessionWordIds.length > 0;

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
    setSelectedWordItemId((current) => {
      if (current === wordItemId) {
        return null;
      }
      return wordItemId;
    });
  }

  function handleCloseDrawer() {
    setSelectedWordItemId(null);
  }

  const drawerOpen = selectedWordItemId !== null;

  const wordListProps: WordListProps = {
    hydrated,
    hasWordsToday,
    warmUpWordItemIds: sortedWarmUpWordItemIds,
    focusWordItemIds: sortedFocusWordItemIds,
    focusHighlightWordIds,
    newTodayWordItemIds,
    selectionReasons,
    debugEnabled,
    selectedWordItemId,
    onWordSelect: handleWordSelect,
    inert: drawerOpen,
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="secondary-practice w-full">
        <SecondaryPracticeShellHeader />

        <SecondaryFocusWordRow {...wordListProps} />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <SecondaryFocusWordsPanel {...wordListProps} />

          <main
            className="min-w-0 flex-1"
            {...(drawerOpen ? { inert: true } : {})}
          >
            {children}
          </main>
        </div>
      </div>

      <SecondaryWordLearnDrawer
        wordItemId={selectedWordItemId}
        open={drawerOpen}
        isFocusWord={
          selectedWordItemId !== null && focusHighlightWordIds.has(selectedWordItemId)
        }
        sessionWordItemIds={sessionWordIds}
        dateKey={todaySession?.dateKey ?? ""}
        returnFocusRef={returnFocusRef}
        onClose={handleCloseDrawer}
      />
    </>
  );
}
