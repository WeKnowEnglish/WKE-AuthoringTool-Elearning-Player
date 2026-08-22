"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TrialDiscoveryActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveStudentTrialDiscovery(input: {
  classId: string;
  preferredName: string;
  interests?: string;
  englishGoals?: string;
  englishUse?: string;
  confidence?: number | null;
  feelsEasy?: string;
  feelsDifficult?: string;
}): Promise<TrialDiscoveryActionResult> {
  try {
    const classId = input.classId.trim();
    const preferredName = input.preferredName.trim().slice(0, 120);
    if (!classId) return { ok: false, error: "Trial class not found." };
    if (!preferredName) return { ok: false, error: "Tell us what you would like to be called." };
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("save_my_trial_discovery", {
      p_class_id: classId,
      p_preferred_name: preferredName,
      p_interests: input.interests?.trim().slice(0, 400) || null,
      p_english_goals: input.englishGoals?.trim().slice(0, 400) || null,
      p_english_use: input.englishUse?.trim().slice(0, 240) || null,
      p_confidence:
        typeof input.confidence === "number"
          ? Math.max(1, Math.min(Math.round(input.confidence), 5))
          : null,
      p_feels_easy: input.feelsEasy?.trim().slice(0, 240) || null,
      p_feels_difficult: input.feelsDifficult?.trim().slice(0, 240) || null,
    });
    if (error) return { ok: false, error: error.message };
    if (!data || typeof data !== "object" || !(data as { ok?: boolean }).ok) {
      const code = String((data as { error?: unknown } | null)?.error ?? "");
      if (code === "trial_not_found") {
        return { ok: false, error: "This discovery activity is only available in your trial class." };
      }
      return { ok: false, error: "Could not save your answers." };
    }
    revalidatePath(`/primary/class/${classId}`);
    revalidatePath(`/secondary/class/${classId}`);
    revalidatePath(`/teacher/classes/${classId}`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save your answers.",
    };
  }
}
