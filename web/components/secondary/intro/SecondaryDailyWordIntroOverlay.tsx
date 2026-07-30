"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SecondaryButton } from "@/components/secondary/SecondaryButton";
import { SecondaryDailyWordIntroWordList } from "@/components/secondary/intro/SecondaryDailyWordIntroWordList";
import {
  SecondaryIntroModalShell,
  secondaryIntroModalButtonClass,
  secondaryIntroModalFooterClass,
} from "@/components/secondary/intro/SecondaryIntroModalShell";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";
import { useModalFocus } from "@/lib/hooks/use-modal-focus";
import { markDailyWordIntroSeen } from "@/lib/secondary/secondary-daily-word-intro";
import { resolveSecondaryStudyActivityHref } from "@/lib/secondary/secondary-study-activity";
import type { SecondaryTodayCompletion } from "@/lib/secondary/types";

type Props = {
  open: boolean;
  studentId: string;
  dateKey: string;
  sessionWordIds: string[];
  warmUpWordItemIds: string[];
  focusWordItemIds: string[];
  selectionReasons: Record<string, string>;
  completion: SecondaryTodayCompletion;
  imageUrlsByWordId: Record<string, string | null>;
  selectedWordItemId: string | null;
  drawerOpen: boolean;
  onWordSelect: (wordItemId: string, trigger: HTMLButtonElement) => void;
  onDismiss: () => void;
};

export function SecondaryDailyWordIntroOverlay({
  open,
  studentId,
  dateKey,
  sessionWordIds,
  warmUpWordItemIds,
  focusWordItemIds,
  selectionReasons,
  completion,
  imageUrlsByWordId,
  selectedWordItemId,
  drawerOpen,
  onWordSelect,
  onDismiss,
}: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const dismissFocusRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  const totalWords = warmUpWordItemIds.length + focusWordItemIds.length;

  useBodyScrollLock(open && mounted);

  useModalFocus({
    open: mounted && visible && !drawerOpen,
    containerRef: dialogRef,
    returnFocusRef: dismissFocusRef,
  });

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 200);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!mounted) return null;

  function dismissIntro() {
    markDailyWordIntroSeen(studentId, dateKey);
    onDismiss();
  }

  function handleStartStudying() {
    const href = resolveSecondaryStudyActivityHref({
      sessionWordIds,
      dateKey,
      studentId,
      completion,
    });
    dismissIntro();
    if (href !== "/secondary/learn") {
      router.push(href);
    }
  }

  function handleBackHome() {
    dismissIntro();
    router.push("/secondary");
  }

  return (
    <SecondaryIntroModalShell
      dialogRef={dialogRef}
      visible={visible}
      title="Today's words"
      titleId="secondary-daily-word-intro-title"
      description={`${totalWords} words to practice today.`}
      descriptionId="secondary-daily-word-intro-description"
      liveMessage={`Today's words ready — ${totalWords} words to practice.`}
      footer={
        <div className={secondaryIntroModalFooterClass}>
          <SecondaryButton
            type="button"
            className={secondaryIntroModalButtonClass}
            onClick={handleStartStudying}
          >
            Start Studying
          </SecondaryButton>
          <SecondaryButton
            type="button"
            variant="secondary"
            className={secondaryIntroModalButtonClass}
            onClick={handleBackHome}
          >
            Back Home
          </SecondaryButton>
        </div>
      }
    >
      <SecondaryDailyWordIntroWordList
        warmUpWordItemIds={warmUpWordItemIds}
        focusWordItemIds={focusWordItemIds}
        selectionReasons={selectionReasons}
        imageUrlsByWordId={imageUrlsByWordId}
        selectedWordItemId={selectedWordItemId}
        onWordSelect={onWordSelect}
      />
    </SecondaryIntroModalShell>
  );
}
