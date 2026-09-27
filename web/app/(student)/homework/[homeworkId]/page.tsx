import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StudentSessionUnavailablePage } from "@/components/homework/StudentSessionUnavailablePage";
import { StudentHomeworkServiceUnavailablePage } from "@/components/homework/StudentHomeworkServiceUnavailablePage";
import { resolveStudentRouteSession } from "@/lib/auth/student-route-auth";
import {
  homeworkPortalPath,
  resolveHomeworkPortal,
} from "@/lib/class-homework/portal";
import { getHomeworkForStudent } from "@/lib/data/class-homework";
import { learningBandFromUser } from "@/lib/student-classes/portal-paths";

export const metadata: Metadata = {
  title: "Homework | We Know English",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ homeworkId: string }>;
};

/** Canonical assignment link shared by teachers; dispatches to the right player. */
export default async function HomeworkRouterPage({ params }: Props) {
  const { homeworkId } = await params;
  const canonicalPath = `/homework/${encodeURIComponent(homeworkId)}`;
  const session = await resolveStudentRouteSession(canonicalPath);
  if (!session.ok) {
    return <StudentSessionUnavailablePage retryPath={canonicalPath} />;
  }
  const { user } = session;

  const detail = await getHomeworkForStudent(homeworkId, session);
  if (!detail.ok) {
    if (detail.recovery === "retry") {
      return <StudentHomeworkServiceUnavailablePage retryPath={canonicalPath} />;
    }
    notFound();
  }

  const portal = resolveHomeworkPortal(
    detail.homework.payload,
    learningBandFromUser(user),
  );
  redirect(homeworkPortalPath(homeworkId, portal));
}
