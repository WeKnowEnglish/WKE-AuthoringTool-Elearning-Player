"use server";

import {
  buildQuizCompilation,
  finalizeQuizCompilation,
  type TestStartQuizQuestion,
} from "@/lib/curated-sentences/quiz-compiler";
import type { QuizBuildOptions, QuizCompilerDebug, QuizTopicId } from "@/lib/curated-sentences/quiz-compiler-types";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { resolveMediaUrlsForSlides } from "@/lib/teststartpage/resolve-quiz-media";

/**
 * Build test-start interactions and attach `image_url` from `media_assets` when possible.
 * Without `SUPABASE_SERVICE_ROLE_KEY`, returns payloads without images.
 */
export async function loadTestStartQuizWithMedia(
  topicId: QuizTopicId,
  seed?: string,
  buildOptions?: Partial<QuizBuildOptions>,
): Promise<{ questions: TestStartQuizQuestion[]; debug: QuizCompilerDebug }> {
  const state = buildQuizCompilation(topicId, seed, buildOptions);
  const supabase = createServiceRoleSupabase();
  if (!supabase) {
    return finalizeQuizCompilation(state, []);
  }
  const rows = state.slides.map((s) => s.row);
  const urls = await resolveMediaUrlsForSlides(rows, supabase);
  return finalizeQuizCompilation(state, urls);
}
