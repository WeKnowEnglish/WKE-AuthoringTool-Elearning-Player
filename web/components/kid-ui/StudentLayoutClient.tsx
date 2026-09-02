"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { StudentStorageBootstrap } from "@/components/auth/StudentStorageBootstrap";
import { StudentClassMenu } from "@/components/student-hub/StudentClassMenu";
import { StudentClassSelectorOverlay } from "@/components/student-hub/StudentClassSelectorOverlay";
import { MasterySyncDebugPanel } from "@/components/mastery/MasterySyncDebugPanel";
import { StudentShell } from "@/components/kid-ui/StudentShell";
import { SecondaryPortalShell } from "@/components/secondary/SecondaryPortalShell";
import { useMasterySyncDebugEnabled } from "@/lib/mastery/use-mastery-sync-debug-enabled";
import type { StudentClassMembership } from "@/lib/data/student-classes";

export function StudentLayoutClient({
  children,
  classMemberships,
}: {
  children: React.ReactNode;
  classMemberships: StudentClassMembership[];
}) {
  const pathname = usePathname();
  const showMasterySyncDebug = useMasterySyncDebugEnabled();
  const [classSelectorOpen, setClassSelectorOpen] = useState(false);
  const [autoPromptDismissed, setAutoPromptDismissed] = useState(false);
  const onMarketing =
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/child-safety" ||
    pathname === "/esl-activities-for-kids" ||
    pathname === "/teach-english-online" ||
    pathname === "/english-learning-for-kids-at-home" ||
    pathname === "/resources" ||
    pathname.startsWith("/resources/") ||
    pathname === "/parents" ||
    pathname.startsWith("/parents/");
  const onSecondaryPortal =
    (pathname === "/secondary" || pathname.startsWith("/secondary/")) &&
    pathname !== "/secondary/login" &&
    !pathname.startsWith("/secondary/homework/");
  const bareChrome =
    pathname === "/" ||
    onMarketing ||
    pathname === "/primary" ||
    pathname.startsWith("/primary/learn/easy-readers/") ||
    pathname.startsWith("/primary/homework/") ||
    pathname.startsWith("/primary/class/") ||
    pathname === "/join-class" ||
    pathname === "/primary/login" ||
    pathname === "/secondary/login" ||
    pathname.startsWith("/secondary/homework/") ||
    pathname === "/testprimary";

  const autoPromptOpen =
    !bareChrome &&
    !onSecondaryPortal &&
    classMemberships.length === 0 &&
    !autoPromptDismissed;
  const secondaryAutoPromptOpen =
    onSecondaryPortal && classMemberships.length === 0 && !autoPromptDismissed;
  const overlayOpen =
    classSelectorOpen || autoPromptOpen || secondaryAutoPromptOpen;

  const classSelector = (
    <StudentClassSelectorOverlay
      open={overlayOpen}
      onClose={() => {
        setClassSelectorOpen(false);
        setAutoPromptDismissed(true);
      }}
      memberships={classMemberships}
    />
  );

  if (bareChrome) {
    return (
      <>
        {showMasterySyncDebug ? <MasterySyncDebugPanel /> : null}
        {classSelector}
        <StudentStorageBootstrap />
        {children}
      </>
    );
  }

  if (onSecondaryPortal) {
    return (
      <SecondaryPortalShell
        classMenu={
          <StudentClassMenu
            memberships={classMemberships}
            onOpenClassSelector={() => setClassSelectorOpen(true)}
            className="rounded-md border border-[var(--sec-border,#cbd5e1)] bg-white px-3 py-2 text-sm font-semibold text-[var(--sec-ink,#1e293b)] transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] hover:bg-[var(--sec-panel-muted,#eef2f7)] active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
          />
        }
      >
        {showMasterySyncDebug ? <MasterySyncDebugPanel /> : null}
        {classSelector}
        <StudentStorageBootstrap />
        {children}
      </SecondaryPortalShell>
    );
  }

  const onGrammar = pathname.startsWith("/grammar");
  const wide = onGrammar;
  return (
    <StudentShell
      wide={wide}
      compact={wide}
      classMenu={
        <StudentClassMenu
          memberships={classMemberships}
          onOpenClassSelector={() => setClassSelectorOpen(true)}
          className="rounded-md border-2 border-neutral-900 px-3 py-2 text-sm font-semibold transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] hover:bg-neutral-100 active:scale-[0.96] active:bg-neutral-200 motion-reduce:transition-none motion-reduce:active:scale-100"
        />
      }
    >
      {showMasterySyncDebug ? <MasterySyncDebugPanel /> : null}
      {classSelector}
      <StudentStorageBootstrap />
      {children}
    </StudentShell>
  );
}
