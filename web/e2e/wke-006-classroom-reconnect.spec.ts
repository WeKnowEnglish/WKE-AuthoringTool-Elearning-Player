import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

loadEnv({ path: ".env.local", override: false });

const enabled = process.env.WKE_006_PILOT_CONFIRMATION === "preview-reconnect-pilot";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
function previewProtectionHeaders(): Record<string, string> {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (secret) {
    return {
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    };
  }
  const cookieFile = process.env.WKE_006_VERCEL_COOKIE_FILE?.trim();
  if (!cookieFile) return {};
  const cookie = readFileSync(cookieFile, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && (!line.startsWith("#") || line.startsWith("#HttpOnly_")))
    .map((line) => line.split("\t"))
    .filter((fields) => fields.length >= 7 && fields[5] && fields[6])
    .map((fields) => `${fields[5]}=${fields[6]}`)
    .join("; ");
  return cookie ? { cookie } : {};
}

const protectionHeaders = previewProtectionHeaders();
const usesProtectionCredential = Object.keys(protectionHeaders).length > 0;

function previewProtectionCookies() {
  const cookieFile = process.env.WKE_006_VERCEL_COOKIE_FILE?.trim();
  if (!cookieFile) return [];
  return readFileSync(cookieFile, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && (!line.startsWith("#") || line.startsWith("#HttpOnly_")))
    .map((line) => line.split("\t"))
    .filter((fields) => fields.length >= 7 && fields[0] && fields[2] && fields[5] && fields[6])
    .map((fields) => ({
      domain: fields[0].replace(/^#HttpOnly_/, ""),
      path: fields[2],
      secure: fields[3] === "TRUE",
      expires: Number.parseInt(fields[4], 10),
      name: fields[5],
      value: fields[6],
      httpOnly: fields[0].startsWith("#HttpOnly_"),
    }));
}
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Credentials = { id: string; email: string; password: string };
type Student = Credentials & { username: string; pin: string; displayName: string };
type Fixture = {
  teacher: Credentials;
  first: Student;
  second: Student;
  wrongClass: Student;
  classId: string;
  otherClassId: string;
  userIds: string[];
  sessionId?: string;
};

function token(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${randomBytes(3).toString("hex")}`.toLowerCase();
}

function password() {
  return `Wke6!${randomBytes(16).toString("base64url")}`;
}

async function createAuthUser(input: {
  email: string;
  password: string;
  role: "teacher" | "student";
  displayName: string;
}) {
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    app_metadata: {
      role: input.role,
      wke_fixture_goal: "WKE-006",
      ...(input.role === "teacher"
        ? { teacher_tier: "plus", must_change_password: false }
        : {}),
    },
    user_metadata: {
      display_name: input.displayName,
      wke_fixture_goal: "WKE-006",
      ...(input.role === "student" ? { learning_band: "a1" } : {}),
    },
  });
  assert.ifError(error);
  assert(data.user, "Could not create WKE-006 auth fixture.");
  return data.user;
}

async function createStudent(batch: string, label: string): Promise<Student> {
  const username = `wke6_${label}_${batch}`.replace(/[^a-z0-9_]/g, "").slice(0, 24);
  const pin = String(Math.floor(100_000 + Math.random() * 900_000));
  const displayName = `WKE-006 ${label} ${batch.slice(-4)}`;
  const email = `${username}@students.wke.internal`;
  const user = await createAuthUser({ email, password: pin, role: "student", displayName });
  const { error } = await admin.from("student_profiles").insert({
    user_id: user.id,
    username,
    username_normalized: username,
    display_name: displayName,
    learning_band: "a1",
    updated_at: new Date().toISOString(),
  });
  assert.ifError(error);
  return { id: user.id, email, password: pin, username, pin, displayName };
}

async function createFixture(): Promise<Fixture> {
  const batch = token("g6").slice(-12);
  const userIds: string[] = [];
  try {
    const teacherPassword = password();
    const teacherUser = await createAuthUser({
      email: `wke006.teacher.${batch}@fixtures.wke.test`,
      password: teacherPassword,
      role: "teacher",
      displayName: `WKE-006 Teacher ${batch}`,
    });
    userIds.push(teacherUser.id);
    const first = await createStudent(batch, "first");
    const second = await createStudent(batch, "second");
    const wrongClass = await createStudent(batch, "outside");
    userIds.push(first.id, second.id, wrongClass.id);

    const { data: classes, error: classError } = await admin
      .from("teacher_classes")
      .insert([
        { teacher_id: teacherUser.id, title: `WKE-006 Pilot ${batch}` },
        { teacher_id: teacherUser.id, title: `WKE-006 Other ${batch}` },
      ])
      .select("id");
    assert.ifError(classError);
    assert.equal(classes?.length, 2);
    const classId = String(classes![0].id);
    const otherClassId = String(classes![1].id);
    assert.ifError((await admin.from("class_enrollments").insert([
      { class_id: classId, student_id: first.id },
      { class_id: classId, student_id: second.id },
      { class_id: otherClassId, student_id: wrongClass.id },
    ])).error);

    return {
      teacher: { id: teacherUser.id, email: String(teacherUser.email), password: teacherPassword },
      first,
      second,
      wrongClass,
      classId,
      otherClassId,
      userIds,
    };
  } catch (error) {
    for (const id of [...userIds].reverse()) await admin.auth.admin.deleteUser(id);
    throw error;
  }
}

async function cleanupFixture(fixture: Fixture) {
  if (fixture.sessionId) {
    assert.ifError((await admin.from("platform_usage_events").delete().eq("classroom_session_id", fixture.sessionId)).error);
    assert.ifError((await admin.from("class_sessions").delete().eq("id", fixture.sessionId)).error);
  }
  assert.ifError((await admin.from("teacher_classes").delete().in("id", [fixture.classId, fixture.otherClassId])).error);
  for (const id of [...fixture.userIds].reverse()) {
    assert.ifError((await admin.auth.admin.deleteUser(id)).error);
  }
}

async function signInTeacher(page: Page, teacher: Credentials) {
  await page.goto("/login?portal=teacher&next=/teacher/classes", { waitUntil: "domcontentloaded" });
  await expect(page.locator('form[data-login-ready="true"]')).toBeVisible();
  await page.getByLabel("Email").fill(teacher.email);
  await page.getByLabel("Password").fill(teacher.password);
  await page.getByRole("button", { name: "Teacher sign in" }).click();
  await page.waitForURL((next) => !next.pathname.endsWith("/login"), { waitUntil: "domcontentloaded" });
}

async function signInStudent(page: Page, student: Student) {
  await page.goto("/login?portal=student&next=/virtual-classroom/join", { waitUntil: "domcontentloaded" });
  await expect(page.locator('form[data-login-ready="true"]')).toBeVisible();
  console.log("WKE-006 journey: student login form ready");
  await page.getByLabel("Username").fill(student.username);
  await page.getByLabel("Secret code").fill(student.pin);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  console.log("WKE-006 journey: student credentials submitted");
  await page.waitForURL((next) => next.pathname === "/virtual-classroom/join", { waitUntil: "domcontentloaded" });
  console.log("WKE-006 journey: student signed in");
}

async function joinClassroom(page: Page, student: Student, joinCode: string) {
  await signInStudent(page, student);
  await expect(page.locator('[data-join-ready="true"]')).toBeVisible();
  await page.getByLabel("Session code").fill(joinCode);
  await page.getByRole("button", { name: "Enter classroom" }).click();
  console.log("WKE-006 journey: classroom join submitted");
  await page.waitForURL(/\/virtual-classroom\/vcs_[A-Z0-9]+$/i, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-classroom-shell="supabase-native"]')).toBeVisible();
  console.log("WKE-006 journey: classroom shell visible");
}

async function hostClassroom(page: Page, fixture: Fixture) {
  const title = `WKE-006 Reconnect ${Date.now()}`;
  const result = await page.evaluate(async ({ classId, title }) => {
    const response = await fetch(`/api/virtual-classroom/class/${classId}/host`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "extra", title }),
    });
    return { status: response.status, body: await response.json() };
  }, { classId: fixture.classId, title });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const body = result.body as Record<string, string>;
  for (const key of ["sessionId", "joinCode", "roomId", "userId"]) assert(body[key], `Missing ${key}`);
  fixture.sessionId = body.sessionId;
  await page.evaluate((ctx) => {
    window.sessionStorage.setItem("wke-vc-session-context", JSON.stringify(ctx));
  }, {
    sessionId: body.sessionId,
    joinCode: body.joinCode,
    roomId: body.roomId,
    classId: fixture.classId,
    role: "host",
    userId: body.userId,
    displayName: body.displayName || "WKE-006 Teacher",
    returnHref: `/teacher/classes/${fixture.classId}`,
  });
  await page.goto(`/teacher/virtual-classroom/${body.sessionId}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-classroom-shell="supabase-native"]')).toBeVisible();
  return { sessionId: body.sessionId, joinCode: body.joinCode };
}

