"use server";

import { buildQuizCompilation } from "@/lib/curated-sentences/quiz-compiler";
import type { IndexedSentenceRow, QuizTopicId } from "@/lib/curated-sentences/quiz-compiler-types";
import { normalizeLemmaKey } from "@/lib/curated-sentences/quiz-compiler-loader";
import { rowIdentity } from "@/lib/curated-sentences/quiz-compiler-pick";
import type { WordBucketCatchConfig } from "@/lib/lesson/word-bucket-catch";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { resolveMediaUrlsForSlides } from "@/lib/teststartpage/resolve-quiz-media";

export type WordBucketCatchDeckResult =
  | { ok: true; config: WordBucketCatchConfig }
  | { ok: false; error: string };

function displayWordForRow(row: IndexedSentenceRow): string {
  const v = row.vocabulary;
  const raw = (v?.display_label || v?.forms?.base || v?.lemma || row.target_word).trim();
  return raw || row.lemmaKey;
}

/** Short single token for the large on-screen target label. */
function bucketTargetLabel(row: IndexedSentenceRow): string {
  const raw = displayWordForRow(row);
  const first = (raw.split(/\s+/)[0] ?? raw).trim();
  const stripped = first.replace(/^[^a-zA-Z0-9']+/u, "").replace(/[^a-zA-Z0-9']+$/u, "");
  const t = stripped || first;
  return t.length > 28 ? `${t.slice(0, 26)}…` : t;
}

function shuffleWithSeed<T>(items: T[], seed: string): T[] {
  const out = [...items];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  for (let i = out.length - 1; i > 0; i -= 1) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Build a word-bucket-catch deck for a menu topic: same sentence rows as the quiz compiler,
 * with image URLs from `media_assets` (one batch fetch + in-memory scoring).
 */
export async function loadWordBucketCatchDeck(
  topicId: QuizTopicId,
  seed?: string,
): Promise<WordBucketCatchDeckResult> {
  const effectiveSeed = seed?.trim() || `bucket-${topicId}-${Date.now()}`;
  let state;
  try {
    state = buildQuizCompilation(topicId, effectiveSeed, {
      questionCount: 15,
      difficultyLevel: 2,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not build vocabulary for this topic.";
    return { ok: false, error: msg };
  }
  const rows = state.slides.map((s) => s.row);
  const supabase = createServiceRoleSupabase();
  const urls =
    supabase ? await resolveMediaUrlsForSlides(rows, supabase) : rows.map(() => null as string | null);

  const paired: { row: IndexedSentenceRow; url: string }[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const url = urls[i]?.trim();
    if (!url) continue;
    paired.push({ row: rows[i]!, url });
  }

  const byLemma = new Map<string, { row: IndexedSentenceRow; url: string }>();
  for (const p of paired) {
    const key = normalizeLemmaKey(p.row.lemmaKey);
    if (!byLemma.has(key)) byLemma.set(key, p);
  }
  const unique = [...byLemma.values()];
  if (unique.length < 5) {
    return {
      ok: false,
      error:
        unique.length === 0 ?
          "No pictures were found in the media library for this topic. Add images or tags, or try another topic."
        : `Only ${unique.length} word(s) have pictures for this topic. Need at least 5 for the bucket game.`,
    };
  }

  const shuffled = shuffleWithSeed(unique, effectiveSeed);
  const choiceRows = shuffled.slice(0, 5);
  const waves = [0, 1, 2].map((wi) => {
    const p = choiceRows[wi]!;
    return {
      target_word: bucketTargetLabel(p.row),
      correct_choice_id: rowIdentity(p.row),
    };
  });
  const target_word = waves[0]!.target_word;

  const choices: WordBucketCatchConfig["choices"] = choiceRows.map((p, i) => ({
    id: rowIdentity(p.row),
    image_url: p.url,
    correct: i === 0,
    label: bucketTargetLabel(p.row),
  }));

  const catches_per_wave = 3;
  const config: WordBucketCatchConfig = {
    target_word,
    required_correct_catches: waves.length * catches_per_wave,
    catches_per_wave,
    fall_speed_px_per_sec: 155,
    spawn_interval_ms: 1250,
    item_size_px: 82,
    bucket_width_px: 96,
    bucket_height_px: 56,
    choices,
    waves,
  };

  return { ok: true, config };
}
