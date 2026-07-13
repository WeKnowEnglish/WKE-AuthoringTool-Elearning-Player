import "server-only";

import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { LiveGameQuestionSetRow } from "@/lib/live-game/question-banks/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export class QuestionSetAccessError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 404 = 403,
  ) {
    super(message);
    this.name = "QuestionSetAccessError";
  }
}

export type TeacherSession = {
  userId: string;
  supabase: SupabaseClient;
};

export type QuestionSetAccess = TeacherSession & {
  set: LiveGameQuestionSetRow;
};

const SET_COLUMNS =
  "id, slug, title, level, topic, learning_objective, description, version, status, visibility, sort_order, created_by";

function mapSetRow(row: {
  id: string;
  slug: string;
  title: string;
  level: "A1" | "A2";
  topic: string;
  learning_objective: string;
  description: string;
  version: number;
  status: "draft" | "published";
  visibility: "system" | "teacher";
  sort_order: number;
  created_by?: string | null;
}): LiveGameQuestionSetRow {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    level: row.level,
    topic: row.topic,
    learningObjective: row.learning_objective,
    description: row.description,
    version: row.version,
    status: row.status,
    visibility: row.visibility,
    sortOrder: row.sort_order,
    createdBy: row.created_by ?? null,
  };
}

export async function requireTeacherSession(): Promise<TeacherSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isTeacher(user)) {
    throw new QuestionSetAccessError("Teacher login required.", 401);
  }
  return { userId: user.id, supabase };
}

async function fetchSetRow(
  supabase: SupabaseClient,
  setId: string,
): Promise<LiveGameQuestionSetRow | null> {
  const { data, error } = await supabase
    .from("live_game_question_sets")
    .select(SET_COLUMNS)
    .eq("id", setId)
    .maybeSingle();
  if (error || !data) return null;
  return mapSetRow(data);
}

export async function requirePublishedOrDraftSetRead(setId: string): Promise<QuestionSetAccess> {
  const session = await requireTeacherSession();
  const set = await fetchSetRow(session.supabase, setId);
  if (!set) {
    throw new QuestionSetAccessError("Question set not found.", 404);
  }
  const canRead =
    set.status === "published" ||
    (set.visibility === "teacher" && set.status === "draft" && set.createdBy === session.userId);
  if (!canRead) {
    throw new QuestionSetAccessError("You cannot view this question set.", 403);
  }
  return { ...session, set };
}

export async function requireDraftSetAccess(setId: string): Promise<QuestionSetAccess> {
  const session = await requireTeacherSession();
  const set = await fetchSetRow(session.supabase, setId);
  if (!set) {
    throw new QuestionSetAccessError("Question set not found.", 404);
  }
  if (
    set.visibility !== "teacher" ||
    set.status !== "draft" ||
    set.createdBy !== session.userId
  ) {
    throw new QuestionSetAccessError("You can only edit your own draft question sets.", 403);
  }
  return { ...session, set };
}

export async function requireDuplicateSourceAccess(setId: string): Promise<QuestionSetAccess> {
  const session = await requireTeacherSession();
  const set = await fetchSetRow(session.supabase, setId);
  if (!set) {
    throw new QuestionSetAccessError("Question set not found.", 404);
  }
  if (set.status !== "published") {
    throw new QuestionSetAccessError("Only published question sets can be duplicated.", 403);
  }
  return { ...session, set };
}

export { mapSetRow };
