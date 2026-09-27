import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type User } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { seedGradedFromTemplate } from "../lib/activity-tracks/seed-graded";
import { freezeGradedTrackHomeworkPayload } from "../lib/class-homework/freeze-graded-track";
import { freezeHomeworkTemplateDocument } from "../lib/class-homework/freeze-homework-template";
import { getHomeworkTemplateDefinition } from "../lib/homework-templates/registry";

const CONFIRM_FLAG = "--confirm-linked-test-project";
const GOAL = "WKE-001";
const envPath = resolve(process.cwd(), ".env.local");

loadEnv({ path: envPath, override: false });

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!process.argv.includes(CONFIRM_FLAG)) {
  fail(
    `Fixture provisioning refused. Re-run with ${CONFIRM_FLAG} only after confirming the linked project is safe for disposable test records.`,
  );
}

if (process.env.WKE_001_FIXTURE_CONFIRMATION !== "purpose-created-non-production") {
  fail(
    "Fixture provisioning refused: WKE_001_FIXTURE_CONFIRMATION must equal purpose-created-non-production.",
  );
}

const supabaseURL =
  process.env.SUPABASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const expectedProjectRef = process.env.WKE_001_EXPECTED_SUPABASE_PROJECT_REF?.trim() || "";

if (!supabaseURL || !serviceRoleKey || !expectedProjectRef) {
  fail(
    "Fixture provisioning requires the Supabase URL, service-role key, and expected WKE-001 project ref in .env.local.",
  );
}

let actualProjectRef = "";
try {
  actualProjectRef = new URL(supabaseURL).hostname.split(".")[0] ?? "";
} catch {
  fail("Fixture provisioning refused: the configured Supabase URL is invalid.");
}
if (actualProjectRef !== expectedProjectRef) {
  fail("Fixture provisioning refused: the configured Supabase project does not match the expected test project ref.");
}

const admin = createClient(supabaseURL, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const batch = `${Date.now().toString(36)}${randomBytes(3).toString("hex")}`.slice(-10);
const createdUserIds: string[] = [];
const createdClassIds: string[] = [];

function randomPin(): string {
  return String(randomInt(100_000, 1_000_000));
}

function randomPassword(): string {
  return `Wke1!${randomBytes(18).toString("base64url")}`;
}

async function createAuthUser(input: {
  email: string;
  password: string;
  role: "student" | "teacher";
  userMetadata: Record<string, unknown>;
}): Promise<User> {
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    app_metadata: {
      role: input.role,
      wke_fixture_goal: GOAL,
      wke_fixture_batch: batch,
      ...(input.role === "teacher"
        ? { teacher_tier: "plus", must_change_password: false, admin: false }
        : {}),
    },
    user_metadata: input.userMetadata,
  });
  if (error || !data.user) {
    throw new Error(`Could not create ${input.role} fixture: ${error?.message ?? "missing user"}`);
  }
  createdUserIds.push(data.user.id);
  return data.user;
}

