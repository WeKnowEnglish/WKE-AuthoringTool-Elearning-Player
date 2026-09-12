import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const enabled = process.env.WKE_003_RELEASE_CONFIRMATION === "advisory-linked-project";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const expectedProjectRef = process.env.WKE_001_EXPECTED_SUPABASE_PROJECT_REF ?? "";
const admin = createClient(
  url || "http://127.0.0.1:54321",
  serviceKey || "wke-003-disabled-test-key",
  {
  auth: { autoRefreshToken: false, persistSession: false },
  },
);

type Credentials = { email: string; password: string };
type StudentFixture = Credentials & {
  id: string;
  username: string;
  pin: string;
  displayName: string;
};
type ReleaseFixture = {
  batch: string;
  classId: string;
  draftTitle: string;
  teacher: Credentials & { id: string };
  administrator: Credentials & { id: string };
  target: StudentFixture;
  untargeted: StudentFixture;
  unenrolled: StudentFixture;
  userIds: string[];
};

function baseURL(testInfo: TestInfo) {
  return String(testInfo.project.use.baseURL);
}

function safeBatch(projectName: string) {
  return `${projectName.startsWith("mobile") ? "m" : "d"}${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;
}

function sixDigitPin() {
  return String(crypto.randomInt(100_000, 1_000_000));
}

function randomPassword() {
  return `Wke3!${crypto.randomBytes(15).toString("base64url")}`;
}

async function createAuthUser(input: {
  email: string;
  password: string;
  role: "student" | "teacher";
  admin?: boolean;
  metadata: Record<string, unknown>;
}): Promise<User> {
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    app_metadata: {
      role: input.role,
      wke_fixture_goal: "WKE-003",
      ...(input.role === "teacher"
        ? {
            teacher_tier: "plus",
            must_change_password: false,
            admin: Boolean(input.admin),
          }
        : {}),
    },
    user_metadata: { ...input.metadata, wke_fixture_goal: "WKE-003" },
  });
  assert.ifError(error);
  assert(data.user, "WKE-003 could not create a disposable auth user.");
  return data.user;
}

async function createStudent(batch: string, label: string): Promise<StudentFixture> {
  const username = `wke03${label}_${batch}`.replace(/[^a-z0-9_]/g, "").slice(0, 20);
  const pin = sixDigitPin();
  const displayName = `WKE-003 ${label.toUpperCase()} ${batch.slice(-5)}`;
  const email = `${username}@students.wke.internal`;
  const user = await createAuthUser({
    email,
    password: pin,
    role: "student",
    metadata: { username, display_name: displayName, learning_band: "a1" },
  });
  const { error } = await admin.from("student_profiles").insert({
    user_id: user.id,
    username,
    username_normalized: username,
    display_name: displayName,
    learning_band: "a1",
    updated_at: new Date().toISOString(),
  });
  assert.ifError(error);
  return { id: user.id, username, pin, displayName, email, password: pin };
}

async function createFixture(projectName: string): Promise<ReleaseFixture> {
  const batch = safeBatch(projectName);
  const userIds: string[] = [];
  try {
    const teacherPassword = randomPassword();
    const teacherUser = await createAuthUser({
      email: `wke003.teacher.${batch}@fixtures.wke.test`,
      password: teacherPassword,
      role: "teacher",
      metadata: { display_name: `WKE-003 Teacher ${batch}` },
    });
    userIds.push(teacherUser.id);
    const adminPassword = randomPassword();
    const adminUser = await createAuthUser({
      email: `wke003.admin.${batch}@fixtures.wke.test`,
      password: adminPassword,
      role: "teacher",
      admin: true,
      metadata: { display_name: `WKE-003 Admin ${batch}` },
    });
    userIds.push(adminUser.id);
    const target = await createStudent(batch, "target");
    userIds.push(target.id);
    const untargeted = await createStudent(batch, "other");
    userIds.push(untargeted.id);
    const unenrolled = await createStudent(batch, "outside");
    userIds.push(unenrolled.id);

    const { data: teacherClass, error: classError } = await admin
      .from("teacher_classes")
      .insert({ teacher_id: teacherUser.id, title: `WKE-003 Release ${batch}` })
      .select("id")
      .single();
    assert.ifError(classError);
    assert(teacherClass?.id, "WKE-003 could not create a disposable class.");
    const classId = String(teacherClass.id);
    const { error: enrollmentError } = await admin.from("class_enrollments").insert([
      { class_id: classId, student_id: target.id },
      { class_id: classId, student_id: untargeted.id },
    ]);
    assert.ifError(enrollmentError);
    const draftTitle = `WKE-003 Draft ${batch}`;
    const { error: draftError } = await admin.from("class_homework").insert({
      class_id: classId,
      teacher_id: teacherUser.id,
      title: draftTitle,
      instructions: "",
      status: "draft",
      payload: { type: "external_note", body: "Synthetic release-gate draft." },
      target_student_ids: null,
    });
    assert.ifError(draftError);
    return {
      batch,
      classId,
      draftTitle,
      teacher: {
        id: teacherUser.id,
        email: String(teacherUser.email),
        password: teacherPassword,
      },
      administrator: {
        id: adminUser.id,
        email: String(adminUser.email),
        password: adminPassword,
      },
      target,
      untargeted,
      unenrolled,
      userIds,
    };
  } catch (error) {
    for (const userId of [...userIds].reverse()) await admin.auth.admin.deleteUser(userId);
    throw error;
  }
}

async function cleanupFixture(fixture: ReleaseFixture) {
  const { data: homework } = await admin
    .from("class_homework")
    .select("id")
    .eq("class_id", fixture.classId);
  const homeworkIds = (homework ?? []).map((row) => String(row.id));
  if (homeworkIds.length > 0) {
    const { error } = await admin
      .from("platform_usage_events")
      .delete()
      .in("homework_id", homeworkIds);
    assert.ifError(error);
  }
  assert.ifError(
    (await admin.from("platform_usage_events").delete().eq("class_id", fixture.classId)).error,
  );
  assert.ifError(
    (await admin.from("teacher_classes").delete().eq("id", fixture.classId)).error,
  );
  for (const userId of [...fixture.userIds].reverse()) {
    assert.ifError((await admin.auth.admin.deleteUser(userId)).error);
  }
  const { count, error } = await admin
    .from("teacher_classes")
    .select("id", { count: "exact", head: true })
    .eq("id", fixture.classId);
  assert.ifError(error);
  assert.equal(count, 0, "WKE-003 fixture cleanup retained the disposable class.");
}

async function expectConfirmedSession(context: BrowserContext) {
  const cookies = await context.cookies();
  expect(
    cookies.some((cookie) => cookie.name.startsWith(`sb-${expectedProjectRef}-auth-token`)),
    "browser session must belong to the explicitly confirmed Supabase project",
  ).toBe(true);
}

async function signInStudent(page: Page, student: StudentFixture, nextPath: string) {
  await page.goto(`/login?portal=student&next=${encodeURIComponent(nextPath)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator('form[data-login-ready="true"]')).toBeVisible();
  await page.getByLabel("Username").fill(student.username);
  await page.getByLabel("Secret code").fill(student.pin);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await page.waitForURL((next) => !next.pathname.endsWith("/login"), {
    waitUntil: "domcontentloaded",
  });
  await expectConfirmedSession(page.context());
}

