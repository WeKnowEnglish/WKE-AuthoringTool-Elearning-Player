"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { StudentStorageBootstrap } from "@/components/auth/StudentStorageBootstrap";
import { StudentClassMenu } from "@/components/student-hub/StudentClassMenu";
import { StudentClassSelectorOverlay } from "@/components/student-hub/StudentClassSelectorOverlay";
import { MasterySyncDebugPanel } from "@/components/mastery/MasterySyncDebugPanel";
import { StudentShell } from "@/components/kid-ui/StudentShell";
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
  const bareChrome =
    pathname === "/" ||
    pathname === "/home" ||
    pathname === "/primary" ||
    pathname.startsWith("/primary/homework/") ||
    pathname === "/join-class" ||
    pathname === "/secondary/login" ||
    pathname === "/testprimary";

  const autoPromptOpen =
    !bareChrome && classMemberships.length === 0 && !autoPromptDismissed;
  const overlayOpen = classSelectorOpen || autoPromptOpen;

  if (bareChrome) {
    return (
      <>
        {showMasterySyncDebug ? <MasterySyncDebugPanel /> : null}
        <StudentClassSelectorOverlay
          open={overlayOpen}
          onClose={() => {
            setClassSelectorOpen(false);
            setAutoPromptDismissed(true);
          }}
          memberships={classMemberships}
        />
        <StudentStorageBootstrap />
        {children}
      </>
    );
  }
  const onGrammar = pathname.startsWith("/grammar");
  const wide =
    onGrammar || pathname === "/secondary" || pathname.startsWith("/secondary/");
  const onSecondary = pathname === "/secondary" || pathname.startsWith("/secondary/");
  return (
    <StudentShell
      wide={wide}
      compact={wide}
      fullWidth={onSecondary}
      hidePrimaryNav={onSecondary}
      homeHref={onSecondary ? "/secondary" : "/primary"}
      learnHref="/primary?nav=learn"
      classMenu={
        <StudentClassMenu
          memberships={classMemberships}
          onOpenClassSelector={() => setClassSelectorOpen(true)}
          className="rounded-md border-2 border-neutral-900 px-3 py-2 text-sm font-semibold transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] hover:bg-neutral-100 active:scale-[0.96] active:bg-neutral-200 motion-reduce:transition-none motion-reduce:active:scale-100"
        />
      }
    >
      {showMasterySyncDebug ? <MasterySyncDebugPanel /> : null}
      <StudentClassSelectorOverlay
        open={overlayOpen}
        onClose={() => {
          setClassSelectorOpen(false);
          setAutoPromptDismissed(true);
        }}
        memberships={classMemberships}
      />
      <StudentStorageBootstrap />
      {children}
    </StudentShell>
  );
}
