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
const output = resolve("../.codex-build/classroom-live-smoke", stamp);
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
  const network = { offlineRoomId: null, sockets: [] };
  // Browser offline emulation leaves established WebSockets open. Forward real
  // provider traffic, but explicitly sever its socket for the reconnect check.
  await context.routeWebSocket(/liveblocks/, socket => {
    const roomId = new URL(socket.url()).searchParams.get("roomId");
    if (network.offlineRoomId === roomId) { void socket.close({ code: 1001 }); return; }
    const server = socket.connectToServer();
    network.sockets.push({ socket, server, roomId });
  });
  contexts.push(context);
  await context.addCookies(cookies.map(cookie => ({ name: cookie.name, value: cookie.value, url: origin, sameSite: "Lax", secure: origin.startsWith("https:") })));
  await context.grantPermissions(["camera", "microphone"]);
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
  browser = await chromium.launch({ headless: true, args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  teacher = await surface({ email: process.env.WKE_001_TEACHER_EMAIL, password: process.env.WKE_001_TEACHER_PASSWORD });
  const cls = await admin.from("teacher_classes").insert({ teacher_id: teacher.user.id, title: `Live classroom smoke ${stamp}` }).select("id").single();
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
    students.push(await surface({ email, password: pin }));
  }
  const hosted = await json(await post(teacher, `/api/virtual-classroom/class/${report.classId}/host`, { data: { mode: "extra", title: `Live classroom smoke ${stamp}` } }));
  report.sessionId = hosted.sessionId; providerRooms.push(hosted.roomId);
  await openClassroom(teacher, hosted, "host");
  for (const student of students) {
    const joined = await json(await post(student, "/api/virtual-classroom/join", { data: { joinCode: hosted.joinCode } }));
    await openClassroom(student, joined, "member");
  }
  report.shell = await teacher.page.locator("[data-classroom-shell]").getAttribute("data-classroom-shell");
  check("Teacher and three enrolled student accounts join the current classroom");

  const surfaces=[teacher,...students];
  const diagnostics = current => current.page.evaluate(()=>JSON.parse(sessionStorage.getItem('wke:app-diagnostics:v1')??'[]'));
  report.joinMs=[];
  for(const current of surfaces){
    const started=Date.now();
    const join=current.page.frameLocator('iframe').getByRole('button',{name:'Join',exact:true});
    await expect(join).toBeVisible({timeout:90000});
    await join.click();
    await expect.poll(async()=>(await diagnostics(current)).some(e=>e.name==='daily_join'&&e.kind==='span'),{timeout:90000}).toBe(true);
    report.joinMs.push(Date.now()-started);
  }
  check('Teacher and all three students join a real Daily call with synthetic media');
  report.initialJavascript=await teacher.page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes(location.origin)&&/\.js(?:\?|$)/.test(e.name)).map(e=>({path:new URL(e.name).pathname,bytes:e.encodedBodySize,ms:Math.round(e.duration)})));
  const iframeHandles=await Promise.all(surfaces.map(s=>s.page.locator('iframe').elementHandle()));
  const joinsBefore=await Promise.all(surfaces.map(async s=>(await diagnostics(s)).filter(e=>e.name==='daily_join_start').length));
  await teacher.page.getByRole('button',{name:'Browser fullscreen',exact:true}).click();
  await expect.poll(()=>teacher.page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true);
  report.fullscreenKeepsLearnControl=await teacher.page.getByRole('button',{name:'Learn',exact:true}).evaluate(button=>!document.fullscreenElement||document.fullscreenElement.contains(button));
  if(process.argv.includes('--require-smooth')) {
    assert(report.fullscreenKeepsLearnControl,'Fullscreen must retain the teacher Learn control.');
    await teacher.page.getByRole('button',{name:'Learn',exact:true}).click();
    await expect(teacher.page.getByRole('tab',{name:'Whiteboard',exact:true})).toBeVisible();
    await teacher.page.getByRole('button',{name:'Meeting',exact:true}).click();
    await expect(teacher.page.getByRole('button',{name:'Learn',exact:true})).toBeVisible();
    check('Teacher can switch to Learn and back while browser fullscreen remains active');
  }
  await teacher.page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});
  await expect.poll(()=>teacher.page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(false);
  report.learnSwitchMs=[];
  report.teacherLearnSwitchMs=[];
  for(let attempt=0;attempt<3;attempt++){
    const started=Date.now();
    await teacher.page.getByRole('button',{name:'Learn',exact:true}).click();
    await expect(teacher.page.getByRole('tab',{name:'Whiteboard',exact:true})).toBeVisible();
    report.teacherLearnSwitchMs.push(Date.now()-started);
    for(const current of surfaces)await expect(current.page.getByRole('tab',{name:'Whiteboard',exact:true})).toBeVisible();
    report.learnSwitchMs.push(Date.now()-started);
    await teacher.page.getByRole('button',{name:'Meeting',exact:true}).click();
    await expect(teacher.page.getByRole('button',{name:'Learn',exact:true})).toBeVisible();
  }
  check('Three video-to-Learn round trips synchronize all four browsers');
  if(process.argv.includes('--require-smooth')) {
    const path=`**/api/virtual-classroom/${report.sessionId}/tools`;
    const denyNavigation=async route=>{
      if(route.request().postDataJSON()?.type==='SET_UI_MODE')await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:'Navigation failure fixture'})});
      else await route.continue();
    };
    await teacher.page.route(path,denyNavigation);
    await teacher.page.getByRole('button',{name:'Learn',exact:true}).click();
    await expect(teacher.page.getByText('Navigation failure fixture',{exact:true})).toBeVisible();
    await expect(teacher.page.getByRole('button',{name:'Learn',exact:true})).toBeVisible();
    await teacher.page.unroute(path,denyNavigation);
    check('Rejected navigation restores the confirmed Meeting view and shows the failure');
  }
  await teacher.page.getByRole('button',{name:'Learn',exact:true}).click();
  if(process.argv.includes('--require-smooth')) {
    await students[0].page.evaluate(userId=>sessionStorage.setItem('wke-whiteboard-session-context',JSON.stringify({sessionId:'ABCDEF',roomId:'wke-whiteboard-ABCDEF',role:'player',userId,displayName:'Old fixture',color:'#000'})),students[0].user.id);
  }
  const boardResponse=teacher.page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes(`/api/virtual-classroom/${report.sessionId}/whiteboard`));
  await teacher.page.getByRole('button',{name:'Open class board',exact:true}).click();
  const board=await json(await boardResponse);
  providerRooms.push(board.roomId);
  report.boardSessionId=board.sessionId;
  const drawing = current => current.page.locator('svg.touch-none');
  for(const current of surfaces)await expect(drawing(current)).toBeVisible({timeout:60000});
  check('Class whiteboard opens alongside the active video call');
  for(const current of surfaces) {
    assert.equal(await current.page.evaluate(()=>JSON.parse(sessionStorage.getItem('wke-whiteboard-session-context')).sessionId),board.sessionId);
  }
  const bounds=await drawing(teacher).boundingBox();
  const drawnAt=Date.now();
  await teacher.page.mouse.move(bounds.x+bounds.width*0.3,bounds.y+bounds.height*0.3);
  await teacher.page.mouse.down();
  await teacher.page.mouse.move(bounds.x+bounds.width*0.55,bounds.y+bounds.height*0.5,{steps:10});
  await teacher.page.mouse.up();
  for(const current of surfaces)await expect(drawing(current).locator('path[stroke]')).toHaveCount(1);
  report.boardSyncMs=Date.now()-drawnAt;
  check('Teacher drawing synchronizes to all three student boards');
  await teacher.page.screenshot({path:resolve(output,'teacher-learn-video.png'),fullPage:true});

  if(process.argv.includes('--require-smooth')) {
    const student=students[0];
    student.network.offlineRoomId=hosted.roomId;
    const sockets=student.network.sockets.filter(socket=>socket.roomId===hosted.roomId);
    assert(sockets.length>0,'Real classroom collaboration connection required.');
    await Promise.all(sockets.flatMap(({socket,server})=>[socket.close({code:1001}),server.close({code:1001})].map(closed=>closed.catch(()=>{}))));
    await expect(student.page.getByRole('status').filter({hasText:'Reconnecting to classroom tools'})).toBeVisible();
    assert(await student.page.locator('iframe').evaluate((frame,original)=>frame===original,iframeHandles[1]),'Collaboration interruption must not replace the video iframe.');
    const restoredAt=Date.now();
    student.network.offlineRoomId=null;
    await expect(student.page.getByRole('status').filter({hasText:'Reconnecting to classroom tools'})).toHaveCount(0);
    await expect(drawing(student).locator('path[stroke]')).toHaveCount(1);
    report.classroomRecoveryMs=Date.now()-restoredAt;
    check('Classroom collaboration reconnects with the board intact and video mounted');
  }

  await teacher.page.getByRole('button',{name:'Shared document',exact:true}).click();
  await teacher.page.getByLabel('Document title',{exact:true}).fill(`Live class writing ${stamp}`);
  const documentResponse=teacher.page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith(`/api/virtual-classroom/${report.sessionId}/document`));
  await teacher.page.getByRole('button',{name:'Start shared document',exact:true}).click();
  const launched=await json(await documentResponse);
  report.roundId=launched.roundId; providerRooms.push(launched.roomId);
  for(const current of surfaces)await expect(editor(current)).toHaveAttribute('contenteditable','true');
  await editor(teacher).fill('Our video lesson is ready.');
  await expectWriting(surfaces,'Our video lesson is ready.');
  const contributions=[' Student one writes.',' Student two writes.',' Student three writes.'];
  await Promise.all(students.map(async(student,index)=>{
    await editor(student).click();await student.page.keyboard.press('Control+End');await student.page.keyboard.insertText(contributions[index]);
  }));
  for(const text of contributions)await expectWriting(surfaces,text.trim());
  check('All four participants write together while the same video call continues');
  const collectResponse=teacher.page.waitForResponse(r=>r.url().endsWith(`/api/document/${report.roundId}/commands`)&&r.request().postDataJSON()?.type==='COLLECT');
  await teacher.page.getByRole('button',{name:'Collect',exact:true}).click();
  await json(await collectResponse);
  for(const current of surfaces)await expect(editor(current)).toHaveAttribute('contenteditable','false');
  const saved=await admin.from('document_submissions').select('plain_text').eq('round_id',report.roundId).single();
  assert.ifError(saved.error);
  for(const text of ['Our video lesson is ready.',...contributions])assert(saved.data.plain_text.includes(text.trim()));
  check('Collected writing durably saves every contribution during the live call');
  for(const [index,current] of surfaces.entries()){
    assert(await current.page.locator('iframe').evaluate((frame,original)=>frame===original,iframeHandles[index]),'Daily iframe must survive Learn and whiteboard changes.');
    assert.equal((await diagnostics(current)).filter(e=>e.name==='daily_join_start').length,joinsBefore[index],'Switching Learn must not rejoin video.');
  }
  check('Video iframe and joined call survive Learn navigation and whiteboard launch');
  report.javascript=await teacher.page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes(location.origin)&&/\.js(?:\?|$)/.test(e.name)).map(e=>({path:new URL(e.name).pathname,bytes:e.encodedBodySize,ms:Math.round(e.duration)})));
  await teacher.page.screenshot({path:resolve(output,'teacher-document-video.png'),fullPage:true});
  assert.equal(report.browserErrors.length,0,JSON.stringify(report.browserErrors));
  assert.equal(report.requestFailures.length,0,JSON.stringify(report.requestFailures));
  report.passed=true;
} catch (error) {
  const message = String(error.message ?? error);
  report.passed = false;
  report.error = (/^(?:expect\(|locator\.)/.test(message) ? message.slice(0, 2000) : message.split("\n")[0]).replace(/(https?:\/\/[^\s"<>?]+)\?[^\s"<>]*/g, '$1?[redacted]');
  for (const [index, context] of contexts.entries()) {
    await context.pages()[0]?.screenshot({ path: resolve(output, `failure-${index}.png`), fullPage: true }).catch(() => {});
  }
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