async function signInTeacher(page: Page, credentials: Credentials, nextPath: string) {
  await page.goto(`/login?portal=teacher&next=${encodeURIComponent(nextPath)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator('form[data-login-ready="true"]')).toBeVisible();
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Teacher sign in" }).click();
  await page.waitForURL((next) => next.pathname === nextPath.split("?")[0], {
    waitUntil: "domcontentloaded",
  });
  await expectConfirmedSession(page.context());
}

function publicClient() {
  return createClient(url, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signedInClient(credentials: Credentials): Promise<SupabaseClient> {
  const client = publicClient();
  const { error } = await client.auth.signInWithPassword(credentials);
  assert.ifError(error);
  return client;
}

async function contextPage(
  browser: Browser,
  testInfo: TestInfo,
  viewport: { width: number; height: number } = { width: 1280, height: 900 },
) {
  const context = await browser.newContext({ baseURL: baseURL(testInfo), viewport });
  return { context, page: await context.newPage() };
}

async function uploadSyntheticDuplicateOutcome(page: Page, homeworkId: string) {
  const response = await page.evaluate(async (id) => {
    const eventId = `wke003-duplicate-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const result = await fetch("/api/diagnostics/events", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        events: [
          {
            id: eventId,
            sessionId: `wke003-session-${Date.now()}`,
            deviceId: "wke003-release-browser",
            at: Date.now(),
            surface: "student",
            phase: "homework_finalization",
            name: "duplicate_prevented",
            kind: "mark",
            homeworkId: id,
            status: "succeeded",
            detail: { format: "writing_prompt", duplicate: true, reconciled: false },
            deviceCategory: window.innerWidth < 640 ? "mobile" : "desktop",
          },
        ],
      }),
    });
    return { ok: result.ok, status: result.status, body: await result.json() };
  }, homeworkId);
  assert.equal(response.ok, true, `duplicate diagnostic upload failed (${response.status})`);
  assert(Array.isArray(response.body.accepted) && response.body.accepted.length === 1);
}