async function createStudent(label: string, learningBand: "a1" | "a2") {
  const username = `wke01${label}_${batch.slice(-7)}`.slice(0, 20);
  const pin = randomPin();
  const displayName = `WKE Test ${label.toUpperCase()} ${batch.slice(-4)}`;
  const user = await createAuthUser({
    email: `${username}@students.wke.internal`,
    password: pin,
    role: "student",
    userMetadata: {
      display_name: displayName,
      username,
      learning_band: learningBand,
      wke_fixture_goal: GOAL,
      wke_fixture_batch: batch,
    },
  });
  const { error } = await admin.from("student_profiles").upsert(
    {
      user_id: user.id,
      username,
      username_normalized: username,
      display_name: displayName,
      learning_band: learningBand,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Could not create ${label} student profile: ${error.message}`);
  return { user, username, pin, displayName };
}

async function cleanupCreatedRecords() {
  if (createdClassIds.length > 0) {
    await admin.from("teacher_classes").delete().in("id", createdClassIds);
  }
  for (const userId of [...createdUserIds].reverse()) {
    await admin.auth.admin.deleteUser(userId);
  }
}

function envValue(value: string): string {
  return JSON.stringify(value);
}

function writeFixtureEnvironment(values: Record<string, string>) {
  const original = readFileSync(envPath, "utf8");
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  const remaining = new Map(Object.entries(values));
  const seen = new Set<string>();
  const output: string[] = [];

  for (const line of original.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:#\s*)?(WKE_001_[A-Z0-9_]+)\s*=/);
    const name = match?.[1];
    if (!name || !remaining.has(name)) {
      output.push(line);
      continue;
    }
    if (seen.has(name)) continue;
    output.push(`${name}=${envValue(remaining.get(name)!)}`);
    seen.add(name);
    remaining.delete(name);
  }

  if (remaining.size > 0) {
    if (output.at(-1)?.trim()) output.push("");
    output.push("# WKE-001 disposable live-acceptance fixtures (generated locally)");
    for (const [name, value] of remaining) output.push(`${name}=${envValue(value)}`);
  }
  writeFileSync(envPath, `${output.join(newline).replace(/(?:\r?\n)*$/, "")}${newline}`, "utf8");
}

const refreshableHomeworkName =
  /^WKE_001_(?:(?:PRIMARY_WRITING_(?:DESKTOP|MOBILE|EDGE|RECOVERY))|(?:PRIMARY_GRADED_(?:DESKTOP|MOBILE|EDGE))|(?:SECONDARY_TEMPLATE_(?:DESKTOP|MOBILE|EDGE))|(?:SECONDARY_GRADED_(?:DESKTOP|MOBILE|EDGE)))_ID$/;

async function refreshHomeworkFixture(name: string) {
  if (!refreshableHomeworkName.test(name)) {
    fail("Fixture refresh refused: choose one documented WKE-001 homework ID variable.");
  }
  const currentId = process.env[name]?.trim() ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(currentId)) {
    fail(`Fixture refresh refused: ${name} does not contain a homework UUID.`);
  }
  const { data: source, error: sourceError } = await admin
    .from("class_homework")
    .select("class_id, teacher_id, title, instructions, payload, target_student_ids")
    .eq("id", currentId)
    .maybeSingle();
  if (sourceError || !source) {
    throw new Error(`Could not load the homework fixture selected by ${name}.`);
  }
  const now = new Date().toISOString();
  const title = `${String(source.title).slice(0, 92)} retry ${batch}`;
  const { data: inserted, error: insertError } = await admin
    .from("class_homework")
    .insert({
      class_id: source.class_id,
      teacher_id: source.teacher_id,
      title,
      instructions: source.instructions,
      due_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1_000).toISOString(),
      status: "assigned",
      payload: source.payload,
      target_student_ids: source.target_student_ids,
      assigned_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (insertError || !inserted?.id) {
    throw new Error(`Could not refresh the homework fixture selected by ${name}.`);
  }
  try {
    writeFixtureEnvironment({ [name]: String(inserted.id) });
  } catch (error) {
    await admin.from("class_homework").delete().eq("id", inserted.id);
    throw error;
  }
  console.log(`Refreshed ${name} with a fresh disposable assignment; its ID was not printed.`);
}

async function main() {
  try {
    const teacherEmail = `wke001.teacher.${batch}@fixtures.wke.test`;
    const teacherPassword = randomPassword();
    const teacher = await createAuthUser({
      email: teacherEmail,
      password: teacherPassword,
      role: "teacher",
      userMetadata: {
        display_name: `WKE Test Teacher ${batch.slice(-4)}`,
        wke_fixture_goal: GOAL,
        wke_fixture_batch: batch,
      },
    });
    const primary = await createStudent("p", "a1");
    const secondary = await createStudent("s", "a2");
    const untargeted = await createStudent("u", "a1");
    const unenrolled = await createStudent("n", "a1");

    const { data: classes, error: classError } = await admin
      .from("teacher_classes")
      .insert([
        { teacher_id: teacher.id, title: `WKE-001 Primary ${batch}` },
        { teacher_id: teacher.id, title: `WKE-001 Secondary ${batch}` },
      ])
      .select("id, title");
    if (classError || !classes || classes.length !== 2) {
      throw new Error(`Could not create test classes: ${classError?.message ?? "unexpected row count"}`);
    }
    const primaryClass = classes.find((row) => String(row.title).includes("Primary"));
    const secondaryClass = classes.find((row) => String(row.title).includes("Secondary"));
    if (!primaryClass?.id || !secondaryClass?.id) throw new Error("Could not identify created test classes.");
    createdClassIds.push(String(primaryClass.id), String(secondaryClass.id));

    const { error: enrollmentError } = await admin.from("class_enrollments").insert([
      { class_id: primaryClass.id, student_id: primary.user.id },
      { class_id: primaryClass.id, student_id: untargeted.user.id },
      { class_id: secondaryClass.id, student_id: secondary.user.id },
    ]);
    if (enrollmentError) throw new Error(`Could not create test enrollments: ${enrollmentError.message}`);

    const now = new Date().toISOString();
    const dueAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1_000).toISOString();
    const secondaryDefinition = getHomeworkTemplateDefinition("secondary-homework-template-one");
    if (!secondaryDefinition) throw new Error("Secondary homework template is unavailable.");

    const writingPayload = {
      type: "writing_prompt" as const,
      prompt: "Write about a helpful person and explain what they did.",
      instructions: "Use complete sentences. This is disposable authentication test work.",
      minWords: 20,
    };
    const secondaryTemplatePayload = () => ({
      type: "homework_template" as const,
      templateId: secondaryDefinition.id,
      title: secondaryDefinition.title,
      sectionCount: secondaryDefinition.sectionCount,
      document: freezeHomeworkTemplateDocument(secondaryDefinition.id),
      frozenAt: new Date().toISOString(),
    });
    const gradedPayload = (level: "primary" | "secondary", label: string) =>
      freezeGradedTrackHomeworkPayload({
        document: seedGradedFromTemplate({
          trackId: randomUUID(),
          title: `WKE-001 ${label} ${batch}`,
          templateId:
            level === "primary" ? "homework-template-one" : "secondary-homework-template-one",
        }),
      });

    const definitions = [
      ["primary-writing-desktop", primaryClass.id, primary.user.id, writingPayload],
      ["primary-writing-mobile", primaryClass.id, primary.user.id, writingPayload],
      ["primary-writing-recovery", primaryClass.id, primary.user.id, writingPayload],
      ["primary-graded-desktop", primaryClass.id, primary.user.id, gradedPayload("primary", "Primary graded desktop")],
      ["primary-graded-mobile", primaryClass.id, primary.user.id, gradedPayload("primary", "Primary graded mobile")],
      ["secondary-template-desktop", secondaryClass.id, secondary.user.id, secondaryTemplatePayload()],
      ["secondary-template-mobile", secondaryClass.id, secondary.user.id, secondaryTemplatePayload()],
      ["secondary-graded-desktop", secondaryClass.id, secondary.user.id, gradedPayload("secondary", "Secondary graded desktop")],
      ["secondary-graded-mobile", secondaryClass.id, secondary.user.id, gradedPayload("secondary", "Secondary graded mobile")],
    ] as const;

    const homeworkRows = definitions.map(([label, classId, studentId, payload]) => ({
      class_id: classId,
      teacher_id: teacher.id,
      title: `WKE-001 ${label} ${batch}`,
      instructions: "Disposable Goal 1 authentication acceptance fixture.",
      due_at: dueAt,
      status: "assigned",
      payload,
      target_student_ids: [studentId],
      assigned_at: now,
      updated_at: now,
    }));
    const { data: homework, error: homeworkError } = await admin
      .from("class_homework")
      .insert(homeworkRows)
      .select("id, title");
    if (homeworkError || !homework || homework.length !== definitions.length) {
      throw new Error(`Could not create test homework: ${homeworkError?.message ?? "unexpected row count"}`);
    }
    const homeworkId = (label: string) => {
      const row = homework.find((item) => String(item.title).includes(`WKE-001 ${label} `));
      if (!row?.id) throw new Error(`Could not identify ${label} homework.`);
      return String(row.id);
    };

    writeFixtureEnvironment({
      WKE_001_FIXTURE_BATCH_ID: batch,
      WKE_001_FIXTURE_CONFIRMATION: "purpose-created-non-production",
      WKE_001_EXPECTED_SUPABASE_PROJECT_REF: actualProjectRef,
      WKE_001_PRIMARY_USERNAME: primary.username,
      WKE_001_PRIMARY_PIN: primary.pin,
      WKE_001_SECONDARY_USERNAME: secondary.username,
      WKE_001_SECONDARY_PIN: secondary.pin,
      WKE_001_TEACHER_EMAIL: teacherEmail,
      WKE_001_TEACHER_PASSWORD: teacherPassword,
      WKE_001_UNTARGETED_USERNAME: untargeted.username,
      WKE_001_UNTARGETED_PIN: untargeted.pin,
      WKE_001_UNENROLLED_USERNAME: unenrolled.username,
      WKE_001_UNENROLLED_PIN: unenrolled.pin,
      WKE_001_PRIMARY_CLASS_ID: String(primaryClass.id),
      WKE_001_SECONDARY_CLASS_ID: String(secondaryClass.id),
      WKE_001_SECONDARY_DISPLAY_NAME: secondary.displayName,
      WKE_001_PRIMARY_WRITING_DESKTOP_ID: homeworkId("primary-writing-desktop"),
      WKE_001_PRIMARY_WRITING_MOBILE_ID: homeworkId("primary-writing-mobile"),
      WKE_001_PRIMARY_WRITING_RECOVERY_ID: homeworkId("primary-writing-recovery"),
      WKE_001_PRIMARY_GRADED_DESKTOP_ID: homeworkId("primary-graded-desktop"),
      WKE_001_PRIMARY_GRADED_MOBILE_ID: homeworkId("primary-graded-mobile"),
      WKE_001_SECONDARY_TEMPLATE_DESKTOP_ID: homeworkId("secondary-template-desktop"),
      WKE_001_SECONDARY_TEMPLATE_MOBILE_ID: homeworkId("secondary-template-mobile"),
      WKE_001_SECONDARY_GRADED_DESKTOP_ID: homeworkId("secondary-graded-desktop"),
      WKE_001_SECONDARY_GRADED_MOBILE_ID: homeworkId("secondary-graded-mobile"),
    });

    console.log(
      "WKE-001 fixtures created: 1 teacher, 4 students, 2 classes, and 9 fresh homework assignments.",
    );
    console.log("The ignored .env.local was updated; no credentials or record IDs were printed.");
  } catch (error) {
    await cleanupCreatedRecords();
    throw error;
  }
}

const refreshIndex = process.argv.indexOf("--refresh-homework");
const operation =
  refreshIndex >= 0
    ? refreshHomeworkFixture(process.argv[refreshIndex + 1]?.trim() ?? "")
    : main();

void operation.catch(() => {
  console.error(
    "WKE-001 fixture provisioning failed; any records created by this attempt were rolled back.",
  );
  process.exitCode = 1;
});
