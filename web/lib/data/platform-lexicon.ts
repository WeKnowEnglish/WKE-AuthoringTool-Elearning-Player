import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import {
  platformEntryToSearchIndexEntry,
  type PlatformLexiconEntry,
} from "@/lib/vocabulary/platform-lexicon";
import type { TeacherLexiconEntryKind } from "@/lib/vocabulary/teacher-lexicon/types";
import type {
  CefrBandCandidate,
  PartOfSpeech,
  PrimaryStage,
  PrimaryVocabularySearchIndexEntry,
} from "@/lib/vocabulary/primary-candidates";

type DbRow = {
  id: string;
  lemma: string;
  normalized: string;
  entry_kind: string;
  pos: string;
  primary_stage: string | null;
  cefr_band_candidate: string | null;
  primary_topic: string | null;
  learner_definition_en: string | null;
  learner_meaning_vi: string | null;
  note: string | null;
  vocabulary_lane: string;
  status: string;
  source_teacher_entry_id: string | null;
  promoted_by: string | null;
  created_at: string;
  updated_at: string;
};

function mapKind(value: string): TeacherLexiconEntryKind {
  if (value === "phrase" || value === "slang" || value === "name" || value === "other") {
    return value;
  }
  return "word";
}

export function mapPlatformLexiconRow(row: DbRow): PlatformLexiconEntry {
  return {
    id: row.id,
    lemma: row.lemma,
    normalized: row.normalized,
    entryKind: mapKind(row.entry_kind),
    pos: row.pos as PartOfSpeech,
    primaryStage: (row.primary_stage as PrimaryStage | null) ?? null,
    cefrBandCandidate: (row.cefr_band_candidate as CefrBandCandidate | null) ?? null,
    primaryTopic: row.primary_topic,
    learnerDefinitionEn: row.learner_definition_en,
    learnerMeaningVi: row.learner_meaning_vi,
    note: row.note,
    vocabularyLane: row.vocabulary_lane || "general_english",
    status: row.status === "deprecated" ? "deprecated" : "published",
    sourceTeacherEntryId: row.source_teacher_entry_id,
    promotedBy: row.promoted_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

export const listPublishedPlatformLexiconEntries = cache(
  async function listPublishedPlatformLexiconEntries(): Promise<PlatformLexiconEntry[]> {
    noStore();
    await requireTeacher();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("platform_lexicon_entries")
      .select("*")
      .eq("status", "published")
      .order("updated_at", { ascending: false });
    if (error) {
      // Migration not applied yet — degrade to empty.
      if (/platform_lexicon_entries|schema cache|does not exist/i.test(error.message)) {
        return [];
      }
      throw error;
    }
    return ((data ?? []) as DbRow[]).map(mapPlatformLexiconRow);
  },
);

export const listPublishedPlatformSearchEntries = cache(
  async function listPublishedPlatformSearchEntries(): Promise<
    PrimaryVocabularySearchIndexEntry[]
  > {
    const rows = await listPublishedPlatformLexiconEntries();
    return rows.map(platformEntryToSearchIndexEntry);
  },
);

export async function getPlatformLexiconEntriesByIds(
  ids: readonly string[],
): Promise<PlatformLexiconEntry[]> {
  noStore();
  const pvIds = ids.filter((id) => id.startsWith("pv_"));
  if (pvIds.length === 0) return [];
  await requireTeacher();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_lexicon_entries")
    .select("*")
    .in("id", pvIds);
  if (error) {
    if (/platform_lexicon_entries|schema cache|does not exist/i.test(error.message)) {
      return [];
    }
    throw error;
  }
  return ((data ?? []) as DbRow[]).map(mapPlatformLexiconRow);
}
