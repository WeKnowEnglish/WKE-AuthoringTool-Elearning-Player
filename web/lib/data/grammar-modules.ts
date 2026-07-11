import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import type { GrammarDifficulty } from "@/lib/grammar-builder/schema";

export type GrammarModulePersistedStatus = "draft" | "published";

export type GrammarModuleRow = {
  slug: string;
  title: string;
  description: string | null;
  difficulty: GrammarDifficulty | null;
  source_file: string;
  thumbnail_emoji: string | null;
  sort_order: number | null;
  topic_group: string | null;
  module_json: unknown;
  status: GrammarModulePersistedStatus;
  updated_at: string;
  updated_by: string | null;
};

const GRAMMAR_MODULE_COLUMNS =
  "slug, title, description, difficulty, source_file, thumbnail_emoji, sort_order, topic_group, module_json, status, updated_at, updated_by";

async function readGrammarModuleRow(
  slug: string,
  audience: "editor" | "student",
): Promise<GrammarModuleRow | null> {
  const admin = createServiceRoleSupabase();
  if (admin) {
    let query = admin.from("grammar_modules").select(GRAMMAR_MODULE_COLUMNS).eq("slug", slug);
    if (audience === "student") {
      query = query.eq("status", "published");
    }
    const { data, error } = await query.maybeSingle();
    if (!error && data) {
      return data as GrammarModuleRow;
    }
  }

  const supabase = await createClient();
  let query = supabase.from("grammar_modules").select(GRAMMAR_MODULE_COLUMNS).eq("slug", slug);
  if (audience === "student") {
    query = query.eq("status", "published");
  }
  const { data, error } = await query.maybeSingle();
  if (error || !data) {
    return null;
  }
  return data as GrammarModuleRow;
}

export async function getGrammarModuleRow(slug: string): Promise<GrammarModuleRow | null> {
  return readGrammarModuleRow(slug, "editor");
}

export async function getPublishedGrammarModuleRow(slug: string): Promise<GrammarModuleRow | null> {
  return readGrammarModuleRow(slug, "student");
}
