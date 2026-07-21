import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { MasterLexiconOverride } from "@/lib/vocabulary/platform-lexicon";

type DbRow = {
  id: string;
  primary_topic: string | null;
  topics: unknown;
  primary_stage: string | null;
  updated_at: string;
  updated_by: string | null;
};

function mapTopics(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
}

export function mapMasterOverrideRow(row: DbRow): MasterLexiconOverride {
  return {
    id: row.id,
    primaryTopic: row.primary_topic,
    topics: mapTopics(row.topics),
    primaryStage: row.primary_stage,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

async function requireTeacher(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }
}

export const listMasterLexiconOverrides = cache(async function listMasterLexiconOverrides(): Promise<
  MasterLexiconOverride[]
> {
  noStore();
  await requireTeacher();
  const supabase = await createClient();
  const { data, error } = await supabase.from("platform_lexicon_overrides").select("*");
  if (error) {
    if (/platform_lexicon_overrides|schema cache|does not exist/i.test(error.message)) {
      return [];
    }
    throw error;
  }
  return ((data ?? []) as DbRow[]).map(mapMasterOverrideRow);
});