async function command(page: Page, sessionId: string, body: Record<string, unknown>) {
  const result = await page.evaluate(async ({ sessionId, body }) => {
    const response = await fetch(`/api/virtual-classroom/${sessionId}/tools`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }, { sessionId, body });
  assert.equal(result.status, 200, JSON.stringify(result.body));
}

async function expectPrivateChannelDenied(credentials: Credentials, sessionId: string) {
  const client = createClient(url, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword(credentials);
  assert.ifError(error);
  const channel = client.channel(`classroom:${sessionId}`, {
    config: {
      private: true,
      broadcast: { ack: true, self: false },
      presence: { key: credentials.id },
    },
  });
  const status = await new Promise<string>((resolve) => {
    const timeout = setTimeout(() => resolve("NO_RESULT"), 15_000);
    channel.subscribe((next) => {
      if (["SUBSCRIBED", "CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(next)) {
        clearTimeout(timeout);
        resolve(next);
      }
    });
  });
  await client.removeChannel(channel);
  await client.auth.signOut();
  assert.equal(status, "CHANNEL_ERROR", `Wrong-class private channel returned ${status}.`);
}

async function newSurface(browser: Browser, viewport: { width: number; height: number }) {
  const context = await browser.newContext({
    baseURL: process.env.WKE_006_BASE_URL,
    viewport,
    ...(usesProtectionCredential ? { extraHTTPHeaders: protectionHeaders } : {}),
  });
  const cookies = previewProtectionCookies();
  if (cookies.length > 0) await context.addCookies(cookies);
  return { context, page: await context.newPage() };
}

test.describe("WKE-006 reconnect-safe native classroom", () => {
  test.skip(!enabled, "Run through npm run test:release:classroom.");

  test("restores teacher-controlled state for refresh, reconnect, and late join", async ({ browser }) => {
    const fixture = await createFixture();
    let teacherContext: BrowserContext | null = null;
    let firstContext: BrowserContext | null = null;
    let secondContext: BrowserContext | null = null;
    let deniedContext: BrowserContext | null = null;
    try {
      const teacher = await newSurface(browser, { width: 1440, height: 900 });
      teacherContext = teacher.context;
      await signInTeacher(teacher.page, fixture.teacher);
      const hosted = await hostClassroom(teacher.page, fixture);
      console.log("WKE-006 journey: teacher hosted classroom");

      const first = await newSurface(browser, { width: 390, height: 844 });
      firstContext = first.context;
      await joinClassroom(first.page, fixture.first, hosted.joinCode);
      console.log("WKE-006 journey: first student joined");

      await expect.poll(async () => {
        const { count } = await admin
          .from("class_session_attendance")
          .select("id", { count: "exact", head: true })
          .eq("session_id", hosted.sessionId)
          .eq("user_id", fixture.first.id)
          .is("lobby_last_left_at", null);
        return count;
      }).toBe(1);

      const activityTitle = `Reconnect activity ${hosted.joinCode}`;
      const announcement = `Please continue with ${hosted.joinCode}.`;
      for (const body of [
        { type: "SET_UI_MODE", mode: "learn" },
        {
          type: "SET_LEARN_ACTIVITY",
          activity: {
            activityId: `wke-006-${hosted.joinCode.toLowerCase()}`,
            format: "quiz",
            title: activityTitle,
            playPath: `/play/wke-006-${hosted.joinCode.toLowerCase()}`,
          },
        },
        { type: "SET_ANNOUNCEMENT", message: announcement },
        { type: "SET_LEARN_STUDENT_PENS", enabled: false },
        { type: "START_TIMER", durationMs: 120_000 },
        { type: "AWARD_POINTS", studentId: fixture.first.id, delta: 1, label: "point" },
        { type: "SET_LEADERBOARD_VISIBLE", showLeaderboard: true },
      ]) await command(teacher.page, hosted.sessionId, body);
      console.log("WKE-006 journey: teacher state applied");

      const expectedSnapshot = await expect.poll(async () => {
        const { data, error } = await admin
          .from("class_session_runtime_snapshots")
          .select("state_version,snapshot_json")
          .eq("session_id", hosted.sessionId)
          .single();
        assert.ifError(error);
        return data;
      }).toMatchObject({
        state_version: expect.any(Number),
        snapshot_json: {
          uiMode: "learn",
          learnStage: "activity",
          learnActivity: { title: activityTitle },
          learnStudentPensEnabled: false,
          announcement,
          tools: {
            timer: { status: "running", durationMs: 120_000 },
            points: { totalsByStudentId: { [fixture.first.id]: 1 }, showLeaderboard: true },
          },
        },
      });
      void expectedSnapshot;

      for (const page of [teacher.page, first.page]) {
        await expect(page.getByText(announcement)).toBeVisible();
        await expect(page.getByText("Class timer", { exact: true })).toBeVisible();
      }
      await expect(first.page.getByText("Session points", { exact: true })).toBeVisible();

      await first.page.reload({ waitUntil: "domcontentloaded" });
      await expect(first.page.locator('[data-classroom-shell="supabase-native"]')).toBeVisible();
      await expect(first.page.getByText(announcement)).toBeVisible();

      await first.context.setOffline(true);
      await expect(first.page.locator('[data-classroom-recovery-state="reconnecting"]')).toContainText("Your place in the lesson is saved.");
      await first.context.setOffline(false);
      await expect(first.page.locator('[data-classroom-recovery-state="recovered"]')).toContainText("latest saved lesson state");
      await expect(first.page.getByText(announcement)).toBeVisible();
      console.log("WKE-006 journey: first student recovered");

      const second = await newSurface(browser, { width: 390, height: 844 });
      secondContext = second.context;
      await joinClassroom(second.page, fixture.second, hosted.joinCode);
      await expect(second.page.getByText(announcement)).toBeVisible();
      await expect(second.page.getByText("Class timer", { exact: true })).toBeVisible();
      console.log("WKE-006 journey: late-join student restored");

      await teacher.page.reload({ waitUntil: "domcontentloaded" });
      await expect(teacher.page.locator('[data-classroom-shell="supabase-native"]')).toBeVisible();
      await expect(teacher.page.getByText(announcement)).toBeVisible();
      await command(teacher.page, hosted.sessionId, { type: "SET_ANNOUNCEMENT", message: `${announcement} Restored.` });
      await expect(first.page.getByText(`${announcement} Restored.`)).toBeVisible();
      console.log("WKE-006 journey: teacher refresh restored control");

      const { data: attendance, error: attendanceError } = await admin
        .from("class_session_attendance")
        .select("user_id,participant_key")
        .eq("session_id", hosted.sessionId)
        .in("user_id", [fixture.first.id, fixture.second.id]);
      assert.ifError(attendanceError);
      assert.equal(attendance?.length, 2, "Refresh/reconnect created a duplicate participant row.");
      assert.equal(new Set(attendance?.map((row) => row.user_id)).size, 2);

      const denied = await newSurface(browser, { width: 390, height: 844 });
      deniedContext = denied.context;
      await signInStudent(denied.page, fixture.wrongClass);
      const deniedJoin = await denied.page.evaluate(async (joinCode) => {
        const response = await fetch("/api/virtual-classroom/join", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ joinCode }),
        });
        return response.status;
      }, hosted.joinCode);
      expect(deniedJoin).toBe(403);
      const deniedSnapshot = await denied.page.evaluate(async (sessionId) =>
        (await fetch(`/api/virtual-classroom/${sessionId}/runtime`, { cache: "no-store" })).status,
      hosted.sessionId);
      expect(deniedSnapshot).toBe(403);
      await expectPrivateChannelDenied(fixture.wrongClass, hosted.sessionId);
      console.log("WKE-006 journey: wrong-class access denied");

      await expect.poll(async () => {
        const { data } = await admin
          .from("platform_usage_events")
          .select("event_name")
          .eq("classroom_session_id", hosted.sessionId)
          .in("event_name", ["classroom_reconnect_started", "classroom_reconnect_recovered"]);
        return new Set((data ?? []).map((row) => row.event_name));
      }).toEqual(new Set(["classroom_reconnect_started", "classroom_reconnect_recovered"]));

      const { data: recoveryEvents, error: recoveryError } = await admin
        .from("platform_usage_events")
        .select("event_name,duration_ms,metadata,user_id,participant_id,participant_display_name")
        .eq("classroom_session_id", hosted.sessionId)
        .like("event_name", "classroom_reconnect_%");
      assert.ifError(recoveryError);
      const serialized = JSON.stringify(recoveryEvents);
      assert(!serialized.includes(announcement));
      assert(!serialized.includes(activityTitle));
      for (const event of recoveryEvents ?? []) {
        assert.equal(event.user_id, null);
        assert.equal(event.participant_id, null);
        assert.equal(event.participant_display_name, null);
        if (event.event_name === "classroom_reconnect_recovered") assert(Number(event.duration_ms) >= 0);
      }
      console.log("WKE-006 journey: reconnect diagnostics verified");

      assert.ifError((await admin.from("class_sessions").update({
        status: "ended",
        class_phase: "ended",
        ended_at: new Date().toISOString(),
      }).eq("id", hosted.sessionId)).error);
      const endedStatus = await first.page.evaluate(async (sessionId) =>
        (await fetch(`/api/virtual-classroom/${sessionId}/runtime`, { cache: "no-store" })).status,
      hosted.sessionId);
      expect(endedStatus).toBe(410);
      console.log("WKE-006 journey: ended session rejected");
    } finally {
      console.log("WKE-006 journey: closing browser contexts");
      await Promise.allSettled(
        [deniedContext, secondContext, firstContext, teacherContext]
          .filter((context): context is BrowserContext => context !== null)
          .map((context) => context.close()),
      );
      console.log("WKE-006 journey: cleaning disposable fixtures");
      await cleanupFixture(fixture);
      console.log("WKE-006 journey: cleanup complete");
    }
  });
});