test.describe("WKE-003 complete homework release gate", () => {
  test.skip(!enabled, "Run through npm run test:release:homework.");

  test("teacher assigns, student completes exactly once, and teacher sees the result", async ({
    browser,
    page,
  }, testInfo) => {
    const fixture = await createFixture(testInfo.project.name);
    const title = `WKE-003 ${testInfo.project.name} ${fixture.batch}`;
    const prompt = `WKE-003 write a short sentence about a helpful classmate.`;
    const responseText = `A helpful classmate shared a book with me today ${fixture.batch}.`;
    let teacherContext: BrowserContext | null = null;
    let adminContext: BrowserContext | null = null;
    try {
      const teacherSurface = await contextPage(browser, testInfo);
      teacherContext = teacherSurface.context;
      const teacherPage = teacherSurface.page;
      const classPath = `/teacher/classes/${fixture.classId}`;
      await signInTeacher(teacherPage, fixture.teacher, classPath);
      await teacherPage.goto(`${classPath}?tab=students`, { waitUntil: "domcontentloaded" });
      const draftEditButton = teacherPage.getByRole("button", {
        name: new RegExp(`^${fixture.draftTitle}`),
      });
      await expect(draftEditButton).toBeVisible();
      await expect(async () => {
        if ((await teacherPage.getByLabel("Title").count()) === 0) {
          await draftEditButton.click();
        }
        await expect(teacherPage.getByLabel("Title")).toBeVisible({ timeout: 3_000 });
      }).toPass({ timeout: 30_000, intervals: [1_000, 2_000, 3_000] });
      await expect(teacherPage.getByLabel("Title")).toBeVisible();
      await teacherPage.getByLabel("Title").fill(title);
      await teacherPage.getByLabel("Instructions").fill("Synthetic release-gate assignment.");
      await teacherPage.getByRole("button", { name: "Writing homework" }).click();
      await teacherPage.getByLabel("Writing prompt").fill(prompt);
      await teacherPage.getByLabel("Minimum words (optional)").fill("5");
      await teacherPage.getByLabel("Everyone in this class").uncheck();
      await teacherPage.getByLabel(fixture.target.displayName).check();
      await teacherPage.getByLabel(fixture.untargeted.displayName).uncheck();
      await teacherPage.getByRole("button", { name: "Save & assign" }).click();
      await expect(
        teacherPage.getByRole("button", { name: `Copy student link for ${title}` }),
      ).toBeVisible();

      const { data: assignment, error: assignmentError } = await admin
        .from("class_homework")
        .select("id,status,target_student_ids")
        .eq("class_id", fixture.classId)
        .eq("title", title)
        .single();
      assert.ifError(assignmentError);
      assert.equal(assignment.status, "assigned");
      assert.deepEqual(assignment.target_student_ids, [fixture.target.id]);
      const homeworkId = String(assignment.id);
      const canonicalPath = `/homework/${homeworkId}`;

      await signInStudent(page, fixture.target, canonicalPath);
      await page.waitForURL((next) => next.pathname === `/primary/homework/${homeworkId}`);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        ),
        "student homework must not overflow horizontally",
      ).toBe(true);
      await page.getByRole("button", { name: "Start homework" }).click();
      await page.getByLabel("Your writing").fill(responseText);
      await page.getByLabel("Your writing").focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Save draft" })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Submit" })).toBeFocused();
      await page.getByRole("button", { name: "Save draft" }).click();
      await expect(page.getByRole("status")).toContainText("Draft saved.");
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Start homework" }).click();
      await expect(page.getByLabel("Your writing")).toHaveValue(responseText);

      await page.getByRole("button", { name: "Submit" }).click();
      await expect(page.getByRole("heading", { name: "Submitted!" })).toBeVisible();

      const [{ count: submissionCount }, { count: completionCount }, { count: rewardCount }] =
        await Promise.all([
          admin
            .from("homework_writing_submissions")
            .select("id", { count: "exact", head: true })
            .eq("homework_id", homeworkId)
            .eq("student_id", fixture.target.id),
          admin
            .from("class_homework_completions")
            .select("id", { count: "exact", head: true })
            .eq("homework_id", homeworkId)
            .eq("student_id", fixture.target.id),
          admin
            .from("primary_reward_events")
            .select("id", { count: "exact", head: true })
            .eq("student_id", fixture.target.id)
            .eq("event_id", `primary:homework:${homeworkId}`),
        ]);
      assert.equal(submissionCount, 1);
      assert.equal(completionCount, 1);
      assert.equal(rewardCount, 1);

      const targetClient = await signedInClient(fixture.target);
      const retry = await targetClient.rpc("finalize_homework_writing_submission", {
        p_homework_id: homeworkId,
        p_text: "This retry must not replace the submitted writing.",
      });
      assert.ifError(retry.error);
      assert.equal(retry.data?.receipt?.duplicate, true);
      await uploadSyntheticDuplicateOutcome(page, homeworkId);
      const { data: finalWriting, error: writingError } = await admin
        .from("homework_writing_submissions")
        .select("text,status")
        .eq("homework_id", homeworkId)
        .eq("student_id", fixture.target.id)
        .single();
      assert.ifError(writingError);
      assert.equal(finalWriting.text, responseText);
      assert.equal(finalWriting.status, "submitted");

      const resultsPath = `${classPath}/homework-writing-results/${homeworkId}`;
      await teacherPage.goto(resultsPath, { waitUntil: "domcontentloaded" });
      await expect(teacherPage.getByText(responseText, { exact: true })).toBeVisible();
      await expect(teacherPage.getByText("Submitted", { exact: true })).toBeVisible();

      if (testInfo.project.name === "desktop-chromium") {
        const anonymousSurface = await contextPage(browser, testInfo);
        const anonymousResponse = await anonymousSurface.page.goto(canonicalPath, {
          waitUntil: "domcontentloaded",
        });
        expect(anonymousResponse?.status()).toBeLessThan(400);
        await expect(anonymousSurface.page).toHaveURL(/\/login\?/);
        await anonymousSurface.context.close();

        for (const student of [fixture.untargeted, fixture.unenrolled]) {
          const deniedSurface = await contextPage(browser, testInfo);
          await signInStudent(deniedSurface.page, student, "/primary");
          const deniedResponse = await deniedSurface.page.goto(canonicalPath, {
            waitUntil: "domcontentloaded",
          });
          expect(deniedResponse?.status()).toBe(404);
          await expect(deniedSurface.page.getByLabel("Your writing")).toHaveCount(0);
          await deniedSurface.context.close();
        }

        const teacherDeniedResponse = await teacherPage.goto(canonicalPath, {
          waitUntil: "domcontentloaded",
        });
        expect(teacherDeniedResponse?.status()).toBeLessThan(400);
        await expect(teacherPage).toHaveURL(/\/login\?portal=student/);

        const untargetedClient = await signedInClient(fixture.untargeted);
        const unenrolledClient = await signedInClient(fixture.unenrolled);
        const teacherClient = await signedInClient(fixture.teacher);
        const anonymousClient = publicClient();
        for (const client of [untargetedClient, unenrolledClient, teacherClient, anonymousClient]) {
          const denied = await client.rpc("finalize_homework_writing_submission", {
            p_homework_id: homeworkId,
            p_text: "Denied synthetic write.",
          });
          assert(denied.error, "an unauthorized actor was allowed to finalize homework");
        }
      }

      const requiredJourneyEvents = [
        "assignment_created",
        "homework_opened",
        "save_settled",
        "submit_settled",
        "teacher_result_opened",
      ];
      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from("platform_usage_events")
              .select("event_name")
              .eq("homework_id", homeworkId);
            const present = new Set((data ?? []).map((row) => row.event_name));
            return [...requiredJourneyEvents, "duplicate_prevented"].filter(
              (name) => !present.has(name),
            );
          },
          { timeout: 20_000 },
        )
        .toEqual([]);

      const { data: diagnostics, error: diagnosticsError } = await admin
        .from("platform_usage_events")
        .select(
          "user_id,participant_id,participant_display_name,surface,phase,event_name,event_kind,duration_ms,status,error_code,metadata,device_category,homework_id",
        )
        .eq("homework_id", homeworkId);
      assert.ifError(diagnosticsError);
      const names = new Set((diagnostics ?? []).map((row) => row.event_name));
      for (const name of requiredJourneyEvents) assert(names.has(name), `missing diagnostic ${name}`);
      assert(names.has("duplicate_prevented"), "missing duplicate-prevented diagnostic");
      const journey = (diagnostics ?? []).filter((row) => row.phase === "homework_journey");
      for (const event of journey) {
        assert.deepEqual(Object.keys(event.metadata).sort(), ["correlation", "synthetic"]);
        assert.equal(event.metadata.synthetic, true);
        assert(event.status, `${event.event_name} is missing a safe status`);
      }
      for (const event of diagnostics ?? []) {
        if (event.phase === "homework_journey" && event.event_kind === "span") {
          assert(Number(event.duration_ms) >= 0, `${event.event_name} is missing duration`);
        }
        if (event.surface === "student" && event.phase.startsWith("homework_")) {
          assert.equal(event.user_id, null, "student user identity was retained");
          assert.equal(event.participant_id, null, "student participant identity was retained");
          assert.equal(
            event.participant_display_name,
            null,
            "student display name was retained",
          );
        }
      }
      assert(!JSON.stringify(diagnostics).includes(responseText));
      assert(!JSON.stringify(diagnostics).includes(fixture.target.email));

      const adminSurface = await contextPage(browser, testInfo);
      adminContext = adminSurface.context;
      await signInTeacher(
        adminSurface.page,
        fixture.administrator,
        "/teacher/admin/diagnostics",
      );
      await adminSurface.page
        .getByPlaceholder("Student, event, homework, route, error…")
        .fill(homeworkId);
      for (const name of requiredJourneyEvents) {
        await expect(
          adminSurface.page.getByText(new RegExp(`homework_journey · ${name}`)).first(),
        ).toBeVisible();
      }
    } finally {
      await adminContext?.close();
      await teacherContext?.close();
      await cleanupFixture(fixture);
    }
  });
});
