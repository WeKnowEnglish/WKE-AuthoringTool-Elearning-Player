import { NextResponse } from "next/server";
import {
  createSecretRoleRound,
  getActiveSecretRoleRoundForSession,
  getSecretRoleHostView,
} from "@/lib/secret-roles/server/persistence";
import type {
  SecretRoleCard,
  SecretRoleLaunchDraft,
  SecretRoleStudent,
} from "@/lib/secret-roles/domain";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";
import { setVcActiveActivity } from "@/lib/virtual-classroom/server/liveblocks-session";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";

type RouteContext = { params: Promise<{ sessionId: string }> };

type LaunchBody = Partial<Omit<SecretRoleLaunchDraft, "cards">> & {
  cards?: Partial<SecretRoleCard>[];
  students?: Partial<SecretRoleStudent>[];
};

function requiredText(value: unknown, label: string, max: number): string {
  const text = typeof value === "string" ? value.trim().slice(0, max) : "";
  if (!text) throw new Error(`${label} is required.`);
  return text;
}
function normalizeBody(body: LaunchBody): {
  draft: SecretRoleLaunchDraft;
  students: SecretRoleStudent[];
} {
  const students = (body.students ?? []).map((student) => ({
    id: requiredText(student.id, "Student id", 160),
    displayName: requiredText(student.displayName, "Student name", 120),
  }));
  const cards = (body.cards ?? []).map((card, index) => ({
    id: requiredText(card.id || `role-${index + 1}`, "Role id", 80)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, ""),
    title: requiredText(card.title, "Role title", 120),
    privateInformation: requiredText(card.privateInformation, "Private information", 2000),
    mission: requiredText(card.mission, "Role mission", 1000),
    sentenceFrames: Array.isArray(card.sentenceFrames)
      ? card.sentenceFrames
          .filter((frame): frame is string => typeof frame === "string")
          .map((frame) => frame.trim().slice(0, 240))
          .filter(Boolean)
          .slice(0, 8)
      : [],
    copies: Math.max(1, Math.min(60, Math.floor(Number(card.copies) || 1))),
  }));
  return {
    students,
    draft: {
      title: requiredText(body.title, "Title", 160),
      scenario: requiredText(body.scenario, "Scenario", 2000),
      learningObjective: requiredText(body.learningObjective, "Learning objective", 500),
      successCriteria: requiredText(body.successCriteria, "Success criteria", 500),
      discussionPrompt: requiredText(body.discussionPrompt, "Decision prompt", 500),
      cards,
    },
  };
}

export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = await getVirtualClassroomSessionById(sessionId);
  if (!session) return NextResponse.json({ error: "Classroom not found." }, { status: 404 });
  if (session.status !== "active") {
    return NextResponse.json({ error: "This classroom has ended." }, { status: 410 });
  }

  let teacher: { userId: string; displayName: string };
  try {
    teacher = await requireVirtualClassroomSessionHost(session);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Host access required." },
      { status: 403 },
    );
  }

  try {
    const existing = await getActiveSecretRoleRoundForSession(session.id);
    let view = existing ? await getSecretRoleHostView(existing.id) : null;
    if (!view) {
      const body = (await request.json()) as LaunchBody;
      const normalized = normalizeBody(body);
      view = await createSecretRoleRound({
        sessionId: session.id,
        createdBy: teacher.userId,
        ...normalized,
      });
    }
    await setVcActiveActivity({
      roomId: session.liveblocksRoomId,
      sessionId: session.id,
      classId: session.classId,
      actorUserId: teacher.userId,
      kind: "secret_roles",
      joinCode: view.round.id,
      label: view.round.title,
      roundId: view.round.id,
      activityRoomId: null,
    });
    return NextResponse.json({ ...view, reused: Boolean(existing) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start Secret Roles." },
      { status: 400 },
    );
  }
}
