import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import type {
  DocumentParticipationMode,
  DocumentRuntimePhase,
  DocumentTemplateType,
} from "@/lib/document-activity/types";

export async function upsertDocumentRoundMeta(input: {
  roundId: string;
  sessionId: string;
  liveblocksRoomId: string;
  createdBy: string;
  participationMode: DocumentParticipationMode;
  templateType: DocumentTemplateType;
  phase: DocumentRuntimePhase;
  settings: unknown;
  openedAt?: string | null;
  collectedAt?: string | null;
  completedAt?: string | null;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;

  const row: Record<string, unknown> = {
    id: input.roundId,
    session_id: input.sessionId,
    liveblocks_room_id: input.liveblocksRoomId,
    created_by: input.createdBy,
    participation_mode: input.participationMode,
    template_type: input.templateType,
    phase: input.phase,
    settings_json: input.settings,
    updated_at: new Date().toISOString(),
  };
  if (input.openedAt !== undefined) row.opened_at = input.openedAt;
  if (input.collectedAt !== undefined) row.collected_at = input.collectedAt;
  if (input.completedAt !== undefined) row.completed_at = input.completedAt;

  await supabase.from("document_rounds").upsert(row, { onConflict: "id" });
}

export async function getDocumentRoundById(roundId: string): Promise<{
  id: string;
  sessionId: string;
  liveblocksRoomId: string;
  createdBy: string;
  participationMode: DocumentParticipationMode;
  templateType: DocumentTemplateType;
  phase: DocumentRuntimePhase;
  settings: unknown;
} | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("document_rounds")
    .select(
      "id, session_id, liveblocks_room_id, created_by, participation_mode, template_type, phase, settings_json",
    )
    .eq("id", roundId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    sessionId: data.session_id as string,
    liveblocksRoomId: data.liveblocks_room_id as string,
    createdBy: data.created_by as string,
    participationMode: data.participation_mode as DocumentParticipationMode,
    templateType: data.template_type as DocumentTemplateType,
    phase: data.phase as DocumentRuntimePhase,
    settings: data.settings_json,
  };
}

export async function getActiveDocumentRoundForSession(sessionId: string): Promise<{
  id: string;
  liveblocksRoomId: string;
  phase: DocumentRuntimePhase;
} | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("document_rounds")
    .select("id, liveblocks_room_id, phase")
    .eq("session_id", sessionId)
    .neq("phase", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id as string,
    liveblocksRoomId: data.liveblocks_room_id as string,
    phase: data.phase as DocumentRuntimePhase,
  };
}
