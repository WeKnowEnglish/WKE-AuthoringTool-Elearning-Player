import { redirect } from "next/navigation";
import { VirtualClassroomWaitingClient } from "@/components/virtual-classroom/VirtualClassroomWaitingClient";
import { getClassLiveState } from "@/lib/class-schedule/live-state";
import { ensureClassSessionForClock } from "@/lib/class-schedule/ensure-session";
import { createClient } from "@/lib/supabase/server";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";
import { getWaitingRoomState } from "@/lib/virtual-classroom/server/waiting-room-state";
import { requireWhiteboardStudent } from "@/lib/whiteboard/product/access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Waiting room",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ sessionId: string }> };

export default async function VirtualClassroomWaitingPage({ params }: PageProps) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/virtual-classroom/${encodeURIComponent(sessionId)}/waiting`);
  }

  const session = await getVirtualClassroomSessionById(sessionId);
  if (!session || session.status !== "active") {
    redirect("/virtual-classroom/join");
  }

  if (session.classId) {
    try {
      await requireWhiteboardStudent(session.classId);
    } catch {
      redirect("/virtual-classroom/join");
    }
    await ensureClassSessionForClock({
      classId: session.classId,
      mode: "auto",
    }).catch(() => undefined);
    const state = await getClassLiveState(session.classId);
    if (state.phase === "live" && state.canStudentEnterLive) {
      redirect(`/virtual-classroom/${encodeURIComponent(sessionId)}`);
    }
    if (state.phase !== "waiting" && session.classPhase !== "waiting") {
      // Idle or prep — send to join / class hub feel
      if (session.classPhase === "live") {
        redirect(`/virtual-classroom/${encodeURIComponent(sessionId)}`);
      }
    }
    const waitingState = await getWaitingRoomState({
      sessionId,
      viewerUserId: user.id,
      occurrenceLabel: state.occurrenceLabel,
      autoLiveAt: state.autoLiveAt,
    });
    return (
      <VirtualClassroomWaitingClient
        sessionId={sessionId}
        classTitle={session.title}
        occurrenceLabel={state.occurrenceLabel}
        autoLiveAt={state.autoLiveAt}
        initialState={waitingState}
      />
    );
  }

  // Extra / one-off: no waiting room — go live
  redirect(`/virtual-classroom/${encodeURIComponent(sessionId)}`);
}
