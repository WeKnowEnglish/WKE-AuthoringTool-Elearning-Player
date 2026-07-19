import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import type {
  BoardOwnerType,
  SerializedBoardDocument,
  SubmissionType,
  WhiteboardTemplateConfig,
} from "@/lib/whiteboard/domain";

export async function persistSubmission(input: {
  roundId: string;
  liveblocksRoomId: string;
  boardId: string;
  ownerType: BoardOwnerType;
  ownerId: string;
  contributorIds: string[];
  revision: number;
  submissionType: SubmissionType;
  document: SerializedBoardDocument;
  previewDataUrl?: string | null;
  previewPath?: string | null;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;

  await supabase.from("whiteboard_submissions").upsert(
    {
      id: `${input.roundId}:${input.boardId}:${input.revision}`,
      round_id: input.roundId,
      liveblocks_room_id: input.liveblocksRoomId,
      board_id: input.boardId,
      owner_type: input.ownerType,
      owner_id: input.ownerId,
      contributor_ids: input.contributorIds,
      revision: input.revision,
      submission_type: input.submissionType,
      document_json: input.document,
      preview_data_url: input.previewDataUrl ?? null,
      preview_path: input.previewPath ?? null,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "round_id,board_id,revision" },
  );
}

/** Active (non-ended) whiteboard round for a Virtual Classroom session, if any. */
export async function getActiveWhiteboardRoundForSession(sessionId: string): Promise<{
  id: string;
  liveblocksRoomId: string;
  joinCode: string;
  phase: string;
} | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("whiteboard_rounds")
    .select("id, liveblocks_room_id, join_code, phase")
    .eq("session_id", sessionId)
    .neq("phase", "ENDED")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id as string,
    liveblocksRoomId: data.liveblocks_room_id as string,
    joinCode: data.join_code as string,
    phase: data.phase as string,
  };
}

export async function upsertRoundMeta(input: {
  roundId: string;
  liveblocksRoomId: string;
  joinCode: string;
  hostUserId: string;
  phase: string;
  mode: string;
  prompt: { title: string; instructions: string };
  settings: unknown;
  background: unknown;
  classId?: string | null;
  sessionId?: string | null;
  groupSubmitPolicy?: string;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;

  await supabase.from("whiteboard_rounds").upsert(
    {
      id: input.roundId,
      liveblocks_room_id: input.liveblocksRoomId,
      join_code: input.joinCode,
      host_user_id: input.hostUserId,
      phase: input.phase,
      mode: input.mode,
      prompt_json: input.prompt,
      settings_json: input.settings,
      background_json: input.background,
      class_id: input.classId ?? null,
      session_id: input.sessionId ?? null,
      group_submit_policy: input.groupSubmitPolicy ?? "any_member",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
}

export async function listTemplates(hostUserId: string): Promise<WhiteboardTemplateConfig[]> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return readLocalFallbackTemplates(hostUserId);

  const { data, error } = await supabase
    .from("whiteboard_templates")
    .select("id, title, instructions, mode, timer_minutes, background_json, settings_json, stamp_pack_id")
    .eq("host_user_id", hostUserId)
    .order("created_at", { ascending: false });

  if (error || !data) return readLocalFallbackTemplates(hostUserId);

  return data.map((row) => ({
    id: row.id as string,
    title: row.title as string,
    instructions: row.instructions as string,
    mode: row.mode as WhiteboardTemplateConfig["mode"],
    timerMinutes: row.timer_minutes as number,
    background: row.background_json as WhiteboardTemplateConfig["background"],
    settings: (row.settings_json ?? {}) as WhiteboardTemplateConfig["settings"],
    stampPackId: (row.stamp_pack_id as string) || "default",
  }));
}

export async function saveTemplate(
  hostUserId: string,
  template: WhiteboardTemplateConfig,
): Promise<WhiteboardTemplateConfig | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) {
    writeLocalFallbackTemplate(hostUserId, template);
    return { ...template, id: template.id ?? `local_${Date.now()}` };
  }

  const row = {
    id: template.id ?? undefined,
    host_user_id: hostUserId,
    title: template.title,
    instructions: template.instructions,
    mode: template.mode,
    timer_minutes: template.timerMinutes,
    background_json: template.background,
    settings_json: template.settings,
    stamp_pack_id: template.stampPackId,
  };

  const { data, error } = template.id
    ? await supabase.from("whiteboard_templates").upsert(row).select("id").single()
    : await supabase.from("whiteboard_templates").insert(row).select("id").single();

  if (error || !data) {
    writeLocalFallbackTemplate(hostUserId, template);
    return { ...template, id: template.id ?? `local_${Date.now()}` };
  }

  return { ...template, id: data.id as string };
}

/** In-memory fallback when service role / migration is unavailable (dev pilot). */
const localTemplates = new Map<string, WhiteboardTemplateConfig[]>();

function readLocalFallbackTemplates(hostUserId: string): WhiteboardTemplateConfig[] {
  return localTemplates.get(hostUserId) ?? [];
}

function writeLocalFallbackTemplate(hostUserId: string, template: WhiteboardTemplateConfig): void {
  const list = localTemplates.get(hostUserId) ?? [];
  const id = template.id ?? `local_${Date.now()}`;
  const next = [{ ...template, id }, ...list.filter((t) => t.id !== id)];
  localTemplates.set(hostUserId, next.slice(0, 20));
}
