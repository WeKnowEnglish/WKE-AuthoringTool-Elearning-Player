// Opt-in browser smoke against a designated teacher/class fixture. No homework is assigned.
// node --env-file=.env.local scripts/smoke-course-map.mjs --base-url http://127.0.0.1:3100
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, expect as baseExpect } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
const expect = baseExpect.configure({ timeout: 60_000 });
if (
  process.env.COURSE_MAP_SMOKE_CONFIRMATION !== "teacher-owned-preview-fixtures"
)
  throw new Error(
    "Set COURSE_MAP_SMOKE_CONFIRMATION=teacher-owned-preview-fixtures to authorize teacher-owned smoke fixtures.",
  );
const baseURL = process.argv[process.argv.indexOf("--base-url") + 1];
if (!baseURL || !/^https?:\/\//.test(baseURL))
  throw new Error("Pass --base-url explicitly.");
const classId = process.env.WKE_001_PRIMARY_CLASS_ID;
const email = process.env.WKE_001_TEACHER_EMAIL;
const password = process.env.WKE_001_TEACHER_PASSWORD;
if (!classId || !email || !password)
  throw new Error("Designated teacher/class fixture credentials are required.");
const cookies = [];
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    cookies: {
      getAll: () => cookies,
      setAll: (values) => {
        for (const value of values) {
          const i = cookies.findIndex((c) => c.name === value.name);
          if (i >= 0) cookies[i] = value;
          else cookies.push(value);
        }
      },
    },
  },
);
const auth = await supabase.auth.signInWithPassword({ email, password });
if (auth.error)
  throw new Error(`Fixture sign-in failed: ${auth.error.message}`);
const sourceId = crypto.randomUUID();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const title = `Course map smoke · ${stamp}`;
const source = {
  version: 1,
  kind: "vocabulary-list",
  id: sourceId,
  name: `Classroom smoke ${stamp}`,
  cefr: "Pre-A1",
  entries: [
    {
      id: "pencil",
      word: "pencil",
      definitionEn: "A tool for writing that you can erase",
    },
    { id: "book", word: "book", definitionEn: "Pages together that you read" },
    {
      id: "chair",
      word: "chair",
      definitionEn: "Something for one person to sit on",
    },
  ],
};
const inserted = await supabase
  .from("studio_activities")
  .insert({
    id: sourceId,
    teacher_id: auth.data.user.id,
    format: "vocabulary_list",
    title: source.name,
    authoring: source,
    pack: {
      version: 1,
      kind: "vocabulary-list-pack",
      id: sourceId,
      name: source.name,
      entry_count: 3,
    },
    source: { via: "course_map_smoke" },
  });
