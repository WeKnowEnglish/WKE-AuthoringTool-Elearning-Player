import assert from "node:assert/strict";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

if (process.env.WKE_002_LIVE_CONFIRMATION !== "linked-project-authorized") {
  throw new Error("Set WKE_002_LIVE_CONFIRMATION=linked-project-authorized for this explicit live test run.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(url && anonKey && serviceKey, "Supabase URL, public key, and service-role key are required.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const studentClient = async (username, pin) => {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({
    email: `${username.trim().toLowerCase()}@students.wke.internal`,
    password: pin,
  });
  assert.ifError(error);
  return client;
};

const primary = await studentClient(
  process.env.WKE_001_PRIMARY_USERNAME,
  process.env.WKE_001_PRIMARY_PIN,
);
const untargeted = await studentClient(
  process.env.WKE_001_UNTARGETED_USERNAME,
  process.env.WKE_001_UNTARGETED_PIN,
);
const unenrolled = await studentClient(
  process.env.WKE_001_UNENROLLED_USERNAME,
  process.env.WKE_001_UNENROLLED_PIN,
);
const teacher = createClient(url, anonKey, { auth: { persistSession: false } });
assert.ifError((await teacher.auth.signInWithPassword({
  email: process.env.WKE_001_TEACHER_EMAIL,
  password: process.env.WKE_001_TEACHER_PASSWORD,
})).error);
const anonymous = createClient(url, anonKey, { auth: { persistSession: false } });
const { data: primaryUser } = await primary.auth.getUser();
assert(primaryUser.user, "Primary test student is missing.");
const { data: unenrolledUser } = await unenrolled.auth.getUser();
assert(unenrolledUser.user, "Unenrolled test student is missing.");

const classId = process.env.WKE_001_PRIMARY_CLASS_ID;
const { data: ownedClass, error: classError } = await admin
  .from("teacher_classes")
  .select("teacher_id")
  .eq("id", classId)
  .single();
assert.ifError(classError);

const ids = {
  writing: crypto.randomUUID(),
  template: crypto.randomUUID(),
  graded: crypto.randomUUID(),
  denied: crypto.randomUUID(),
  unenrolled: crypto.randomUUID(),
  recovery: crypto.randomUUID(),
  legacy: crypto.randomUUID(),
};
const now = new Date().toISOString();
const assignments = [
  { id: ids.writing, title: "WKE-002 writing concurrency", payload: { type: "writing_prompt", prompt: "Test", minWords: 1 } },
  { id: ids.template, title: "WKE-002 template concurrency", payload: { type: "homework_template", templateId: "primary-homework-template-one" } },
  { id: ids.graded, title: "WKE-002 graded concurrency", payload: { type: "graded_track" } },
  { id: ids.denied, title: "WKE-002 permission denial", payload: { type: "writing_prompt", prompt: "Test", minWords: 1 } },
  { id: ids.unenrolled, title: "WKE-002 enrollment denial", payload: { type: "writing_prompt", prompt: "Test", minWords: 1 }, target_student_ids: [unenrolledUser.user.id] },
  { id: ids.recovery, title: "WKE-002 partial recovery", payload: { type: "writing_prompt", prompt: "Test", minWords: 1 } },
  { id: ids.legacy, title: "WKE-002 legacy replay", payload: { type: "writing_prompt", prompt: "Test", minWords: 1 } },
].map((row) => ({
  ...row,
  class_id: classId,
  teacher_id: ownedClass.teacher_id,
  status: "assigned",
  assigned_at: now,
  updated_at: now,
  target_student_ids: row.target_student_ids ?? [primaryUser.user.id],
}));

const createdIds = Object.values(ids);
try {
  const { error: insertError } = await admin.from("class_homework").insert(assignments);
  assert.ifError(insertError);

  const cases = [
    {
      name: "writing_prompt",
      id: ids.writing,
      call: (index) => primary.rpc("finalize_homework_writing_submission", {
        p_homework_id: ids.writing,
        p_text: `Concurrent final answer ${index}`,
      }),
      table: "homework_writing_submissions",
    },
    {
      name: "homework_template",
      id: ids.template,
      call: (index) => primary.rpc("finalize_homework_template_submission", {
        p_homework_id: ids.template,
        p_content: { schemaVersion: 1, parts: { final: { answers: { value: String(index) } } } },
      }),
      table: "homework_template_submissions",
    },
    {
      name: "graded_track",
      id: ids.graded,
      call: (index) => primary.rpc("finalize_homework_collection_attempt", {
        p_homework_id: ids.graded,
        p_content: { schemaVersion: 1, parts: { final: { answers: { value: String(index) } } } },
        p_auto_score: 1,
        p_auto_max_score: 1,
        p_manual_max_score: 0,
        p_item_count: 1,
      }),
      table: "homework_collection_attempts",
    },
  ];

  for (const testCase of cases) {
    const results = await Promise.all(Array.from({ length: 5 }, (_, index) => testCase.call(index)));
    results.forEach(({ error }) => assert.ifError(error));
    const receipts = results.map(({ data }) => data.receipt);
    assert.equal(new Set(receipts.map((r) => r.submittedAt)).size, 1, `${testCase.name}: submittedAt diverged`);
    assert.equal(new Set(receipts.map((r) => r.completedAt)).size, 1, `${testCase.name}: completedAt diverged`);
    assert.equal(receipts.filter((r) => r.duplicate).length, 4, `${testCase.name}: duplicate count`);

    const [{ count: submissionCount }, { count: completionCount }, { count: rewardCount }] = await Promise.all([
      admin.from(testCase.table).select("id", { count: "exact", head: true }).eq("homework_id", testCase.id).eq("student_id", primaryUser.user.id),
      admin.from("class_homework_completions").select("id", { count: "exact", head: true }).eq("homework_id", testCase.id).eq("student_id", primaryUser.user.id),
      admin.from("primary_reward_events").select("id", { count: "exact", head: true }).eq("student_id", primaryUser.user.id).eq("event_id", `primary:homework:${testCase.id}`),
    ]);
    assert.equal(submissionCount, 1, `${testCase.name}: expected one submission`);
    assert.equal(completionCount, 1, `${testCase.name}: expected one completion`);
    assert.equal(rewardCount, 1, `${testCase.name}: expected one reward`);

    const { data: teacherRows, error: teacherReadError } = await teacher
      .from(testCase.table)
      .select("status, submitted_at")
      .eq("homework_id", testCase.id)
      .eq("student_id", primaryUser.user.id);
    assert.ifError(teacherReadError);
    assert.equal(teacherRows?.length, 1, `${testCase.name}: teacher cannot see final result`);
    assert.equal(teacherRows?.[0]?.status, "submitted", `${testCase.name}: teacher status disagrees`);
  }

  const { data: originalWriting } = await admin
    .from("homework_writing_submissions")
    .select("text, submitted_at")
    .eq("homework_id", ids.writing)
    .single();
  const retry = await primary.rpc("finalize_homework_writing_submission", {
    p_homework_id: ids.writing,
    p_text: "This retry must not replace the final answer",
  });
  assert.ifError(retry.error);
  const { data: retriedWriting } = await admin
    .from("homework_writing_submissions")
    .select("text, submitted_at")
    .eq("homework_id", ids.writing)
    .single();
  assert.deepEqual(retriedWriting, originalWriting, "retry changed an immutable final answer");

  const denied = await untargeted.rpc("finalize_homework_writing_submission", {
    p_homework_id: ids.denied,
    p_text: "Unauthorized final answer",
  });
  assert(denied.error, "untargeted student was allowed to submit");
  const { count: deniedRows } = await admin
    .from("homework_writing_submissions")
    .select("id", { count: "exact", head: true })
    .eq("homework_id", ids.denied);
  assert.equal(deniedRows, 0, "denied request wrote a response");

  const teacherDenied = await teacher.rpc("finalize_homework_writing_submission", {
    p_homework_id: ids.denied,
    p_text: "Teacher must not submit as a student",
  });
  assert(teacherDenied.error, "teacher was allowed to finalize student homework");
  const anonymousDenied = await anonymous.rpc("finalize_homework_writing_submission", {
    p_homework_id: ids.denied,
    p_text: "Anonymous must not submit",
  });
  assert(anonymousDenied.error, "anonymous user was allowed to finalize homework");
  const unenrolledDenied = await unenrolled.rpc("finalize_homework_writing_submission", {
    p_homework_id: ids.unenrolled,
    p_text: "Unenrolled must not submit",
  });
  assert(unenrolledDenied.error, "unenrolled student was allowed to finalize homework");

  const recoverySubmittedAt = new Date().toISOString();
  assert.ifError((await admin.from("homework_writing_submissions").insert({
    homework_id: ids.recovery,
    student_id: primaryUser.user.id,
    status: "submitted",
    text: "Response persisted before acknowledgement failed",
    submitted_at: recoverySubmittedAt,
    updated_at: recoverySubmittedAt,
  })).error);
  const recovery = await primary.rpc("finalize_homework_writing_submission", {
    p_homework_id: ids.recovery,
    p_text: "Retry payload must not replace persisted work",
  });
  assert.ifError(recovery.error);
  assert.equal(recovery.data.receipt.reconciled, true, "partial response was not classified as reconciled");
  assert.equal(recovery.data.receipt.duplicate, true, "partial response was not classified as duplicate");
  const { data: recoveredRow } = await admin.from("homework_writing_submissions").select("text").eq("homework_id", ids.recovery).single();
  assert.equal(recoveredRow.text, "Response persisted before acknowledgement failed", "reconciliation replaced student work");

  assert.ifError((await admin.from("class_homework_completions").insert({
    homework_id: ids.legacy,
    student_id: primaryUser.user.id,
    finished_at: new Date(Date.now() - 86_400_000).toISOString(),
    questions_total: 0,
    correct_count: 0,
  })).error);
  const legacyReplay = await primary.rpc("finalize_homework_writing_submission", {
    p_homework_id: ids.legacy,
    p_text: "Legacy completed response",
  });
  assert.ifError(legacyReplay.error);
  const { count: legacyRewardCount } = await admin
    .from("primary_reward_events")
    .select("id", { count: "exact", head: true })
    .eq("student_id", primaryUser.user.id)
    .eq("event_id", `primary:homework:${ids.legacy}`);
  assert.equal(legacyRewardCount, 0, "legacy completion received an unintended reward");

  console.log(JSON.stringify({
    formatsPassed: cases.map((entry) => entry.name),
    concurrentRequestsPerFormat: 5,
    immutableRetryPassed: true,
    partialRecoveryPassed: true,
    legacyRewardGuardPassed: true,
    teacherVisibilityPassed: true,
    permissionDenialsPassed: ["anonymous", "teacher", "unenrolled", "untargeted"],
  }));
} finally {
  const { error } = await admin.from("class_homework").delete().in("id", createdIds);
  assert.ifError(error);
}
