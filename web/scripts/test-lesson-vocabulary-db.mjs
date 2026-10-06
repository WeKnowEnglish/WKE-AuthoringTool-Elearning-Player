// Isolated PostgreSQL execution checks. Never connects to the linked Supabase project.
// Pass an installed @electric-sql/pglite/dist/index.js path as the first argument.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { test } from "node:test";

const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const migrationDir = resolve(dirname(fileURLToPath(import.meta.url)), "../supabase/migrations");
const teacher = "10000000-0000-4000-8000-000000000001";
const otherTeacher = "10000000-0000-4000-8000-000000000002";
const classId = "20000000-0000-4000-8000-000000000001";
const listId = "30000000-0000-4000-8000-000000000001";
const foreignList = "30000000-0000-4000-8000-000000000002";
const activityId = "40000000-0000-4000-8000-000000000001";
const stepId = "50000000-0000-4000-8000-000000000001";
const sources = [{ vocabListId: listId, name: "Untrusted name" }];

await db.exec(`
  create role authenticated;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user_id', true), '')::uuid $$;
  create function public.is_teacher() returns boolean language sql stable as $$ select current_setting('test.role', true) = 'teacher' $$;
  create function public.is_student() returns boolean language sql stable as $$ select current_setting('test.role', true) = 'student' $$;
  create table public.teacher_classes (id uuid primary key, teacher_id uuid not null);
  create table public.class_enrollments (class_id uuid, student_id uuid);
  create table public.class_lessons (
    id uuid primary key default gen_random_uuid(), class_id uuid references teacher_classes(id),
    teacher_id uuid not null, title text not null, status text not null, notes text not null,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  );
  create table public.class_lesson_steps (
    id uuid primary key default gen_random_uuid(), lesson_id uuid references class_lessons(id),
    position integer not null, kind text not null, title text not null, config jsonb not null,
    unique(lesson_id, position)
  );
  create table public.studio_activities (
    id uuid primary key default gen_random_uuid(), teacher_id uuid not null, format text not null,
    title text not null, pack jsonb, authoring jsonb, source jsonb,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  );
`);
await db.exec(readFileSync(resolve(migrationDir, "109_lightweight_lesson_planner.sql"), "utf8"));
await db.exec(readFileSync(resolve(migrationDir, "157_lesson_vocabulary_generation.sql"), "utf8"));
await db.exec(`
  grant usage on schema auth to authenticated;
  grant select, insert, update, delete on all tables in schema public to authenticated;
  alter table teacher_classes enable row level security;
  create policy own_class on teacher_classes to authenticated using (teacher_id = auth.uid());
  alter table class_lessons enable row level security;
  create policy own_lesson on class_lessons to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
  alter table studio_activities enable row level security;
  create policy own_activity on studio_activities to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
  alter table class_lesson_steps enable row level security;
  create policy own_step on class_lesson_steps to authenticated using (exists(select 1 from class_lessons l where l.id = lesson_id and l.teacher_id = auth.uid()));
  insert into teacher_classes values ('${classId}', '${teacher}');
  insert into studio_activities (id, teacher_id, format, title) values
    ('${listId}', '${teacher}', 'vocabulary_list', 'Bakery'),
    ('${foreignList}', '${otherTeacher}', 'vocabulary_list', 'Private foreign list');
  set role authenticated;
  select set_config('test.user_id', '${teacher}', false), set_config('test.role', 'teacher', false);
`);

async function createLesson() {
  const result = await db.query(`select public.create_class_lesson_plan_with_vocabulary($1, 'Bakery lesson', 'Recall bakery words', 45, 'bread, cake', 'Choose meanings', 'blank', 1, '[]', $2::jsonb) as id`, [classId, JSON.stringify(sources)]);
  return result.rows[0].id;
}
async function revision(id) { return (await db.query("select updated_at::text as revision from class_lessons where id = $1", [id])).rows[0].revision; }
async function sourceRevision() { return (await db.query("select updated_at::text as revision from studio_activities where id = $1", [listId])).rows[0].revision; }
async function save(id, rev, steps = [], refs = sources) {
  return db.query(`select public.save_class_lesson_plan_with_vocabulary($1, 'Updated bakery', '', 'draft', 'Recall words', 45, 'bakery', 'Check words', $2::jsonb, $3::jsonb, $4::timestamptz)`, [id, JSON.stringify(steps), JSON.stringify(refs), rev]);
}
function generatedStep(hash = "a".repeat(64), durationMinutes = 5) {
  return { id: stepId, kind: "studio_activity", title: "Bakery flashcards", phase: "teach", durationMinutes,
    teacherAction: "Model", studentAction: "Recall", config: { activityId, format: "flashcards", playPath: `/pilots/games-flashcards?activity=${activityId}`,
      generation: { inputHash: hash, recipe: { vocabListId: listId, selectedEntryIds: ["v1"] } } } };
}
async function generate(id, rev, step = generatedStep(), sourceRev) {
  return db.query(`select public.add_class_lesson_vocabulary_activity($1, $2::timestamptz, $3, $4::timestamptz, $5, $6::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)`,
    [id, rev, listId, sourceRev ?? await sourceRevision(), activityId, JSON.stringify(step)]);
}

