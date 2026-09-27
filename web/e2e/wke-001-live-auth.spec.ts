import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
  type TestInfo,
} from "@playwright/test";

type StudentCredentials = { username: string; pin: string };
type TeacherCredentials = { email: string; password: string };
type StoredSession = Record<string, unknown> & {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

const liveEnabled = process.env.WKE_001_LIVE_ACCEPTANCE === "true";
const LOGIN_READY_TIMEOUT_MS = 60_000;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required WKE-001 acceptance value: ${name}`);
  return value;
}

function student(prefix: string): StudentCredentials {
  return {
    username: requiredEnv(`${prefix}_USERNAME`),
    pin: requiredEnv(`${prefix}_PIN`),
  };
}

function teacher(): TeacherCredentials {
  return {
    email: requiredEnv("WKE_001_TEACHER_EMAIL"),
    password: requiredEnv("WKE_001_TEACHER_PASSWORD"),
  };
}

function pathOnly(page: Page): string {
  return new URL(page.url()).pathname;
}

function absoluteURL(testInfo: TestInfo, path: string): string {
  return new URL(path, String(testInfo.project.use.baseURL)).toString();
}

async function expectNoAlertMessage(page: Page) {
  const messages = (await page.getByRole("alert").allTextContents())
    .map((message) => message.trim())
    .filter(Boolean);
  expect(messages).toEqual([]);
}

function writingFixtureName(projectName: string): string {
  if (projectName === "mobile-chromium") return "WKE_001_PRIMARY_WRITING_MOBILE_ID";
  if (projectName === "desktop-edge") return "WKE_001_PRIMARY_WRITING_EDGE_ID";
  return "WKE_001_PRIMARY_WRITING_DESKTOP_ID";
}

function secondaryTemplateFixtureName(projectName: string): string {
  if (projectName === "mobile-chromium") return "WKE_001_SECONDARY_TEMPLATE_MOBILE_ID";
  if (projectName === "desktop-edge") return "WKE_001_SECONDARY_TEMPLATE_EDGE_ID";
  return "WKE_001_SECONDARY_TEMPLATE_DESKTOP_ID";
}

function gradedTrackFixtureName(
  level: "PRIMARY" | "SECONDARY",
  projectName: string,
): string {
  const browser =
    projectName === "mobile-chromium"
      ? "MOBILE"
      : projectName === "desktop-edge"
        ? "EDGE"
        : "DESKTOP";
  return `WKE_001_${level}_GRADED_${browser}_ID`;
}

async function readSupabaseSessionCookie(context: BrowserContext) {
  const cookies = await context.cookies();
  const authCookies = cookies.filter((cookie) =>
    /-auth-token(?:\.\d+)?$/.test(cookie.name),
  );
  if (authCookies.length === 0) {
    throw new Error("Supabase authentication cookie was not found after sign-in.");
  }

  const baseName = authCookies[0]!.name.replace(/\.\d+$/, "");
  const direct = authCookies.find((cookie) => cookie.name === baseName);
  const serialized = direct
    ? direct.value
    : authCookies
        .filter((cookie) => cookie.name.startsWith(`${baseName}.`))
        .sort(
          (left, right) =>
            Number(left.name.slice(baseName.length + 1)) -
            Number(right.name.slice(baseName.length + 1)),
        )
        .map((cookie) => cookie.value)
        .join("");

  try {
    const json = serialized.startsWith("base64-")
      ? Buffer.from(serialized.slice("base64-".length), "base64url").toString("utf8")
      : serialized;
    const session = JSON.parse(json) as Partial<StoredSession>;
    if (
      typeof session.access_token !== "string" ||
      typeof session.refresh_token !== "string" ||
      typeof session.expires_at !== "number"
    ) {
      throw new Error("missing fields");
    }
    return {
      baseName,
      template: authCookies[0]!,
      session: session as StoredSession,
    };
  } catch {
    throw new Error("Supabase authentication cookie had an unexpected safe-test format.");
  }
}

async function expireAccessTokenOnly(context: BrowserContext) {
  const current = await readSupabaseSessionCookie(context);
  const expired: StoredSession = {
    ...current.session,
    expires_at: Math.floor(Date.now() / 1_000) - 120,
  };
  const serialized = `base64-${Buffer.from(JSON.stringify(expired), "utf8").toString("base64url")}`;
  const chunks = Array.from(
    { length: Math.ceil(serialized.length / 3_180) },
    (_, index) => serialized.slice(index * 3_180, (index + 1) * 3_180),
  );

  await context.clearCookies({
    name: new RegExp(`^${current.baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\.\\d+)?$`),
  });
  await context.addCookies(
    chunks.map((value, index) => ({
      name: chunks.length === 1 ? current.baseName : `${current.baseName}.${index}`,
      value,
      domain: current.template.domain,
      path: current.template.path,
      expires: current.template.expires,
      httpOnly: current.template.httpOnly,
      secure: current.template.secure,
      sameSite: current.template.sameSite,
    })),
  );

  return current.session;
}

async function signInStudent(
  page: Page,
  credentials: StudentCredentials,
  nextPath: string,
) {
  await page.goto(`/login?portal=student&next=${encodeURIComponent(nextPath)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator('form[data-login-ready="true"]')).toBeVisible({
    timeout: LOGIN_READY_TIMEOUT_MS,
  });
  await page.getByLabel("Username").fill(credentials.username);
  await page.getByLabel("Secret code").fill(credentials.pin);
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
    timeout: 90_000,
    waitUntil: "domcontentloaded",
  });
  const sessionCookie = await readSupabaseSessionCookie(page.context());
  expect(
    sessionCookie.baseName ===
      `sb-${requiredEnv("WKE_001_EXPECTED_SUPABASE_PROJECT_REF")}-auth-token`,
    "student session must belong to the explicitly confirmed test project",
  ).toBe(true);
}

