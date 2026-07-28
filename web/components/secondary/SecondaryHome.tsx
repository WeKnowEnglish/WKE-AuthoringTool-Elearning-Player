"use client";

import { useStudentDisplayName } from "@/lib/auth/use-student-display-name";
import type { StudentClassMembership } from "@/lib/data/student-classes";
import type { StudentHomeworkCard } from "@/lib/class-homework/types";
import type { StudentClassLiveSession } from "@/lib/student-live/types";
import type { StudentClassSchedule } from "@/lib/class-schedule/types";
import { TodaysLearningAssignments } from "@/components/primary/TodaysLearningAssignments";
import { ClassroomLiveNowJoin } from "@/components/classroom/ClassroomLiveNowJoin";
import { StudentLiveNowStrip } from "@/components/classroom/StudentLiveNowStrip";
import {
  readActiveStudentClassId,
  subscribeActiveStudentClassId,
} from "@/lib/student-classes/active-class";
import { SECONDARY_HOME_CONTINUE_HREF } from "@/lib/secondary/secondary-nav";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";

type Props = {
  classMemberships?: StudentClassMembership[];
  liveSessions?: StudentClassLiveSession[];
  assignedHomework?: StudentHomeworkCard[];
  schedulesByClassId?: Record<string, StudentClassSchedule>;
};

/** Secondary portal Home — class, homework, continue into Learn (Match for now). */
export function SecondaryHome({
  classMemberships = [],
  liveSessions = [],
  assignedHomework = [],
  schedulesByClassId = {},
}: Props) {
  const { displayName, ready: nameReady } = useStudentDisplayName();
  const activeClassId = useSyncExternalStore(
    subscribeActiveStudentClassId,
    readActiveStudentClassId,
    () => null,
  );

  useEffect(() => {
    recordAppDiagnostic("student", "mark", "secondary_hub_loaded", {
      classCount: classMemberships.length,
      homeworkCount: assignedHomework.length,
    });
  }, [assignedHomework.length, classMemberships.length]);

  const activeClass =
    (activeClassId
      ? classMemberships.find((membership) => membership.classId === activeClassId)
      : null) ??
    classMemberships[0] ??
    null;

  const activeClassLive = activeClass
    ? liveSessions.find((session) => session.classId === activeClass.classId)
    : null;

  const activeClassSchedule = activeClass
    ? schedulesByClassId[activeClass.classId]
    : null;

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <header className="rounded-xl border border-sec-border bg-sec-card p-5">
        {!nameReady ? (
          <div className="h-8 w-full max-w-xl animate-pulse rounded-lg bg-sec-panel-muted" aria-hidden />
        ) : (
          <>
            <p className={secondaryUi.eyebrow}>Home</p>
            <h2 className={`mt-1 ${secondaryUi.pageTitle}`}>
              Welcome back{displayName ? `, ${displayName}` : ""}.
            </h2>
            <p className={`mt-2 ${secondaryUi.bodyMuted}`}>
              Check class updates and homework, then continue studying.
            </p>
            <Link
              href={SECONDARY_HOME_CONTINUE_HREF}
              className={`mt-4 inline-flex ${secondaryUi.btnPrimary}`}
            >
              Continue studying
            </Link>
            <p className={`mt-2 ${secondaryUi.caption}`}>
              Or open{" "}
              <Link href="/secondary/learn" className="font-extrabold underline underline-offset-2">
                Learn
              </Link>{" "}
              for today&apos;s full vocabulary path.
            </p>
          </>
        )}
      </header>

      <StudentLiveNowStrip sessions={liveSessions} tone="secondary" learningBand="a2" />

      <TodaysLearningAssignments
        enrolled={classMemberships.length > 0}
        items={assignedHomework}
        tone="secondary"
        homeworkPathPrefix="/secondary/homework"
      />

      {activeClass ? (
        <div className="rounded-xl border border-sec-border bg-sec-card p-4">
          <p className={secondaryUi.cardTitle}>{activeClass.title}</p>
          <p className={`mt-1 ${secondaryUi.bodyMuted}`}>
            {activeClassLive
              ? "Your class is live right now — join below or open the classroom."
              : activeClassSchedule?.nextMeeting
                ? `Next lesson: ${activeClassSchedule.nextMeeting.label}`
                : "Open your classroom for teacher posts and live lessons."}
          </p>
          {activeClassLive ? (
            <div className="mt-3 space-y-2">
              <ClassroomLiveNowJoin session={activeClassLive} tone="secondary" compact />
            </div>
          ) : null}
          <Link
            href={`/secondary/class/${encodeURIComponent(activeClass.classId)}`}
            className={`${activeClassLive ? "mt-2" : "mt-3"} inline-flex ${secondaryUi.btnPrimary}`}
          >
            Open classroom
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-sec-border bg-sec-card p-4">
          <p className={secondaryUi.cardTitle}>Join your class</p>
          <p className={`mt-1 ${secondaryUi.bodyMuted}`}>
            Enter your teacher&apos;s class code so you can see assignments and live lessons.
          </p>
          <Link href="/join-class" className={`mt-3 inline-flex ${secondaryUi.btnSecondary}`}>
            Join a class
          </Link>
        </div>
      )}
    </section>
  );
}
