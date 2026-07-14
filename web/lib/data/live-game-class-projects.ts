import { unstable_noStore as noStore } from "next/cache";
import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeLiveGameClassProjectProgress,
  type LiveGameClassProjectProgress,
} from "@/lib/live-game/class-project-progress";

export type LiveGameClassRound = {
  id: string;
  roundNumber: number;
  questionSetTitle: string;
  learningObjective: string;
  endReason: "objective_completed" | "timeout" | "host_ended_early";
  endedAt: string;
};

export type LiveGameClassProjectOverview = {
  project: {
    id: string;
    title: string;
    status: "active" | "completed" | "archived";
    progress: LiveGameClassProjectProgress;
  } | null;
  recentRounds: LiveGameClassRound[];
};

export async function getLiveGameClassProjectOverview(
  classId: string,
): Promise<LiveGameClassProjectOverview> {
  noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) throw new Error("Teacher authentication required.");

  const [projectResult, roundsResult] = await Promise.all([
    supabase
      .from("live_game_class_projects")
      .select("id, title, status, progress")
      .eq("class_id", classId)
      .eq("mode_id", "english_craft")
      .eq("project_key", "expeditions-v1")
      .maybeSingle(),
    supabase
      .from("live_game_report_rounds")
      .select("id, round_number, question_set_title, learning_objective, end_reason, ended_at")
      .eq("class_id", classId)
      .eq("status", "completed")
      .order("ended_at", { ascending: false })
      .limit(5),
  ]);

  if (projectResult.error) throw projectResult.error;
  if (roundsResult.error) throw roundsResult.error;

  const projectRow = projectResult.data as {
    id: string;
    title: string;
    status: "active" | "completed" | "archived";
    progress: unknown;
  } | null;

  const recentRounds = (roundsResult.data ?? []).map((row) => ({
    id: row.id as string,
    roundNumber: row.round_number as number,
    questionSetTitle: row.question_set_title as string,
    learningObjective: row.learning_objective as string,
    endReason: row.end_reason as LiveGameClassRound["endReason"],
    endedAt: row.ended_at as string,
  }));

  return {
    project: projectRow ? {
      id: projectRow.id,
      title: projectRow.title,
      status: projectRow.status,
      progress: normalizeLiveGameClassProjectProgress(projectRow.progress),
    } : null,
    recentRounds,
  };
}