try {
  await test("lesson vocabulary PostgreSQL transactions and permissions", async (suite) => {
    let lesson;
    await suite.test("create stores authorized source references and canonical names", async () => {
      lesson = await createLesson();
      const stored = (await db.query("select vocabulary_sources from class_lessons where id=$1", [lesson])).rows[0].vocabulary_sources;
      assert.deepEqual(stored, [{ vocabListId: listId, name: "Bakery" }]);
    });
    await suite.test("foreign lists are rejected without changing the saved plan", async () => {
      await assert.rejects(save(lesson, await revision(lesson), [], [{ vocabListId: foreignList }]), /vocabulary list not found/);
      assert.equal((await db.query("select title from class_lessons where id=$1", [lesson])).rows[0].title, "Bakery lesson");
    });
    await suite.test("duplicate sources are rejected", async () => {
      await assert.rejects(save(lesson, await revision(lesson), [], [sources[0], sources[0]]), /vocabulary list not found/);
    });
    await suite.test("a stale save cannot overwrite a newer lesson", async () => {
      const oldRevision = await revision(lesson);
      await save(lesson, oldRevision);
      await assert.rejects(save(lesson, oldRevision), /changed in another session/);
    });
    await suite.test("failed step insert rolls back the generated activity", async () => {
      await assert.rejects(generate(lesson, await revision(lesson), generatedStep("a".repeat(64), 0)), /duration_range/);
      assert.equal((await db.query("select count(*)::int as count from studio_activities where id=$1", [activityId])).rows[0].count, 0);
    });
    await suite.test("a vocabulary edit during compilation stops stale generation", async () => {
      const oldSourceRevision = await sourceRevision();
      await db.query("update studio_activities set updated_at = updated_at + interval '1 second' where id=$1", [listId]);
      await assert.rejects(generate(lesson, await revision(lesson), generatedStep(), oldSourceRevision), /Vocabulary changed/);
    });
    await suite.test("activity and step persist together with their selected words", async () => {
      await generate(lesson, await revision(lesson));
      const stored = (await db.query("select config from class_lesson_steps where lesson_id=$1", [lesson])).rows[0].config;
      assert.deepEqual(stored.generation.recipe.selectedEntryIds, ["v1"]);
      assert.equal((await db.query("select count(*)::int as count from studio_activities where id=$1", [activityId])).rows[0].count, 1);
    });
    await suite.test("an uncertain retry does not duplicate or overwrite the output", async () => {
      await generate(lesson, "2000-01-01T00:00:00Z");
      assert.equal((await db.query("select count(*)::int as count from class_lesson_steps where lesson_id=$1", [lesson])).rows[0].count, 1);
      await assert.rejects(generate(lesson, await revision(lesson), generatedStep("b".repeat(64))), /retry has different inputs/);
    });
    await suite.test("sources cannot be detached while their generated steps remain", async () => {
      const steps = [generatedStep()];
      await assert.rejects(save(lesson, await revision(lesson), steps, []), /attached vocabulary list/);
      assert.equal((await db.query("select count(*)::int as count from class_lesson_steps where lesson_id=$1", [lesson])).rows[0].count, 1);
    });
    await suite.test("duplicating a prepared lesson keeps sources and recipes with new step IDs", async () => {
      const copyStep = generatedStep(); delete copyStep.id;
      const copy = await db.query(`select public.create_class_lesson_plan_with_vocabulary($1, 'Copy', 'Recall words', 45, '', '', 'blank', 1, $2::jsonb, $3::jsonb) as id`, [classId, JSON.stringify([copyStep]), JSON.stringify(sources)]);
      const copiedStep = (await db.query("select id, config from class_lesson_steps where lesson_id=$1", [copy.rows[0].id])).rows[0];
      assert.notEqual(copiedStep.id, stepId);
      assert.deepEqual(copiedStep.config.generation.recipe.selectedEntryIds, ["v1"]);
    });
    await suite.test("published student outlines exclude source content and generation recipes", async () => {
      await db.query("update class_lessons set published_at = now() where id=$1", [lesson]);
      await db.query("insert into class_enrollments (class_id, student_id) values ($1,$2)", [classId, teacher]);
      await db.query("select set_config('test.role', 'student', false)");
      const projection = (await db.query("select * from public.list_published_class_materials($1,20)", [classId])).rows[0];
      assert.equal(projection.step_title, "Bakery flashcards");
      assert.equal(Object.hasOwn(projection, "config"), false);
      assert.equal(Object.hasOwn(projection, "vocabulary_sources"), false);
      assert.equal(Object.hasOwn(projection, "notes"), false);
      await db.query("select set_config('test.role', 'teacher', false)");
    });
    await suite.test("legacy saves still work and preserve shared sources", async () => {
      await db.query(`select public.save_class_lesson_plan($1, 'Legacy saved', '', 'draft', 'Recall words', 45, '', '', '[]')`, [lesson]);
      assert.equal((await db.query("select jsonb_array_length(vocabulary_sources) as count from class_lessons where id=$1", [lesson])).rows[0].count, 1);
    });
    await suite.test("another teacher cannot edit or generate for this lesson", async () => {
      await db.query("select set_config('test.user_id', $1, false)", [otherTeacher]);
      await assert.rejects(save(lesson, null), /lesson not found/);
      await assert.rejects(generate(lesson, "2000-01-01T00:00:00Z", generatedStep(), "2000-01-01T00:00:00Z"), /lesson not found/);
    });
    await suite.test("student callers cannot create lesson materials", async () => {
      await db.query("select set_config('test.role', 'student', false)");
      await assert.rejects(createLesson(), /teacher authentication required/);
    });
  });
} finally { await db.close(); }
