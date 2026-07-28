"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StudentClassMembership } from "@/lib/data/student-classes";
import {
  readActiveStudentClassId,
  subscribeActiveStudentClassId,
} from "@/lib/student-classes/active-class";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import { useSyncExternalStore } from "react";

type Props = {
  classMemberships: StudentClassMembership[];
};

/**
 * Class tab entry — opens the active (or first) classroom, or prompts to join.
 */
export function SecondaryClassEntry({ classMemberships }: Props) {
  const router = useRouter();
  const activeClassId = useSyncExternalStore(
    subscribeActiveStudentClassId,
    readActiveStudentClassId,
    () => null,
  );

  const target =
    (activeClassId
      ? classMemberships.find((membership) => membership.classId === activeClassId)
      : null) ??
    classMemberships[0] ??
    null;

  useEffect(() => {
    if (!target) return;
    router.replace(`/secondary/class/${encodeURIComponent(target.classId)}`);
  }, [router, target]);

  if (target) {
    return (
      <section className="mx-auto max-w-3xl" aria-busy="true" aria-live="polite">
        <div className="rounded-xl border border-sec-border bg-sec-card p-5">
          <p className={secondaryUi.eyebrow}>Class</p>
          <p className={`mt-2 ${secondaryUi.bodyMuted}`}>Opening {target.title}…</p>
          <div className="mt-4 h-8 w-full max-w-md animate-pulse rounded-lg bg-sec-panel-muted" />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl">
      <header className="rounded-xl border border-dashed border-sec-border bg-sec-card p-5">
        <p className={secondaryUi.eyebrow}>Class</p>
        <h1 className={`mt-1 ${secondaryUi.pageTitle}`}>Join your class</h1>
        <p className={`mt-2 ${secondaryUi.bodyMuted}`}>
          Enter your teacher&apos;s class code to open your classroom for posts, materials, and live
          lessons.
        </p>
        <Link href="/join-class" className={`mt-4 inline-flex ${secondaryUi.btnPrimary}`}>
          Join a class
        </Link>
      </header>
    </section>
  );
}