async function signInTeacher(
  page: Page,
  credentials: TeacherCredentials,
  nextPath: string,
) {
  await page.goto(`/login?portal=teacher&next=${encodeURIComponent(nextPath)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator('form[data-login-ready="true"]')).toBeVisible({
    timeout: LOGIN_READY_TIMEOUT_MS,
  });
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Teacher sign in" }).click();
  await page.waitForURL((url) => url.pathname === nextPath, {
    timeout: 90_000,
    waitUntil: "domcontentloaded",
  });
  const sessionCookie = await readSupabaseSessionCookie(page.context());
  expect(
    sessionCookie.baseName ===
      `sb-${requiredEnv("WKE_001_EXPECTED_SUPABASE_PROJECT_REF")}-auth-token`,
    "teacher session must belong to the explicitly confirmed test project",
  ).toBe(true);
}

async function startHomework(page: Page) {
  const start = page.getByRole("button", { name: /^(Start|Open) homework$/ });
  await expect(start).toBeVisible();
  await expect(start).toBeEnabled();
  await start.click();
  await expect(start).toBeHidden();
}

async function verifyReopen(
  browser: Browser,
  page: Page,
  testInfo: TestInfo,
  path: string,
) {
  const storageState = await page.context().storageState();
  const reopenedContext = await browser.newContext({
    storageState,
    viewport: page.viewportSize() ?? undefined,
  });
  try {
    const reopenedPage = await reopenedContext.newPage();
    await reopenedPage.goto(absoluteURL(testInfo, path), { waitUntil: "domcontentloaded" });
    expect(pathOnly(reopenedPage)).toBe(path);
    await expect(
      reopenedPage.getByRole("button", { name: /^(Start|Open) homework$/ }),
    ).toBeVisible();
  } finally {
    await reopenedContext.close();
  }
}

async function completeSecondaryTemplate(page: Page, homeworkPath: string) {
  for (let part = 0; part < 12; part += 1) {
    const progress = page.getByText(/^Part \d+ of \d+$/);
    const before = await progress.textContent();
    const startRecording = page.getByRole("button", { name: "Start recording" });

    if (await startRecording.isVisible()) {
      await startRecording.click();
      const stop = page.getByRole("button", { name: "Stop" });
      await expect(stop).toBeVisible();
      await page.waitForTimeout(800);
      await stop.click();
      const saveAnswer = page.getByRole("button", { name: "Save answer" });
      await expect(saveAnswer).toBeVisible();
      await saveAnswer.click();
      await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible();

      const finish = page.getByRole("button", {
        name: /^(Save and continue|Submit homework)$/,
      });
      const finishLabel = await finish.textContent();
      await finish.click();
      if (finishLabel?.trim() === "Submit homework") {
        await page.waitForURL((url) => url.pathname === "/secondary", {
          timeout: 45_000,
        });
        return;
      }
      await expect.poll(() => progress.textContent()).not.toBe(before);
      continue;
    }

    const inputs = page.locator("section input");
    for (let index = 0; index < (await inputs.count()); index += 1) {
      await inputs.nth(index).fill(`safe-test-${part + 1}-${index + 1}`);
    }

    const choiceGroups = page.locator("section fieldset");
    for (let index = 0; index < (await choiceGroups.count()); index += 1) {
      await choiceGroups.nth(index).locator("button[aria-pressed]").first().click();
    }

    const check = page.getByRole("button", { name: "Check answers" });
    await expect(check).toBeEnabled();
    await check.click();
    const save = page.getByRole("button", { name: "Save and continue" });
    await expect(save).toBeVisible();
    await save.click();
    await expect.poll(() => progress.textContent()).not.toBe(before);
  }

  throw new Error(`Secondary template did not finish from ${homeworkPath}.`);
}

async function completeGradedTrack(page: Page) {
  await expect(page.getByText("Homework submitted", { exact: true })).toHaveCount(0);

  for (let activity = 0; activity < 40; activity += 1) {
    const progress = page.getByText(/^Activity \d+ of \d+$/);
    const before = await progress.textContent();
    const next = page.getByRole("button", { name: "Save & continue", exact: true });

    if (await next.isVisible()) {
      await next.click();
      await expect.poll(() => progress.textContent()).not.toBe(before);
      continue;
    }

    const submit = page.getByRole("button", { name: "Submit homework", exact: true });
    await expect(submit).toBeVisible();
    await submit.click();
    await expect(page.getByText("Homework submitted", { exact: true })).toBeVisible();
    await expectNoAlertMessage(page);
    return;
  }

  throw new Error("Graded track exceeded the safe acceptance activity limit.");
}

test.describe("WKE-001 live authenticated acceptance", () => {
  test.skip(
    !liveEnabled,
    "Run through npm run test:e2e:wke-001-live with safe test accounts.",
  );

  test("P1: Primary writing saves, refreshes, reopens, submits, and appears once for the teacher", async ({
    browser,
    page,
  }, testInfo) => {
    const homeworkId = requiredEnv(writingFixtureName(testInfo.project.name));
    const classId = requiredEnv("WKE_001_PRIMARY_CLASS_ID");
    const homeworkPath = `/primary/homework/${encodeURIComponent(homeworkId)}`;
    const marker = `WKE-001 safe acceptance ${testInfo.project.name} ${Date.now()}`;
    const writing = `${marker}. ${"This is a safe practice sentence for authentication testing. ".repeat(20)}`.trim();

    await signInStudent(page, student("WKE_001_PRIMARY"), `/homework/${homeworkId}`);
    await expect.poll(() => pathOnly(page)).toBe(homeworkPath);
    await startHomework(page);
    const editor = page.getByLabel("Your writing");
    await editor.fill(writing);
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status")).toContainText("Draft saved.");

    await page.reload({ waitUntil: "domcontentloaded" });
    await startHomework(page);
    await expect(page.getByLabel("Your writing")).toHaveValue(writing);
    await verifyReopen(browser, page, testInfo, homeworkPath);

    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByRole("heading", { name: "Submitted!" })).toBeVisible();

    const teacherContext = await browser.newContext();
    try {
      const teacherPage = await teacherContext.newPage();
      const resultsPath = `/teacher/classes/${encodeURIComponent(classId)}/homework-writing-results/${encodeURIComponent(homeworkId)}`;
      await signInTeacher(teacherPage, teacher(), resultsPath);
      await expect(teacherPage.getByText(writing, { exact: true })).toHaveCount(1);
    } finally {
      await teacherContext.close();
    }
  });

  test("S1: Secondary template parts and speaking save, submit, and appear for the teacher", async ({
    browser,
    page,
  }, testInfo) => {
    const homeworkId = requiredEnv(secondaryTemplateFixtureName(testInfo.project.name));
    const classId = requiredEnv("WKE_001_SECONDARY_CLASS_ID");
    const displayName = requiredEnv("WKE_001_SECONDARY_DISPLAY_NAME");
    const homeworkPath = `/secondary/homework/${encodeURIComponent(homeworkId)}`;

    await signInStudent(page, student("WKE_001_SECONDARY"), `/homework/${homeworkId}`);
    await expect.poll(() => pathOnly(page)).toBe(homeworkPath);
    await startHomework(page);
    await completeSecondaryTemplate(page, homeworkPath);

    const teacherContext = await browser.newContext();
    try {
      const teacherPage = await teacherContext.newPage();
      const resultsPath = `/teacher/classes/${encodeURIComponent(classId)}/homework-template-results/${encodeURIComponent(homeworkId)}`;
      await signInTeacher(teacherPage, teacher(), resultsPath);
      const submission = teacherPage
        .getByRole("heading", { name: displayName, exact: true })
        .locator("xpath=ancestor::section[1]");
      await expect(submission.getByText("submitted", { exact: true })).toBeVisible();
      await expect(submission.locator("audio")).toHaveCount(1);
    } finally {
      await teacherContext.close();
    }
  });

  for (const fixture of [
    { label: "P2 Primary graded track", level: "PRIMARY", portal: "primary" },
    { label: "S2 Secondary graded track", level: "SECONDARY", portal: "secondary" },
  ] as const) {
    test(`${fixture.label}: refreshes, reopens, saves each transition, and submits`, async ({
      browser,
      page,
    }, testInfo) => {
      const homeworkId = requiredEnv(
        gradedTrackFixtureName(fixture.level, testInfo.project.name),
      );
      await signInStudent(
        page,
        student(`WKE_001_${fixture.level}`),
        `/homework/${homeworkId}`,
      );
      const homeworkPath = `/${fixture.portal}/homework/${encodeURIComponent(homeworkId)}`;
      await expect.poll(() => pathOnly(page)).toBe(homeworkPath);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("button", { name: /^(Start|Open) homework$/ }),
      ).toBeVisible();
      await verifyReopen(browser, page, testInfo, homeworkPath);
      await startHomework(page);
      await completeGradedTrack(page);
    });
  }

  test("E1: middleware refreshes an expired access token before the next draft save", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "One deterministic refresh-token run is sufficient.",
    );
    const homeworkId = requiredEnv("WKE_001_PRIMARY_WRITING_RECOVERY_ID");
    const homeworkPath = `/primary/homework/${encodeURIComponent(homeworkId)}`;
    const marker = `WKE-001 refreshed session ${Date.now()}`;

    await signInStudent(page, student("WKE_001_PRIMARY"), `/homework/${homeworkId}`);
    await expect.poll(() => pathOnly(page)).toBe(homeworkPath);
    const before = await expireAccessTokenOnly(page.context());

    await page.goto(`/homework/${encodeURIComponent(homeworkId)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect.poll(() => pathOnly(page)).toBe(homeworkPath);
    const after = (await readSupabaseSessionCookie(page.context())).session;
    expect(
      after.access_token !== before.access_token,
      "middleware should rotate the access token without logging either token",
    ).toBe(true);
    expect(
      after.expires_at > Math.floor(Date.now() / 1_000),
      "refreshed session should have a future expiry",
    ).toBe(true);

    await startHomework(page);
    await page.getByLabel("Your writing").fill(marker);
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status")).toContainText("Draft saved.");
    await expectNoAlertMessage(page);
  });

  test("E2: a lost session keeps writing, records a safe diagnostic, and recovers after sign-in", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "One fresh recovery fixture is sufficient.",
    );
    const homeworkId = requiredEnv("WKE_001_PRIMARY_WRITING_RECOVERY_ID");
    const homeworkPath = `/primary/homework/${encodeURIComponent(homeworkId)}`;
    const marker = `WKE-001 recovered writing ${Date.now()}`;
    const primary = student("WKE_001_PRIMARY");

    await signInStudent(page, primary, `/homework/${homeworkId}`);
    await expect.poll(() => pathOnly(page)).toBe(homeworkPath);
    await startHomework(page);
    await page.getByLabel("Your writing").fill(marker);
    await page.context().clearCookies();
    await page.getByRole("button", { name: "Save draft" }).click();

    const alert = page
      .getByRole("alert")
      .filter({ hasText: "Your sign-in has ended." });
    await expect(alert).toContainText("Your sign-in has ended.");
    await expect(alert).toContainText("Your writing is still kept on this device.");
    await expect(page.getByRole("link", { name: "Sign in and return" })).toBeVisible();

    const diagnostic = await page.evaluate(() => {
      const events = JSON.parse(
        sessionStorage.getItem("wke:app-diagnostics:v1") ?? "[]",
      ) as Array<Record<string, unknown>>;
      return events.find((event) => event.name === "homework_auth_failed");
    });
    expect(diagnostic).toMatchObject({
      surface: "student",
      phase: "homework_auth",
      name: "homework_auth_failed",
      homeworkId,
      errorCode: "student_session_required",
      route: homeworkPath,
      detail: { action: "save_draft", recovery: "sign_in" },
    });
    expect(JSON.stringify(diagnostic)).not.toMatch(
      /email|token|answer|recording|secret code|\?/i,
    );

    await page.getByRole("link", { name: "Sign in and return" }).click();
    await page.getByLabel("Username").fill(primary.username);
    await page.getByLabel("Secret code").fill(primary.pin);
    const diagnosticUpload = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/diagnostics/events" &&
        response.request().method() === "POST" &&
        Boolean(response.request().postData()?.includes("homework_auth_failed")),
      { timeout: 45_000 },
    );
    await page.getByRole("button", { name: /^Sign in$/ }).click();
    const uploadResponse = await diagnosticUpload;
    expect(uploadResponse.status()).toBe(200);
    const uploadedBatch = JSON.parse(
      uploadResponse.request().postData() ?? "{}",
    ) as { events?: Array<Record<string, unknown>> };
    const uploadedDiagnostic = uploadedBatch.events?.find(
      (event) => event.name === "homework_auth_failed",
    );
    expect(uploadedDiagnostic).toMatchObject({
      surface: "student",
      phase: "homework_auth",
      homeworkId,
      errorCode: "student_session_required",
      route: homeworkPath,
      detail: { action: "save_draft", recovery: "sign_in" },
    });
    expect(JSON.stringify(uploadedDiagnostic)).not.toMatch(
      /email|token|answer|recording|secret code|\?/i,
    );
    const acknowledgement = (await uploadResponse.json()) as { accepted?: string[] };
    expect(
      Array.isArray(acknowledgement.accepted) &&
        acknowledgement.accepted.includes(String(diagnostic?.id)),
      "diagnostics API should acknowledge the exact privacy-safe failure event",
    ).toBe(true);
    await page.waitForURL((url) => url.pathname === homeworkPath, { timeout: 45_000 });
    await startHomework(page);
    await expect(page.getByLabel("Your writing")).toHaveValue(marker);
    await expect(page.getByRole("status")).toContainText("restored writing");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status")).toContainText("Draft saved.");
  });

  test("T1: a teacher account cannot open protected student homework", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "One role-boundary run is sufficient.");
    const homeworkId = requiredEnv("WKE_001_PRIMARY_WRITING_DESKTOP_ID");
    await signInTeacher(page, teacher(), "/teacher");
    await page.goto(`/homework/${encodeURIComponent(homeworkId)}`, {
      waitUntil: "domcontentloaded",
    });
    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("portal")).toBe("student");
    expect(url.searchParams.get("next")).toBe(`/homework/${homeworkId}`);
    await expect(page.getByRole("button", { name: /^Sign in$/ })).toBeVisible();
  });

  for (const fixture of [
    { label: "U1 untargeted", account: "WKE_001_UNTARGETED" },
    { label: "U2 unenrolled", account: "WKE_001_UNENROLLED" },
  ] as const) {
    test(`${fixture.label}: protected homework is not disclosed`, async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== "desktop-chromium",
        "One access-denial run is sufficient.",
      );
      const homeworkId = requiredEnv("WKE_001_PRIMARY_WRITING_DESKTOP_ID");
      await signInStudent(page, student(fixture.account), "/primary");
      const response = await page.goto(`/homework/${encodeURIComponent(homeworkId)}`, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBe(404);
      await expect(
        page.getByRole("button", { name: /^(Start|Open) homework$/ }),
      ).toHaveCount(0);
      await expect(page.getByLabel("Your writing")).toHaveCount(0);
    });
  }
});
