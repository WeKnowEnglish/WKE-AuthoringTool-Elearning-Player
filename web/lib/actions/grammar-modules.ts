"use server";

import { revalidatePath } from "next/cache";
import type { GrammarCatalogEntry } from "@/lib/grammar-builder/catalog-schema";
import { getGrammarCatalogEntry } from "@/lib/grammar-builder/load-catalog";
import type { GrammarModule } from "@/lib/grammar-builder/schema";
import {
  safeParseGrammarModule,
  type GrammarModuleParseError,
} from "@/lib/grammar-builder/validate-module";
import { createClient } from "@/lib/supabase/server";
import type { GrammarModulePersistedStatus } from "@/lib/data/grammar-modules";

export type GrammarModuleActionResult =
  | { ok: true; status: GrammarModulePersistedStatus }
  | { ok: false; error: string };

async function requireTeacherAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || user.app_metadata?.role !== "teacher") {
    throw new Error("Teacher authentication required.");
  }

  return { supabase, userId: user.id };
}

function formatParseError(error: GrammarModuleParseError): string {
  const count = error.issues.length;
  if (count === 0) {
    return error.message;
  }
  return `Fix ${count} validation ${count === 1 ? "error" : "errors"} before saving.`;
}

function buildGrammarModuleRow(
  entry: GrammarCatalogEntry,
  module: GrammarModule,
  status: GrammarModulePersistedStatus,
  userId: string,
) {
  return {
    slug: entry.slug,
    title: entry.title,
    description: entry.description ?? null,
    difficulty: entry.difficulty ?? null,
    source_file: entry.file,
    thumbnail_emoji: entry.thumbnailEmoji ?? null,
    sort_order: entry.sortOrder ?? null,
    topic_group: entry.topicGroup ?? null,
    module_json: module,
    status,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };
}

function revalidateGrammarPosterPaths(slug: string) {
  revalidatePath("/grammar");
  revalidatePath(`/grammar/${slug}`);
  revalidatePath("/teacher/grammar");
  revalidatePath(`/teacher/grammar/${slug}`);
}

export async function saveGrammarModuleDraft(
  slug: string,
  moduleJson: unknown,
): Promise<GrammarModuleActionResult> {
  const parsed = safeParseGrammarModule(moduleJson, { posterContentRules: false });
  if (!parsed.success) {
    return { ok: false, error: formatParseError(parsed.error) };
  }

  const entry = getGrammarCatalogEntry(slug);
  if (!entry) {
    return { ok: false, error: "Unknown grammar poster." };
  }

  try {
    const { supabase, userId } = await requireTeacherAuth();

    const { data: existing, error: existingError } = await supabase
      .from("grammar_modules")
      .select("status")
      .eq("slug", slug)
      .maybeSingle();

    if (existingError) {
      return { ok: false, error: existingError.message };
    }

    const nextStatus: GrammarModulePersistedStatus =
      existing?.status === "published" ? "published" : "draft";

    const { error } = await supabase
      .from("grammar_modules")
      .upsert(buildGrammarModuleRow(entry, parsed.data, nextStatus, userId), { onConflict: "slug" });

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidateGrammarPosterPaths(slug);
    return { ok: true, status: nextStatus };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save draft.";
    return { ok: false, error: message };
  }
}

export async function publishGrammarModule(
  slug: string,
  moduleJson: unknown,
): Promise<GrammarModuleActionResult> {
  const parsed = safeParseGrammarModule(moduleJson, { posterContentRules: true });
  if (!parsed.success) {
    return { ok: false, error: formatParseError(parsed.error) };
  }

  const entry = getGrammarCatalogEntry(slug);
  if (!entry) {
    return { ok: false, error: "Unknown grammar poster." };
  }

  try {
    const { supabase, userId } = await requireTeacherAuth();

    const { error } = await supabase
      .from("grammar_modules")
      .upsert(buildGrammarModuleRow(entry, parsed.data, "published", userId), { onConflict: "slug" });

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidateGrammarPosterPaths(slug);
    return { ok: true, status: "published" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not publish poster.";
    return { ok: false, error: message };
  }
}
