// Real teacher + three isolated student browser sessions against preview or local.
// Only the explicitly-created smoke class, accounts and provider rooms are removed.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, expect as baseExpect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { Liveblocks } from "@liveblocks/node";

const expect = baseExpect.configure({ timeout: 60_000 });
const origin = process.argv[process.argv.indexOf("--base-url") + 1];
assert(process.env.SHARED_DOCUMENT_SMOKE_CONFIRMATION === "disposable-preview-classroom", "Opt in to disposable classroom fixtures.");
assert(origin && ["127.0.0.1", "localhost", "preview.weknowenglish.online"].includes(new URL(origin).hostname), "Explicit local or preview URL required.");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const stamp = Date.now().toString(36);
const output = resolve("../.codex-build/shared-document-smoke", stamp);
mkdirSync(output, { recursive: true });
const report = { origin, checks: [], browserErrors: [], requestFailures: [], classId: null, sessionId: null, roundId: null };
const check = message => { report.checks.push(message); console.log(message); };
const createdUsers = [];
const contexts = [];
const providerRooms = [];
let teacher;
let browser;
function post(surface, path, options) {
  return surface.page.request.post(path, { timeout: 120_000, ...options });
}
async function json(response) {
  const value = await response.json();
  assert(response.ok(), `HTTP ${response.status()}: ${JSON.stringify(value)}`);
  return value;
}
async function surface(credentials, mobile = false) {
  const cookies = [];
  const auth = createServerClient(url, anon, { cookies: {
    getAll: () => cookies,
    setAll: values => { for (const cookie of values) {
      const index = cookies.findIndex(old => old.name === cookie.name);
      if (index >= 0) cookies[index] = cookie; else cookies.push(cookie);
    } },
  } });
  const result = await auth.auth.signInWithPassword(credentials);
  assert.ifError(result.error);
  const context = await browser.newContext({ baseURL: origin, viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
  const network = { offline: false, sockets: [] };
  // Browser offline emulation leaves established WebSockets open. Forward real
  // provider traffic, but explicitly sever its socket for the reconnect check.
  await context.routeWebSocket(/liveblocks/, socket => {
    if (network.offline) { void socket.close({ code: 1001 }); return; }
    const server = socket.connectToServer();
    network.sockets.push({ socket, server });
  });
  contexts.push(context);
  await context.addCookies(cookies.map(cookie => ({ name: cookie.name, value: cookie.value, url: origin, sameSite: "Lax", secure: origin.startsWith("https:") })));
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  await page.addLocatorHandler(page.getByRole("button", { name: "Continue without video", exact: true }), async button => {
    await button.click();
  });
  page.on("pageerror", error => report.browserErrors.push(error.message));
  page.on("response", response => {
    const path = new URL(response.url()).pathname;
    const documentOrClassroom = /^\/api\/(?:document\/|liveblocks\/auth|virtual-classroom\/.*\/(?:document|runtime|tools))/.test(path);
    if (response.status() >= 500 && response.url().startsWith(origin) && documentOrClassroom) report.requestFailures.push({ status: response.status(), url: path });
  });
  return { page, context, network, user: result.data.user };
}
async function openClassroom(surface, data, role) {
  await surface.page.goto(`${origin}/virtual-classroom/join`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await surface.page.evaluate(value => sessionStorage.setItem("wke-vc-session-context", JSON.stringify(value)), {
    ...data, role, classId: report.classId, userId: surface.user.id,
    displayName: surface.user.user_metadata.display_name ?? "Smoke participant",
  });
  await surface.page.goto(`${origin}${role === "host" ? "/teacher" : ""}/virtual-classroom/${report.sessionId}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await expect(surface.page.locator("[data-classroom-shell]")).toBeVisible();
}
const editor = surface => surface.page.locator(".tiptap[contenteditable]");
async function expectWriting(surfaces, text) {
  for (const surface of surfaces) await expect(editor(surface)).toContainText(text);
}
try {
  browser = await chromium.launch({ headless: true });
  teacher = await surface({ email: process.env.WKE_001_TEACHER_EMAIL, password: process.env.WKE_001_TEACHER_PASSWORD });
  const cls = await admin.from("teacher_classes").insert({ teacher_id: teacher.user.id, title: `Shared document smoke ${stamp}` }).select("id").single();
  assert.ifError(cls.error); report.classId = cls.data.id;
  const students = [];
  for (let index = 1; index <= 3; index++) {
    const username = `doc_${stamp}_${index}`;
    const pin = String(100000 + Math.floor(Math.random() * 900000));
    const email = `${username}@students.wke.internal`;
    const displayName = `Document smoke student ${index}`;
    const result = await admin.auth.admin.createUser({ email, password: pin, email_confirm: true,
      app_metadata: { role: "student", wke_fixture_goal: "shared-document" },
      user_metadata: { display_name: displayName, learning_band: "a1" } });
    assert.ifError(result.error); createdUsers.push(result.data.user.id);
    assert.ifError((await admin.from("student_profiles").insert({ user_id: result.data.user.id,
      username, username_normalized: username, display_name: displayName, learning_band: "a1" })).error);
    assert.ifError((await admin.from("class_enrollments").insert({ class_id: report.classId, student_id: result.data.user.id })).error);
    students.push(await surface({ email, password: pin }, index === 3));
  }
  const hosted = await json(await post(teacher, `/api/virtual-classroom/class/${report.classId}/host`, { data: { mode: "extra", title: `Shared writing smoke ${stamp}` } }));
  report.sessionId = hosted.sessionId; providerRooms.push(hosted.roomId);
  await openClassroom(teacher, hosted, "host");
  for (const student of students) {
    const joined = await json(await post(student, "/api/virtual-classroom/join", { data: { joinCode: hosted.joinCode } }));
    await openClassroom(student, joined, "member");
  }
  report.shell = await teacher.page.locator("[data-classroom-shell]").getAttribute("data-classroom-shell");
  check("Teacher and three enrolled student accounts join the current classroom");
  if (!await teacher.page.getByRole("button", { name: "Shared document", exact: true }).isVisible()) {
    await json(await post(teacher, `/api/virtual-classroom/${report.sessionId}/tools`, { data: { type: "SET_UI_MODE", mode: "learn" } }));
  }
  await teacher.page.getByRole("button", { name: "Shared document", exact: true }).click();
  await teacher.page.getByLabel("Document title", { exact: true }).fill(`Our shared story ${stamp}`);
  const launchedResponse = teacher.page.waitForResponse(response => response.url().endsWith(`/api/virtual-classroom/${report.sessionId}/document`) && response.request().method() === "POST");
  await teacher.page.getByRole("button", { name: "Start shared document", exact: true }).click();
  const launched = await json(await launchedResponse);
  report.roundId = launched.roundId; providerRooms.push(launched.roomId);
  const surfaces = [teacher, ...students];
  for (const current of surfaces) {
    await expect(editor(current)).toHaveAttribute("contenteditable", "true");
    assert(new URL(current.page.url()).pathname.includes("virtual-classroom"), "Editor must stay in the classroom.");
  }
  check("Visible Shared document action opens the same editable workspace for teacher and all three students");
  await editor(teacher).fill("The class begins a story.");
  await expectWriting(surfaces, "The class begins a story.");
  check("Teacher writing synchronizes to every student");
  // Concurrent inserts must merge; no read-modify-write replacement is used.
  const contributions = [" Student one sees a cat.", " Student two sees a dog.", " Student three sees a bird."];
  await Promise.all(students.map(async (student, index) => {
    await editor(student).click();
    await student.page.keyboard.press("Control+End");
    await student.page.keyboard.insertText(contributions[index]);
  }));
  for (const text of contributions) await expectWriting(surfaces, text.trim());
  check("Three simultaneous student edits merge and appear on all four screens");
  await students[1].page.reload({ waitUntil: "domcontentloaded" });
  for (const text of contributions) await expect(editor(students[1])).toContainText(text.trim());
  await expect(editor(students[1])).toHaveAttribute("contenteditable", "true");
  check("Student refresh restores the document and editing access");
  students[0].network.offline = true;
  await students[0].context.setOffline(true);
  await Promise.all(students[0].network.sockets.flatMap(({ socket, server }) =>
    [socket.close({ code: 1001 }), server.close({ code: 1001 })].map(closed => closed.catch(() => {}))));
  await expect(students[0].page.getByRole("status").filter({ hasText: "Reconnecting to shared document" })).toBeVisible({ timeout: 45_000 });
  await expect(editor(students[0])).toHaveAttribute("contenteditable", "false");
  await editor(teacher).click(); await teacher.page.keyboard.press("Control+End"); await teacher.page.keyboard.insertText(" The teacher helps us finish.");
  students[0].network.offline = false;
  await students[0].context.setOffline(false);
  await expect(editor(students[0])).toHaveAttribute("contenteditable", "true");
  await expectWriting(surfaces, "The teacher helps us finish.");
  check("Disconnected student sees reconnect status, pauses editing, and recovers all writing on reconnect");
  const bounds = await students[2].page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  assert(bounds.content <= bounds.width + 2, `Mobile horizontal overflow: ${JSON.stringify(bounds)}`);
  await teacher.page.screenshot({ path: resolve(output, "teacher-shared-writing.png"), fullPage: true });
  await students[2].page.screenshot({ path: resolve(output, "student-mobile-writing.png"), fullPage: true });
  check("Mobile student can write without page overflow; desktop and mobile screenshots captured");
  const denied = await browser.newContext({ baseURL: origin }); contexts.push(denied);
  assert.equal((await denied.request.post(`/api/document/${report.roundId}/enter`, { data: {} })).status(), 403);
  assert.equal((await post(students[0], `/api/document/${report.roundId}/commands`, { data: { type: "COLLECT" } })).status(), 403);
  check("Anonymous document entry and student teacher-controls are denied");
  const collectResponse = teacher.page.waitForResponse(response => response.url().endsWith(`/api/document/${report.roundId}/commands`) && response.request().postDataJSON()?.type === "COLLECT");
  await teacher.page.getByRole("button", { name: "Collect", exact: true }).click();
  await json(await collectResponse);
  for (const current of surfaces) await expect(editor(current)).toHaveAttribute("contenteditable", "false");
  const saved = await admin.from("document_submissions").select("plain_text,word_count,content_json").eq("round_id", report.roundId);
  assert.ifError(saved.error); assert.equal(saved.data.length, 1);
  for (const text of ["The class begins a story.", ...contributions, "The teacher helps us finish."]) assert(saved.data[0].plain_text.includes(text.trim()), `Missing collected writing: ${text}`);
  report.savedWordCount = saved.data[0].word_count;
  check("Collect locks all editors and durably saves every teacher/student contribution in Supabase");
  teacher.page.once("dialog", dialog => dialog.accept());
  const completeResponse = teacher.page.waitForResponse(response => response.url().endsWith(`/api/document/${report.roundId}/commands`) && response.request().postDataJSON()?.type === "COMPLETE");
  await teacher.page.getByRole("button", { name: "Complete", exact: true }).click();
  await json(await completeResponse);
  for (const current of surfaces) await expect(current.page.locator(".tiptap")).toHaveCount(0);
  const session = await admin.from("class_sessions").select("status").eq("id", report.sessionId).single();
  assert.ifError(session.error); assert.equal(session.data.status, "active");
  const round = await admin.from("document_rounds").select("phase").eq("id", report.roundId).single();
  assert.ifError(round.error); assert.equal(round.data.phase, "completed");
  check("Complete returns all four participants to the classroom and leaves the lesson active");
  assert.equal(report.browserErrors.length, 0, JSON.stringify(report.browserErrors));
  assert.equal(report.requestFailures.length, 0, JSON.stringify(report.requestFailures));
  report.passed = true;
} catch (error) {
  report.passed = false; report.error = String(error.message ?? error).split("\n")[0];
  if (teacher) await teacher.page.screenshot({ path: resolve(output, "failure.png"), fullPage: true }).catch(() => {});
  throw new Error(report.error);
} finally {
  // End only this script's newly-created session, then remove disposable records.
  if (report.sessionId && teacher) {
    const ended = await post(teacher, `/api/virtual-classroom/${report.sessionId}`, { data: { type: "END_SESSION" } }).catch(() => null);
    report.cleanupSessionStatus = ended?.status() ?? null;
  }
  for (const context of contexts) await context.close().catch(() => {});
  if (browser) await browser.close();
  if (process.env.LIVEBLOCKS_SECRET_KEY) {
    const provider = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });
    for (const roomId of providerRooms) if (roomId) await provider.deleteRoom(roomId).catch(() => {});
  }
  if (report.classId) {
    // Session records can carry usage FK references; keep an archived smoke class
    // if the database refuses cascading removal, with no real student work involved.
    const removed = await admin.from("teacher_classes").delete().eq("id", report.classId);
    if (removed.error) {
      await admin.from("teacher_classes").update({ archived_at: new Date().toISOString() }).eq("id", report.classId);
      report.cleanupClass = "archived";
    } else report.cleanupClass = "removed";
  }
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id);
  writeFileSync(resolve(output, "report.json"), JSON.stringify(report, null, 2));
  console.log(`Report: ${resolve(output, "report.json")}`);
}
