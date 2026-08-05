import "server-only";

import type { ClassSessionKind } from "@/lib/class-schedule/class-clock";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { requireWhiteboardTeacher } from "@/lib/whiteboard/product/access";

export type VirtualClassroomSessionHistoryItem = {
  sessionId: string;
  title: string;
  sessionKind: ClassSessionKind;
  occurrenceLabel: string | null;
  startedAt: string;
  endedAt: string | null;
  /** Scheduled occurrence that had student presence (lobby or video). */
  held: boolean;
  studentsPresent: number;
  joinCode: string;
  lessonTitle: string | null;
};

function formatOccurrenceLabel(startsAt: string | null, endsAt: string | null): string | null {
  if (!startsAt) return null;
  const start = new Date(startsAt);
  if (!Number.isFinite(start.getTime())) return null;
  const startText = start.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (!endsAt) return startText;
  const end = new Date(endsAt);
  if (!Number.isFinite(end.getTime())) return startText;
  const endText = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${startText} – ${endText}`;
}

async function countStudentsPresentBySession(
  sessionIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!sessionIds.length) return counts;

  const supabase = createServiceRoleSupabase();
  if (!supabase) return counts;

  const { data, error } = await supabase
    .from("class_session_attendance")
    .select("session_id, role, lobby_first_joined_at, lobby_join_count, join_count")
    .in("session_id", sessionIds)
    .neq("role", "teacher");

  if (error) throw error;

  for (const row of data ?? []) {
    const sessionId = row.session_id as string;
    const hadLobby = Boolean(row.lobby_first_joined_at) || (row.lobby_join_count ?? 0) > 0;
    const hadVideo = (row.join_count ?? 0) > 0;
    if (!hadLobby && !hadVideo) continue;
    counts.set(sessionId, (counts.get(sessionId) ?? 0) + 1);
  }

  return counts;
}

export async function listVirtualClassroomSessionHistoryForClass(
  classId: string,
  limit = 15,
): Promise<VirtualClassroomSessionHistoryItem[]> {
  await requireWhiteboardTeacher(classId, { allowArchived: true });
  const supabase = createServiceRoleSupabase();
  if (!supabase) return [];

  const { data: sessions, error } = await supabase
    .from("class_sessions")
    .select(
      "id, title, join_code, created_at, ended_at, session_kind, occurrence_starts_at, occurrence_ends_at, class_lesson_id, status",
    )
    .eq("class_id", classId)
    .eq("status", "ended")
    .order("ended_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  if (!sessions?.length) return [];

  const lessonIds = [
    ...new Set(
      sessions
        .map((row) => row.class_lesson_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const lessonTitleById = new Map<string, string>();
  if (lessonIds.length) {
    const { data: lessons } = await supabase
      .from("class_lessons")
      .select("id, title")
      .in("id", lessonIds);
    for (const lesson of lessons ?? []) {
      lessonTitleById.set(lesson.id as string, lesson.title as string);
    }
  }

  const sessionIds = sessions.map((row) => row.id as string);
  const presentBySession = await countStudentsPresentBySession(sessionIds);

  const items: VirtualClassroomSessionHistoryItem[] = [];
  for (const row of sessions) {
    const sessionId = row.id as string;
    const sessionKind = ((row.session_kind as ClassSessionKind | null) ?? "extra") as ClassSessionKind;
    const studentsPresent = presentBySession.get(sessionId) ?? 0;
    const occurrenceStartsAt = (row.occurrence_starts_at as string | null) ?? null;
    const occurrenceEndsAt = (row.occurrence_ends_at as string | null) ?? null;
    const held = studentsPresent > 0;

    items.push({
      sessionId,
      title: (row.title as string) ?? "Virtual Classroom",
      sessionKind,
      occurrenceLabel: formatOccurrenceLabel(occurrenceStartsAt, occurrenceEndsAt),
      startedAt: row.created_at as string,
      endedAt: (row.ended_at as string | null) ?? null,
      held,
      studentsPresent,
      joinCode: (row.join_code as string) ?? "",
      lessonTitle:
        row.class_lesson_id ?
          (lessonTitleById.get(row.class_lesson_id as string) ?? null)
        : null,
    });
  }

  return items;
}
