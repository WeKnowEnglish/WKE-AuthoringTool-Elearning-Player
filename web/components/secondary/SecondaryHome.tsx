"use client";

import type { StudentClassMembership } from "@/lib/data/student-classes";
import type { StudentHomeworkCard } from "@/lib/class-homework/types";
import type { StudentClassLiveSession } from "@/lib/student-live/types";
import { StudentHomeGreeting } from "@/components/primary/StudentHomeGreeting";
import { TodaysLearningAssignments } from "@/components/primary/TodaysLearningAssignments";
import { StudentLiveNowStrip } from "@/components/classroom/StudentLiveNowStrip";
import { SecondaryHomeGoalTracker } from "@/components/secondary/SecondaryHomeGoalTracker";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import { useEffect } from "react";
import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";

type Props = {
  classMemberships?: StudentClassMembership[];
  liveSessions?: StudentClassLiveSession[];
  assignedHomework?: StudentHomeworkCard[];
};

/** Secondary portal Home — greeting on top; goal + assignments side by side. */
export function SecondaryHome({
  classMemberships = [],
  liveSessions = [],
  assignedHomework = [],
}: Props) {
  useEffect(() => {
    recordAppDiagnostic("student", "mark", "secondary_hub_loaded", {
      classCount: classMemberships.length,
      homeworkCount: assignedHomework.length,
    });
  }, [assignedHomework.length, classMemberships.length]);

  return (
    <section className="mx-auto max-w-6xl space-y-4">
      <StudentLiveNowStrip sessions={liveSessions} tone="secondary" learningBand="a2" />

      <header className="rounded-2xl border border-[var(--sec-border)] bg-[var(--sec-card)] p-5 sm:p-6">
        <p className={secondaryUi.eyebrow}>Home</p>
        <StudentHomeGreeting
          id="secondary-home-greeting"
          className={`mt-1 ${secondaryUi.pageTitle}`}
        />
        <p className={`mt-2 ${secondaryUi.bodyMuted}`}>
          Check your goal, then continue studying or open any assignments.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <div className="min-w-0">
          <SecondaryHomeGoalTracker />
        </div>
        <div className="min-w-0 [&_section]:h-full">
          <TodaysLearningAssignments
            enrolled={classMemberships.length > 0}
            items={assignedHomework}
            tone="secondary"
            homeworkPathPrefix="/secondary/homework"
            joinHref="/join-class"
            showGreeting={false}
          />
        </div>
      </div>
    </section>
  );
}
