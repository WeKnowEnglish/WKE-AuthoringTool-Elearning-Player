// Runs only in ephemeral PostgreSQL. Never connects to Supabase.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";

const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const migrations = resolve(dirname(fileURLToPath(import.meta.url)), "../supabase/migrations");
const teacher = "10000000-0000-4000-8000-000000000001";
const foreign = "10000000-0000-4000-8000-000000000002";
const classId = "20000000-0000-4000-8000-000000000001";
const activity = "30000000-0000-4000-8000-000000000001";
const manual = "40000000-0000-4000-8000-000000000001";
const homework = "40000000-0000-4000-8000-000000000002";
const pack = { screens: [{ title: "Reviewed words", cards: [{ word: "bread" }] }] };
await db.exec(`
  create role authenticated; create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user_id',true),'')::uuid $$;
  create function public.is_teacher() returns boolean language sql stable as $$ select current_setting('test.role',true)='teacher' $$;
  create function public.is_student() returns boolean language sql stable as $$ select current_setting('test.role',true)='student' $$;
  create table public.teacher_classes(id uuid primary key,teacher_id uuid not null,archived_at timestamptz);
  create table public.class_enrollments(class_id uuid,student_id uuid);
  create table public.class_lessons(id uuid primary key default gen_random_uuid(),class_id uuid references teacher_classes(id),teacher_id uuid not null,
    title text not null,status text not null,notes text not null,created_at timestamptz default now(),updated_at timestamptz default now());
  create table public.class_lesson_steps(id uuid primary key default gen_random_uuid(),lesson_id uuid references class_lessons(id),
    position integer not null,kind text not null,title text not null,config jsonb not null,unique(lesson_id,position));
  create table public.studio_activities(id uuid primary key default gen_random_uuid(),teacher_id uuid not null,format text not null,title text not null,
    pack jsonb,authoring jsonb,source jsonb,created_at timestamptz default now(),updated_at timestamptz default now());
  create table public.class_sessions(id text primary key,class_id uuid,class_lesson_id uuid,created_by uuid,status text default 'active');
  create table public.class_homework(id uuid primary key default gen_random_uuid(),class_id uuid,teacher_id uuid,title text,instructions text,
    due_at timestamptz,status text,payload jsonb,assigned_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now(),
    constraint instructions_len check(char_length(instructions)<=2000));
`);
for (const name of ["109_lightweight_lesson_planner.sql", "157_lesson_vocabulary_generation.sql", "158_lesson_reviewed_delivery.sql"]) await db.exec(readFileSync(resolve(migrations,name),"utf8"));
await db.exec(`
  grant usage on schema auth to authenticated;
  grant select,insert,update,delete on teacher_classes,class_enrollments,class_lessons,class_lesson_steps,studio_activities,class_sessions,class_homework to authenticated;
  alter table class_lessons enable row level security;
  create policy own_lesson on class_lessons to authenticated using(teacher_id=auth.uid()) with check(teacher_id=auth.uid());
  insert into teacher_classes(id,teacher_id) values('${classId}','${teacher}');
  set role authenticated;
  select set_config('test.user_id','${teacher}',false),set_config('test.role','teacher',false);
`);
await db.query("insert into studio_activities(id,teacher_id,format,title,pack) values($1,$2,'flashcards','Reviewed flashcards',$3::jsonb)",[activity,teacher,JSON.stringify(pack)]);
const steps = [
  { id:manual,kind:"custom",title:"Speak with a partner",phase:"communicative_practice",durationMinutes:8,teacherAction:"PRIVATE cue",studentAction:"Ask two questions.",
    config:{materialNote:"cards",planning:{delivery:"classroom",purpose:"Communicate preferences",successCriteria:"Two independent exchanges",grouping:"pairs",scaffolding:"Sentence frame"}} },
  { id:homework,kind:"studio_activity",title:"Review at home",phase:"homework",durationMinutes:7,teacherAction:"PRIVATE homework cue",studentAction:"Recall each word.",
    config:{activityId:activity,format:"flashcards",playPath:"/pilots/games-flashcards",planning:{delivery:"homework",purpose:"Retrieve vocabulary",successCriteria:"Recall without turning the card",grouping:"individual",scaffolding:"Listen after your attempt"}} },
];
const created = await db.query("select create_class_lesson_plan_with_vocabulary($1,'Preferences','Ask about preferences',10,'food','Two exchanges','blank',1,$2::jsonb,'[]') id",[classId,JSON.stringify(steps)]);
const lesson = created.rows[0].id;
const revision = async () => (await db.query("select updated_at::text revision from class_lessons where id=$1",[lesson])).rows[0].revision;
const materialRevisions = async () => ({ [activity]:(await db.query("select updated_at::text revision from studio_activities where id=$1",[activity])).rows[0].revision });
const release = async (rev,refs) => (await db.query("select release_class_lesson_plan($1,$2::timestamptz,$3::jsonb) id",[lesson,rev,JSON.stringify(refs)])).rows[0].id;
let released; let reviewed; let refs;
try {
  await test("reviewed lesson delivery transactions",async (suite) => {
    await suite.test("incomplete manual tasks cannot be released",async () => {
      await db.query("update class_lesson_steps set student_action='' where id=$1",[manual]);
      await assert.rejects(release(await revision(),await materialRevisions()),/student instructions/);
      await db.query("update class_lesson_steps set student_action='Ask two questions.' where id=$1",[manual]);
    });
    await suite.test("stale lesson and material reviews are rejected",async () => {
      await assert.rejects(release("2000-01-01",await materialRevisions()),/Lesson changed/);
      await assert.rejects(release(await revision(),{[activity]:"2000-01-01"}),/Material changed/);
    });
    await suite.test("a release freezes canonical order, instructions, and pack",async () => {
      reviewed=await revision(); refs=await materialRevisions(); released=await release(reviewed,refs);
      const row=(await db.query("select snapshot from class_lesson_releases where id=$1",[released])).rows[0];
      assert.deepEqual(row.snapshot.lesson.steps.map(s=>s.id),[manual,homework]);
      assert.deepEqual(row.snapshot.materials[homework].pack,pack);
      assert.equal((await db.query("select status from class_lessons where id=$1",[lesson])).rows[0].status,"ready");
    });
    await suite.test("release retries reuse the same revision",async () => assert.equal(await release(reviewed,refs),released));
    await suite.test("sessions pin the release they started with",async () => {
      await db.query("insert into class_sessions(id,class_id,class_lesson_id,created_by) values('session',$1,$2,$3)",[classId,lesson,teacher]);
      assert.equal((await db.query("select lesson_release_id from class_sessions where id='session'")).rows[0].lesson_release_id,released);
    });
    await suite.test("later Bank/plan edits leave the old release intact",async () => {
      await db.query("update studio_activities set pack=$2::jsonb,updated_at=updated_at+interval '1 second' where id=$1",[activity,JSON.stringify({screens:[{title:"New words"}]})]);
      await db.query("update class_lessons set title='New draft',updated_at=updated_at+interval '1 second' where id=$1",[lesson]);
      const row=(await db.query("select snapshot from class_lesson_releases where id=$1",[released])).rows[0];
      assert.equal(row.snapshot.lesson.title,"Preferences"); assert.deepEqual(row.snapshot.materials[homework].pack,pack);
      assert.equal(await release(reviewed,refs),released);
    });
    await suite.test("a newer release does not silently replace an active session",async () => {
      const newer=await release(await revision(),await materialRevisions()); assert.notEqual(newer,released);
      await db.query("update class_sessions set class_lesson_id=$1 where id='session'",[lesson]);
      assert.equal((await db.query("select lesson_release_id from class_sessions where id='session'")).rows[0].lesson_release_id,released);
      await db.query("insert into class_sessions(id,class_id,class_lesson_id,created_by) values('next-session',$1,$2,$3)",[classId,lesson,teacher]);
      assert.equal((await db.query("select lesson_release_id from class_sessions where id='next-session'")).rows[0].lesson_release_id,newer);
    });
    await suite.test("homework uses the selected release, not the edited Bank",async () => {
      // Deleting the mutable source must not invalidate prepared assignments.
      await db.query("delete from studio_activities where id=$1",[activity]);
      const result=await db.query("select assign_released_lesson_homework($1,$2,null) id",[released,homework]);
      const row=(await db.query("select * from class_homework where id=$1",[result.rows[0].id])).rows[0];
      assert.deepEqual(row.payload.pack,pack); assert.equal(row.status,"assigned");
      assert.match(row.instructions,/Recall without turning/); assert.match(row.instructions,/7 minutes/);
      assert.doesNotMatch(JSON.stringify(row),/PRIVATE/);
      assert.equal((await db.query("select assign_released_lesson_homework($1,$2,null) id",[released,homework])).rows[0].id,row.id);
    });
    await suite.test("assignment material cannot be edited after delivery",async () => {
      await assert.rejects(db.query("update class_homework set payload='{}' where lesson_release_id=$1",[released]),/content is frozen/);
      await db.query("update class_homework set due_at='2026-10-20',status='closed' where lesson_release_id=$1",[released]);
    });
    await suite.test("classroom tasks cannot be assigned as homework",async () => await assert.rejects(db.query("select assign_released_lesson_homework($1,$2,null)",[released,manual]),/released homework step/));
    await suite.test("clients cannot insert/update a release directly",async () => {
      await assert.rejects(db.query("update class_lesson_releases set snapshot='{}' where id=$1",[released]),/permission denied/);
      await assert.rejects(db.query("delete from class_lesson_releases where id=$1",[released]),/permission denied/);
    });
    await suite.test("foreign teachers cannot read, release, assign, or bind another teacher's lesson",async () => {
      await db.query("select set_config('test.user_id',$1,false)",[foreign]);
      assert.equal((await db.query("select * from class_lesson_releases")).rows.length,0);
      await assert.rejects(release(reviewed,refs),/not found/);
      await assert.rejects(db.query("select assign_released_lesson_homework($1,$2,null)",[released,homework]),/not found/);
      await assert.rejects(db.query("insert into class_sessions(id,class_id,class_lesson_id,created_by) values('foreign',$1,$2,$3)",[classId,lesson,foreign]),/does not belong/);
    });
    await suite.test("students get only safe released outline fields",async () => {
      await db.query("select set_config('test.user_id',$1,false),set_config('test.role','teacher',false)",[teacher]);
      await db.query("insert into class_enrollments values($1,$2)",[classId,foreign]);
      await db.query("update class_lessons set published_at=now(),title='PRIVATE draft title' where id=$1",[lesson]);
      await db.query("select set_config('test.user_id',$1,false),set_config('test.role','student',false)",[foreign]);
      assert.equal((await db.query("select * from class_lesson_releases")).rows.length,0);
      const outline=(await db.query("select * from list_published_class_materials($1,20)",[classId])).rows;
      assert.equal(outline.length,2); assert.equal(outline[0].lesson_title,"New draft");
      assert.doesNotMatch(JSON.stringify(outline),/PRIVATE|teacher_action|planning|pack/);
      await assert.rejects(release(reviewed,refs),/authentication required/);
      await assert.rejects(db.query("select assign_released_lesson_homework($1,$2,null)",[released,homework]),/authentication required/);
    });
  });
} finally { await db.close(); }
