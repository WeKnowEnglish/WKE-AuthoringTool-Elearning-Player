"use server";

import type { z } from "zod";
import { normalizeLemmaKey } from "@/lib/curated-sentences/quiz-compiler-loader";
import { MASTER_VOCABULARY, type VocabularyEntry } from "@/lib/curated-sentences/master-vocabulary";
import type { IndexedSentenceRow } from "@/lib/curated-sentences/quiz-compiler-types";
import { mcQuizPayloadSchema } from "@/lib/lesson-schemas";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import {
  fetchImageMediaRowsForLookup,
  pickBestMediaUrlForRow,
} from "@/lib/teststartpage/resolve-quiz-media";

export type ChaseRefuelMcPayload = z.infer<typeof mcQuizPayloadSchema>;

function rowFromVocab(entry: VocabularyEntry): IndexedSentenceRow {
  const tw = (entry.forms.base || entry.lemma).trim();
  return {
    sentence: entry.example_sentence?.trim() || `This is the word: ${tw}.`,
    target_word: tw,
    acceptable_targets: [],
    variant_lexemes: [],
    structure_id: "chase_refuel",
    tags: [],
    cefr: entry.cefr,
    difficulty: entry.difficulty,
    variant_group: "",
    rowIndex: -1,
    lemmaKey: normalizeLemmaKey(entry.lemma),
    vocabulary: entry,
  };
}

function shuffle<T>(items: T[], seedText: string): T[] {
  const out = [...items];
  let h = 0;
  for (let i = 0; i < seedText.length; i += 1) {
    h = (h * 31 + seedText.charCodeAt(i)) >>> 0;
  }
  for (let i = out.length - 1; i > 0; i -= 1) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function labelFor(e: VocabularyEntry): string {
  return (e.display_label || e.forms.base || e.lemma).trim();
}

/** Enough items so students can miss first tries and still see new questions before refuel completes. */
const CHASE_REFUEL_MCQ_TARGET = 24;

/**
 * Many picture-backed MCQs when Supabase resolves images; otherwise text-only with the same lemmas.
 * Without `SUPABASE_SERVICE_ROLE_KEY`, returns text-only questions (still playable).
 *
 * Uses one media-assets fetch and in-memory scoring for many vocab rows (fast). Per-row narrow
 * SQL fallback is skipped here to avoid dozens of sequential round-trips.
 */
export async function loadChaseRefuelMcqs(seed: string = ""): Promise<ChaseRefuelMcPayload[]> {
  const entries = [...MASTER_VOCABULARY.entries];
  const salt = seed || `srv-${Date.now()}`;
  const ordered = shuffle(entries, salt);

  const supabase = createServiceRoleSupabase();
  const mediaRows = supabase ? await fetchImageMediaRowsForLookup(supabase) : [];

  const scored: { entry: VocabularyEntry; url: string | null }[] = [];
  const scanCap = 160;
  for (let i = 0; i < ordered.length && scored.length < scanCap; i += 1) {
    const entry = ordered[i]!;
    const row = rowFromVocab(entry);
    const url = mediaRows.length > 0 ? pickBestMediaUrlForRow(row, mediaRows) : null;
    scored.push({ entry, url });
  }

  const withImage = scored.filter((s) => s.url);
  const withoutImage = scored.filter((s) => !s.url);
  const pool = withImage.length >= 2 ? withImage : withoutImage;
  if (pool.length < 4) return [];

  /** One lemma per question anchor so items stay distinct; distractors may reuse lemmas from other questions. */
  const usedAnchorLemma = new Set<string>();
  const out: ChaseRefuelMcPayload[] = [];

  for (let q = 0; q < CHASE_REFUEL_MCQ_TARGET; q += 1) {
    const anchor = pool.find((p) => !usedAnchorLemma.has(normalizeLemmaKey(p.entry.lemma)));
    if (!anchor) break;
    usedAnchorLemma.add(normalizeLemmaKey(anchor.entry.lemma));
    const anchorKey = normalizeLemmaKey(anchor.entry.lemma);

    const wrong: VocabularyEntry[] = [];
    const candidates = shuffle(
      pool.filter((p) => normalizeLemmaKey(p.entry.lemma) !== anchorKey),
      `${salt}:d${q}`,
    );
    const wrongLemmaThisQuestion = new Set<string>([anchorKey]);
    for (const c of candidates) {
      if (wrong.length >= 3) break;
      const lk = normalizeLemmaKey(c.entry.lemma);
      if (wrongLemmaThisQuestion.has(lk)) continue;
      if (labelFor(c.entry).toLowerCase() === labelFor(anchor.entry).toLowerCase()) continue;
      wrongLemmaThisQuestion.add(lk);
      wrong.push(c.entry);
    }
    if (wrong.length < 3) {
      for (const c of candidates) {
        if (wrong.length >= 3) break;
        if (wrong.some((w) => normalizeLemmaKey(w.lemma) === normalizeLemmaKey(c.entry.lemma))) continue;
        wrong.push(c.entry);
      }
    }
    if (wrong.length < 3) break;

    const optionsRaw = shuffle(
      [
        { id: "a", label: labelFor(anchor.entry) },
        { id: "b", label: labelFor(wrong[0]!) },
        { id: "c", label: labelFor(wrong[1]!) },
        { id: "d", label: labelFor(wrong[2]!) },
      ],
      `${salt}:opts${q}`,
    );
    const correctLabel = labelFor(anchor.entry);
    const correct_option_id = optionsRaw.find((o) => o.label === correctLabel)?.id ?? "a";

    const parsed = mcQuizPayloadSchema.parse({
      type: "interaction",
      subtype: "mc_quiz",
      image_url: anchor.url ?? undefined,
      image_fit: "contain",
      question: anchor.url ? "Which word matches the picture?" : "Which word is best?",
      options: optionsRaw,
      correct_option_id,
      shuffle_options: false,
      guide: { tip_text: "Tap the correct answer." },
    });
    out.push(parsed);
  }

  return out;
}
