import assert from "node:assert/strict";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(url && serviceKey, "Supabase URL and service-role key are required.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const required = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
};

const [writing, templates, collections, completions, rewards, guards] = await Promise.all([
  required(admin.from("homework_writing_submissions").select("homework_id,student_id,status"), "writing"),
  required(admin.from("homework_template_submissions").select("homework_id,student_id,status"), "templates"),
  required(admin.from("homework_collection_attempts").select("homework_id,student_id,status"), "collections"),
  required(admin.from("class_homework_completions").select("homework_id,student_id"), "completions"),
  required(admin.from("primary_reward_events").select("student_id,event_id").like("event_id", "primary:homework:%"), "rewards"),
  required(admin.from("homework_finalization_legacy_orphans").select("homework_id,student_id,format,reconciled_at"), "legacy guards"),
]);

const completionKeys = new Set(completions.map((row) => `${row.homework_id}:${row.student_id}`));
const rewardKeys = new Set(rewards.map((row) => `${row.event_id.slice("primary:homework:".length)}:${row.student_id}`));
const scoped = { writing_prompt: writing, homework_template: templates, graded_track: collections };
const submittedWithoutCompletion = Object.fromEntries(
  Object.entries(scoped).map(([format, rows]) => [
    format,
    rows.filter((row) => row.status === "submitted" && !completionKeys.has(`${row.homework_id}:${row.student_id}`)).length,
  ]),
);
const scopedSubmittedKeys = new Set(
  Object.values(scoped).flat().filter((row) => row.status === "submitted").map((row) => `${row.homework_id}:${row.student_id}`),
);

console.log(JSON.stringify({
  mode: "read-only",
  submittedWithoutCompletion,
  completionsWithoutScopedSubmission: completions.filter((row) => !scopedSubmittedKeys.has(`${row.homework_id}:${row.student_id}`)).length,
  scopedCompletionsWithoutReward: completions.filter((row) => scopedSubmittedKeys.has(`${row.homework_id}:${row.student_id}`) && !rewardKeys.has(`${row.homework_id}:${row.student_id}`)).length,
  guardedLegacyOrphans: guards.length,
  reconciledLegacyOrphans: guards.filter((row) => row.reconciled_at).length,
}, null, 2));