if (inserted.error) throw inserted.error;
const output = resolve("../.codex-build/course-map-smoke", stamp);
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
await context.addCookies(
  cookies.map((c) => ({
    name: c.name,
    value: c.value,
    url: baseURL,
    sameSite: "Lax",
    secure: baseURL.startsWith("https:"),
  })),
);
const page = await context.newPage();
page.setDefaultTimeout(60_000);
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(error.message));
const report = {
  baseURL,
  sourceId,
  courseTitle: title,
  classId,
  checks: [],
  browserErrors,
};
const check = (text) => {
  report.checks.push(text);
  console.log(text);
};
try {
  await page.goto(
    `${baseURL}/teacher/libraries/course-map?classId=${classId}`,
    { waitUntil: "domcontentloaded", timeout: 120_000 },
  );
  await expect(
    page.getByRole("heading", { name: "Course map", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Libraries", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Course title", { exact: true }).fill(title);
  await page
    .getByRole("button", { name: "Create course map", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible({ timeout: 120_000 });
  report.mapId = new URL(page.url()).pathname.split("/").at(-1);
  check("Creates and persists a teacher-owned course map");
  await page
    .getByRole("button", { name: "Course details", exact: true })
    .click();
  await page
    .getByLabel("Intended learners / age band", { exact: true })
    .fill("Primary learners · ages 7–9");
  await page.getByLabel("Grade range", { exact: true }).fill("2–3");
  await page.getByLabel("CEFR range", { exact: true }).fill("Pre-A1–A1");
  await page
    .getByLabel("Course outcomes", { exact: true })
    .fill("Ask and answer about familiar classroom objects.");
  await page
    .getByRole("button", { name: "Course details", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Add unit", exact: true }).click();
  await page.getByLabel("Unit title", { exact: true }).fill("My classroom");
  await page
    .getByLabel("Unit outcome", { exact: true })
    .fill("Exchange information about classroom objects");
  await page.getByRole("button", { name: "+ Add lesson", exact: true }).click();
  await page
    .getByLabel("Planned lesson title", { exact: true })
    .fill("Ask about classroom objects");
  await page
    .getByLabel("Observable learning objective", { exact: true })
    .fill("Ask and answer about three classroom objects independently.");
  await page
    .getByLabel("Student-friendly goal", { exact: true })
    .fill("I can ask my partner about classroom objects.");
  await page
    .getByLabel("Success criteria / learning check", { exact: true })
    .fill("Complete three understandable exchanges without a model.");
  await page
    .getByLabel("Target language / grammar patterns", { exact: true })
    .fill("What's this? It's a pencil / book / chair.");
  await page
    .getByLabel("Teacher-led task instructions", { exact: true })
    .fill(
      "Work with a partner. Take turns pointing to an object and asking What's this? Answer using It's a… .",
    );
  await page.getByLabel("New target", { exact: true }).fill("pencil");
  await page.getByRole("button", { name: "Add target", exact: true }).click();
  await page
    .getByLabel("Available resources", { exact: true })
    .selectOption(sourceId);
  await page
    .getByRole("button", { name: "Link resource", exact: true })
    .click();
  await page
    .getByLabel("Learning purpose", { exact: true })
    .fill("Retrieve object words before independent speaking.");
  await page.getByRole("button", { name: "Save map", exact: true }).click();
  await expect(page.getByText("Unsaved changes", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText(/Saved · revision 2/)).toBeVisible();
  report.plannedLessonId = new URL(page.url()).searchParams.get("lesson");
  await page.screenshot({
    path: resolve(output, "sequence-desktop.png"),
    fullPage: true,
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Save map", exact: true })).toBeEnabled();
  await expect(
    page.getByLabel("Planned lesson title", { exact: true }),
  ).toHaveValue("Ask about classroom objects");
  await expect(
    page.getByLabel("Success criteria / learning check", { exact: true }),
  ).toHaveValue("Complete three understandable exchanges without a model.");
  check("Reopens the saved learning brief, targets and source link");
  await page
    .getByRole("button", { name: "Target coverage", exact: true })
    .click();
  await expect(
    page.getByText("No planned assessment · No later revisit", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: resolve(output, "coverage-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sequence", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: resolve(output, "sequence-mobile.png"),
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
    "Mobile page should not overflow horizontally",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  check("Shows actionable target gaps and fits a mobile viewport");
  await expect(page.getByLabel("Class", { exact: true })).toHaveValue(classId);
  await page
    .getByRole("button", { name: "Create class lesson", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Plan the learning first", exact: true }),
  ).toBeVisible({ timeout: 120_000 });
  report.classLessonId = new URL(page.url()).searchParams.get("lessonId");
  await expect(
    page.getByText("From course map:", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate flashcards", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Generate flashcards", exact: true })
    .click();
  await expect(page.getByText(/Material added and lesson saved/i)).toBeVisible({
    timeout: 120_000,
  });
  await page
    .getByRole("button", { name: "Generate vocabulary check", exact: true })
    .click();
  await expect(page.getByText(/Material added and lesson saved/i)).toBeVisible({
    timeout: 120_000,
  });
  check(
    "Creates a class draft and generates flashcards and a recognition check from copied vocabulary",
  );
  const previews = page.getByRole("link", { name: "Preview", exact: true });
  await expect(previews).toHaveCount(2);
  for (let index = 0; index < 2; index++) {
    const preview = await context.newPage();
    preview.on("pageerror", (error) => browserErrors.push(error.message));
    const href = await previews.nth(index).getAttribute("href");
    const response = await preview.goto(new URL(href, baseURL).href, { waitUntil: "domcontentloaded", timeout: 120_000 });
    assert.equal(response.status(), 200);
    await expect(preview.locator("body")).toContainText(source.name);
    if (new URL(href, baseURL).pathname.includes("flashcards")) {
      await preview.getByRole("button", { name: "Card front. Tap to flip.", exact: true }).click();
    }
    await expect(preview.locator("body")).toContainText(/pencil|book|chair/);
    await preview.screenshot({ path: resolve(output, `material-${index + 1}.png`), fullPage: true });
    await preview.close();
  }
  check("Both generated activities open in the existing Lesson Player");
  await page
    .getByRole("button", { name: "Save and check preparation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Release reviewed lesson", exact: true }),
  ).toBeVisible({ timeout: 120_000 });
  await page.screenshot({
    path: resolve(output, "planner-reviewed.png"),
    fullPage: true,
  });
  check("Existing planner reviews the imported task and generated materials");
  await page.getByLabel("I have previewed the materials and checked the sequence, instructions, and success criteria.", { exact: true }).check();
  await page.getByRole("button", { name: "Release reviewed lesson", exact: true }).click();
  await expect(page.getByText("Reviewed lesson released for teaching. Assign homework below when you are ready.", { exact: true })).toBeVisible();
  const released = await supabase.from("class_lessons").select("latest_release_id").eq("id", report.classLessonId).single();
  if (released.error) throw released.error;
  assert.ok(released.data.latest_release_id);
  report.releaseId = released.data.latest_release_id;
  check("Explicit teacher review produces an immutable release without assigning homework");
  const map = await supabase
    .from("curriculum_maps")
    .select("revision,document")
    .eq("id", report.mapId)
    .single();
  if (map.error) throw map.error;
  const changed = structuredClone(map.data.document);
  changed.units[0].lessons[0].title = "Updated course title after import";
  const edited = await supabase.rpc("save_curriculum_map", {
    p_id: report.mapId,
    p_expected_revision: map.data.revision,
    p_document: changed,
  });
  if (edited.error) throw edited.error;
  const classPlan = await supabase
    .from("class_lessons")
    .select("title,vocabulary_sources")
    .eq("id", report.classLessonId)
    .single();
  if (classPlan.error) throw classPlan.error;
  assert.equal(classPlan.data.title, "Ask about classroom objects");
  assert.notEqual(classPlan.data.vocabulary_sources[0].vocabListId, sourceId);
  check(
    "Later curriculum edits preserve the prepared class plan and its copied vocabulary",
  );
  const release = await supabase.from("class_lesson_releases").select("snapshot").eq("id", report.releaseId).single();
  if (release.error) throw release.error;
  const [releasedStepId, releasedMaterial] = Object.entries(release.data.snapshot.materials)
    .find(([, material]) => material.format === "flashcards");
  const releasedPreview = await context.newPage();
  releasedPreview.on("pageerror", (error) => browserErrors.push(error.message));
  const releasedResponse = await releasedPreview.goto(`${baseURL}/teacher/lesson-releases/${report.releaseId}/steps/${releasedStepId}/play`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  assert.equal(releasedResponse.status(), 200);
  await expect(releasedPreview.locator("body")).toContainText("Reviewed lesson material");
  await expect(releasedPreview.locator("body")).toContainText(releasedMaterial.title);
  await releasedPreview.getByRole("button", { name: "Card front. Tap to flip.", exact: true }).click();
  await expect(releasedPreview.locator("body")).toContainText(/pencil|book|chair/);
  await releasedPreview.screenshot({ path: resolve(output, "released-material.png"), fullPage: true });
  await releasedPreview.close();
  check("Pinned reviewed material plays after the course map changes");
  assert.deepEqual(browserErrors, []);
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.error = error.message;
  report.pageState = await page.locator("body").ariaSnapshot().catch(() => "Unavailable");
  await page
    .screenshot({ path: resolve(output, "failure.png"), fullPage: true })
    .catch(() => {});
  throw error;
} finally {
  writeFileSync(
    resolve(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  console.log(`Smoke report: ${resolve(output, "report.json")}`);
}
