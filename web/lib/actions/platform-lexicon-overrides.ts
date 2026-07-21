"use server";

import { revalidatePath } from "next/cache";
import { isAdmin, isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { mapMasterOverrideRow } from "@/lib/data/platform-lexicon-overrides";
import {
  normalizeTopicTag,
  parseTopicsInput,
  type MasterLexiconOverride,
} from "@/lib/vocabulary/platform-lexicon";

export type MasterOverrideSaveResult =
  | { ok: true; overrides: MasterLexiconOverride[] }
  | { ok: false; error: string };

const STAGE_SET = new Set([
  "PRE_A1_1",
  "PRE_A1_2",
  "A1_1",
  "A1_2",
  "A2_1",
  "A2_2",
]);

async function requireAdminUser(): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user) || !isAdmin(user)) {
    throw new Error("Admin authentication required.");
  }
  return { id: user.id };
}

export async function saveMasterLexiconOverrides(
  patches: readonly {
    id: string;
    primaryTopic?: string | null;
    topics?: string | string[] | null;
    primaryStage?: string | null;
  }[],
): Promise<MasterOverrideSaveResult> {
  let adminUser: { id: string };
  try {
    adminUser = await requireAdminUser();
  } catch {
    return { ok: false, error: "Admin access required." };
  }

  if (!patches.length) return { ok: true, overrides: [] };

  const service = createServiceRoleSupabase();
  if (!service) {
    return { ok: false, error: "Service role is required to save master overrides." };
  }

  const now = new Date().toISOString();
  const rows: Record<string, unknown>[] = [];

  for (const patch of patches.slice(0, 200)) {
    if (!patch.id.startsWith("pv_")) {
      return { ok: false, error: `Invalid master id: ${patch.id}` };
    }
    const primaryTopic =
      patch.primaryTopic === undefined
        ? undefined
        : patch.primaryTopic === null || !String(patch.primaryTopic).trim()
          ? null
          : normalizeTopicTag(String(patch.primaryTopic));

    let topics: string[] | undefined;
    if (patch.topics !== undefined) {
      if (Array.isArray(patch.topics)) {
        topics = parseTopicsInput(patch.topics.join(","));
      } else if (patch.topics == null) {
        topics = [];
      } else {
        topics = parseTopicsInput(patch.topics);
      }
    }

    let primaryStage: string | null | undefined = patch.primaryStage;
    if (primaryStage !== undefined) {
      if (primaryStage === null || !String(primaryStage).trim()) {
        primaryStage = null;
      } else if (!STAGE_SET.has(String(primaryStage).trim())) {
        return { ok: false, error: `Invalid stage: ${primaryStage}` };
      } else {
        primaryStage = String(primaryStage).trim();
      }
    }

    // Upsert needs full row; load existing when partial.
    const { data: existing } = await service
      .from("platform_lexicon_overrides")
      .select("*")
      .eq("id", patch.id)
      .maybeSingle();

    const nextPrimary =
      primaryTopic !== undefined
        ? primaryTopic
        : ((existing?.primary_topic as string | null | undefined) ?? null);
    const nextTopics =
      topics !== undefined
        ? topics
        : Array.isArray(existing?.topics)
          ? (existing.topics as string[])
          : [];
    const nextStage =
      primaryStage !== undefined
        ? primaryStage
        : ((existing?.primary_stage as string | null | undefined) ?? null);

    // Ensure primary is represented in topics when set.
    const topicsWithPrimary =
      nextPrimary && !nextTopics.includes(nextPrimary)
        ? [nextPrimary, ...nextTopics]
        : nextTopics;

    rows.push({
      id: patch.id,
      primary_topic: nextPrimary,
      topics: topicsWithPrimary,
      primary_stage: nextStage,
      updated_by: adminUser.id,
      updated_at: now,
    });
  }

  const { data, error } = await service
    .from("platform_lexicon_overrides")
    .upsert(rows, { onConflict: "id" })
    .select("*");

  if (error) {
    if (/platform_lexicon_overrides|schema cache|does not exist/i.test(error.message)) {
      return {
        ok: false,
        error: "Apply migration 060_platform_lexicon_overrides in Supabase, then try again.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/teacher/word-packs");
  revalidatePath("/teacher/dictionary/review");

  return {
    ok: true,
    overrides: ((data ?? []) as Parameters<typeof mapMasterOverrideRow>[0][]).map(
      mapMasterOverrideRow,
    ),
  };
}
