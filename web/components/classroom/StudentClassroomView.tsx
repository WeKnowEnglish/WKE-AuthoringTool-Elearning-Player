"use client";

import { Suspense, useEffect } from "react";
import type { StudentClassMembership } from "@/lib/data/student-classes";
import type { ClassPost } from "@/lib/class-posts/types";
import type { StudentHomeworkCard } from "@/lib/class-homework/types";
import type { StudentClassLiveSession } from "@/lib/student-live/types";
import type { StudentClassMaterial } from "@/lib/class-lessons/types";
import type { StudentClassSchedule } from "@/lib/class-schedule/types";
import {
  DEFAULT_STUDENT_CLASSROOM_TAB_SETTINGS,
  type ClassroomTabId,
  type StudentClassroomTabSettings,
} from "@/lib/classroom/classroom-tabs";
import { ClassroomShell } from "@/components/classroom/ClassroomShell";
import { ClassroomStream } from "@/components/classroom/ClassroomStream";
import { ClassPostFeed } from "@/components/classroom/ClassPostFeed";
import { ClassMaterialsList } from "@/components/classroom/ClassMaterialsList";
import { ClassMeetingSchedule } from "@/components/classroom/ClassMeetingSchedule";
import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";

type Props = {
  membership: StudentClassMembership;
  memberships: StudentClassMembership[];
  posts: ClassPost[];
  materials?: StudentClassMaterial[];
  schedule?: StudentClassSchedule;
  liveSession?: StudentClassLiveSession | null;
  recentHomework?: StudentHomeworkCard[];
  homeworkBasePath?: "/primary" | "/secondary";
  homeHref: string;
  homeLabel?: string;
  tone?: "primary" | "secondary";
  initialTab?: ClassroomTabId;
  tabSettings?: StudentClassroomTabSettings;
};

/**
 * Async private Classroom shell for an enrolled class.
 */
export function StudentClassroomView({
  membership,
  memberships,
  posts,
  materials = [],
  schedule = { slots: [], nextMeeting: null },
  liveSession = null,
  recentHomework = [],
  homeworkBasePath = "/primary",
  homeHref,
  homeLabel = "Back to home",
  tone = "primary",
  initialTab = "stream",
  tabSettings = membership.studentTabs ?? DEFAULT_STUDENT_CLASSROOM_TAB_SETTINGS,
}: Props) {
  useEffect(() => {
    recordAppDiagnostic("student", "class", "classroom_opened", {
      classTitle: membership.title,
      live: Boolean(liveSession),
    }, { classId: membership.classId, status: "succeeded" });
  }, [liveSession, membership.classId, membership.title]);

  const noticeboardHref = tabSettings.noticeboard
    ? `${homeworkBasePath}/class/${encodeURIComponent(membership.classId)}?tab=noticeboard`
    : undefined;
  const scheduleHref = tabSettings.schedule
    ? `${homeworkBasePath}/class/${encodeURIComponent(membership.classId)}?tab=schedule`
    : undefined;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-sm font-semibold text-[var(--pl-muted)]">
          Loading classroom…
        </div>
      }
    >
      <ClassroomShell
        classTitle={membership.title}
        currentClass={membership}
        memberships={memberships}
        homeHref={homeHref}
        homeLabel={homeLabel}
        liveSession={liveSession}
        tone={tone}
        initialTab={initialTab}
        tabSettings={tabSettings}
      >
        {(tab) => {
          if (tab === "schedule" && tabSettings.schedule) {
            return (
              <div className="mx-auto w-full max-w-3xl">
                <ClassMeetingSchedule
                  schedule={schedule}
                  tone={tone}
                  livePhase={liveSession?.phase ?? null}
                  liveMeetingSlotId={liveSession?.meetingSlotId ?? null}
                />
              </div>
            );
          }
          if (tab === "noticeboard" && tabSettings.noticeboard) {
            return (
              <div className="mx-auto w-full max-w-3xl">
                <ClassPostFeed posts={posts} tone={tone} showPinnedSection />
              </div>
            );
          }
          if (tab === "materials" && tabSettings.materials) {
            return (
              <div className="mx-auto w-full max-w-3xl">
                <ClassMaterialsList materials={materials} tone={tone} />
              </div>
            );
          }
          return (
            <ClassroomStream
              posts={posts}
              schedule={schedule}
              recentHomework={recentHomework}
              homeworkBasePath={homeworkBasePath}
              tone={tone}
              noticeboardHref={noticeboardHref}
              scheduleHref={scheduleHref}
              liveSession={liveSession}
            />
          );
        }}
      </ClassroomShell>
    </Suspense>
  );
}
