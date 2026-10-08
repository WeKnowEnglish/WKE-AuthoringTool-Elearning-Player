// Executes the real migration and planner RPCs in ephemeral PostgreSQL only.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
const uuid = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const teacher = uuid(1),
  other = uuid(2),
  classId = uuid(3),
  foreignClass = uuid(4),
  listId = uuid(5),
  mapId = uuid(6),
  plannedId = uuid(7),
  objectiveId = uuid(8),
  operationId = uuid(9);
await db.exec(`
  create role authenticated; create role anon; create schema auth;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user_id',true),'')::uuid $$;
  create function public.is_teacher() returns boolean language sql stable as $$ select current_setting('test.role',true) = 'teacher' $$;
  create function public.is_student() returns boolean language sql stable as $$ select current_setting('test.role',true) = 'student' $$;
  create table teacher_classes(id uuid primary key, teacher_id uuid, archived_at timestamptz);
  create table class_enrollments(class_id uuid, student_id uuid);
  create table class_lessons(id uuid primary key default gen_random_uuid(), class_id uuid references teacher_classes(id), teacher_id uuid, title text not null, status text not null, notes text not null, created_at timestamptz default now(), updated_at timestamptz default now());
  create table class_lesson_steps(id uuid primary key default gen_random_uuid(),lesson_id uuid references class_lessons(id),position int,kind text,title text,config jsonb,unique(lesson_id,position));
  create table studio_activities(id uuid primary key default gen_random_uuid(),teacher_id uuid,format text,title text,pack jsonb,authoring jsonb,source jsonb,created_at timestamptz default now(),updated_at timestamptz default now());
  create table media_assets(id uuid primary key,original_filename text,public_url text,created_at timestamptz default now());
  grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
  grant select,insert,update,delete on all tables in schema public to authenticated;
`);
for (const name of [
  "109_lightweight_lesson_planner.sql",
  "157_lesson_vocabulary_generation.sql",
  "20261008181637_libraries_course_maps.sql",
])
  await db.exec(readFileSync(resolve("supabase/migrations", name), "utf8"));
await db.query("insert into auth.users values($1),($2)", [teacher, other]);
await db.query(
  "insert into teacher_classes(id,teacher_id) values($1,$2),($3,$4)",
  [classId, teacher, foreignClass, other],
);
const authoring = {
  version: 1,
  kind: "vocabulary-list",
  id: listId,
  name: "Classroom",
  entries: [
    { id: "w1", word: "pencil", definitionEn: "A writing tool" },
    { id: "w2", word: "book", definitionEn: "Pages to read" },
  ],
};
await db.query(
  "insert into studio_activities(id,teacher_id,format,title,authoring,pack,source) values($1,$2,'vocabulary_list','Classroom',$3::jsonb,'{}','{}')",
  [listId, teacher, JSON.stringify(authoring)],
);
await db.exec(
  `set role authenticated; set test.role='teacher'; set test.user_id='${teacher}';`,
);
const document = {
  version: 1,
  title: "Primary English",
  audience: "Primary",
  gradeRange: "2–3",
  cefr: "Pre-A1",
  outcomes: "Ask about classroom objects",
  entryExpectations: "",
  objectives: [
    {
      id: objectiveId,
      statement: "Ask and answer about classroom objects",
      learnerStatement: "I can ask about an object",
      successCriteria: "Ask and answer independently",
      evidenceMode: "production",
    },
  ],
  targets: [],
  units: [
    {
      id: uuid(10),
      title: "Classroom",
      outcome: "Communicate about objects",
      archived: false,
      lessons: [
        {
          id: plannedId,
          title: "What's this?",
          archived: false,
          durationMinutes: 45,
          objectiveIds: [objectiveId],
          targetLanguage: "What's this? It's a pencil.",
          skills: ["speaking"],
          prerequisites: [],
          support: "Model an exchange",
          extension: "Use an unfamiliar object",
          targets: [],
          resources: [
            {
              id: uuid(11),
              kind: "vocabulary_list",
              sourceId: listId,
              title: "Classroom",
              purpose: "Recall object words",
              selectedEntryIds: ["w1"],
            },
          ],
        },
      ],
    },
  ],
};
const save = (revision, doc = document, archived = false, id = mapId) =>
  db.query("select save_curriculum_map($1,$2,$3::jsonb,$4) revision", [
    id,
    revision,
    JSON.stringify(doc),
    archived,
  ]);
const importLesson = (
  operation = operationId,
  revision = 1,
  cls = classId,
  existing = null,
) =>
  db.query("select import_curriculum_lesson($1,$2,$3,$4,$5,$6) id", [
    operation,
    mapId,
    revision,
    plannedId,
    cls,
    existing,
  ]);
let imported;
try {
  await test("course map transactions and access", async (suite) => {
    await suite.test(
      "save and reopen persist the complete map and frozen source",
      async () => {
        assert.equal((await save(0)).rows[0].revision, 1);
        assert.deepEqual(
          (
            await db.query("select document from curriculum_maps where id=$1", [
              mapId,
            ])
          ).rows[0].document,
          document,
        );
        const snapshot = (
          await db.query(
            "select source_snapshots from curriculum_map_revisions where map_id=$1",
            [mapId],
          )
        ).rows[0].source_snapshots;
        assert.equal(
          snapshot[`vocabulary_list:${listId}`].authoring.entries[0].word,
          "pencil",
        );
      },
    );
    await suite.test(
      "creation retries recover the same map; stale edits cannot overwrite it",
      async () => {
        assert.equal((await save(0)).rows[0].revision, 1);
        await assert.rejects(
          save(0, { ...document, title: "Stale edit" }),
          /changed in another session/,
        );
        assert.equal(
          (
            await db.query("select revision from curriculum_maps where id=$1", [
              mapId,
            ])
          ).rows[0].revision,
          1,
        );
      },
    );
    await suite.test(
      "direct writes cannot mutate revision history",
      async () => {
        await assert.rejects(
          db.query(
            "update curriculum_map_revisions set document='{}' where map_id=$1",
            [mapId],
          ),
          /permission denied/,
        );
      },
    );
    await suite.test(
      "other teachers cannot read, overwrite, or import private maps",
      async () => {
        await db.exec(`set test.user_id='${other}'`);
        assert.equal(
          (await db.query("select * from curriculum_maps")).rows.length,
          0,
        );
        await assert.rejects(save(1), /not found/);
        await assert.rejects(importLesson(), /Active class not found/);
        await db.exec(`set test.user_id='${teacher}'`);
      },
    );
    await suite.test("student or suspended roles cannot write", async () => {
      await db.exec("set test.role='student'");
      await assert.rejects(save(1), /authentication required/);
      await db.exec("set test.role='teacher'");
    });
    await suite.test(
      "import uses the frozen vocabulary subset and learning brief",
      async () => {
        await db.query(
          "update studio_activities set authoring=jsonb_set(authoring,'{entries,0,word}','\"changed live source\"') where id=$1",
          [listId],
        );
        imported = (await importLesson()).rows[0].id;
        const lesson = (
          await db.query("select * from class_lessons where id=$1", [imported])
        ).rows[0];
        assert.equal(lesson.objective, document.objectives[0].statement);
        assert.equal(
          lesson.success_check,
          document.objectives[0].successCriteria,
        );
        assert.equal(
          lesson.target_language,
          document.units[0].lessons[0].targetLanguage,
        );
        assert.equal(lesson.status, "draft");
        const copied = (
          await db.query(
            "select authoring from studio_activities where id=$1",
            [lesson.vocabulary_sources[0].vocabListId],
          )
        ).rows[0].authoring;
        assert.equal(copied.entries.length, 1);
        assert.equal(copied.entries[0].word, "pencil");
        assert.notEqual(copied.id, listId);
        assert.match(lesson.notes, /Model an exchange/);
      },
    );
    await suite.test(
      "uncertain retries return the original lesson without duplicate lists",
      async () => {
        assert.equal((await importLesson()).rows[0].id, imported);
        assert.equal(
          (await db.query("select count(*)::int count from class_lessons"))
            .rows[0].count,
          1,
        );
        assert.equal(
          (await db.query("select count(*)::int count from studio_activities"))
            .rows[0].count,
          2,
        );
        await assert.rejects(
          importLesson(operationId, 1, foreignClass),
          /different inputs/,
        );
      },
    );
    await suite.test("foreign and archived classes are rejected", async () => {
      await assert.rejects(
        importLesson(uuid(12), 1, foreignClass),
        /Active class not found/,
      );
      await db.query(
        "update teacher_classes set archived_at=now() where id=$1",
        [classId],
      );
      await assert.rejects(importLesson(uuid(13)), /Active class not found/);
      await db.query(
        "update teacher_classes set archived_at=null where id=$1",
        [classId],
      );
    });
    await suite.test(
      "new revisions preserve old plans and source history",
      async () => {
        const changed = structuredClone(document);
        changed.objectives[0].statement = "Revised goal";
        changed.units[0].lessons[0].title = "Revised lesson";
        changed.units[0].lessons[0].teacherTask =
          "Ask a partner about classroom objects.";
        assert.equal((await save(1, changed)).rows[0].revision, 2);
        assert.equal(
          (
            await db.query("select objective from class_lessons where id=$1", [
              imported,
            ])
          ).rows[0].objective,
          document.objectives[0].statement,
        );
        assert.equal(
          (
            await db.query(
              "select document from curriculum_map_revisions where map_id=$1 and revision=1",
              [mapId],
            )
          ).rows[0].document.title,
          document.title,
        );
      },
    );
    await suite.test(
      "teacher-led tasks import with instructions and success criteria",
      async () => {
        const draft = (await importLesson(uuid(18), 2)).rows[0].id;
        const step = (
          await db.query(
            "select * from class_lesson_steps where lesson_id=$1",
            [draft],
          )
        ).rows[0];
        assert.equal(step.kind, "custom");
        assert.match(step.student_action, /Ask a partner/);
        assert.equal(
          step.config.planning.successCriteria,
          document.objectives[0].successCriteria,
        );
      },
    );
    await suite.test(
      "linking an existing plan preserves its fields and material sources",
      async () => {
        const before = (
          await db.query("select * from class_lessons where id=$1", [imported])
        ).rows[0];
        assert.equal(
          (await importLesson(uuid(14), 2, classId, imported)).rows[0].id,
          imported,
        );
        assert.deepEqual(
          (
            await db.query("select * from class_lessons where id=$1", [
              imported,
            ])
          ).rows[0],
          before,
        );
      },
    );
    await suite.test(
      "invalid selected entries roll back the entire import",
      async () => {
        const invalid = structuredClone(document);
        invalid.units[0].lessons[0].resources[0].selectedEntryIds = [
          "removed-word",
        ];
        await save(2, invalid);
        const count = (
          await db.query("select count(*)::int count from studio_activities")
        ).rows[0].count;
        await assert.rejects(
          importLesson(uuid(15), 3),
          /selected vocabulary entries/,
        );
        assert.equal(
          (await db.query("select count(*)::int count from studio_activities"))
            .rows[0].count,
          count,
        );
        assert.equal(
          (await db.query("select count(*)::int count from class_lessons"))
            .rows[0].count,
          2,
        );
      },
    );
    await suite.test(
      "unavailable resources cannot be frozen under another teacher",
      async () => {
        await db.exec(`set test.user_id='${other}'`);
        await assert.rejects(
          save(0, document, false, uuid(16)),
          /linked resource is unavailable/,
        );
        await db.exec(`set test.user_id='${teacher}'`);
      },
    );
    await suite.test(
      "archive preserves revisions and blocks new imports",
      async () => {
        await save(3, document, true);
        await assert.rejects(
          importLesson(uuid(17), 4),
          /revision not found or archived/,
        );
        assert.equal(
          (
            await db.query(
              "select count(*)::int count from curriculum_map_revisions where map_id=$1",
              [mapId],
            )
          ).rows[0].count,
          4,
        );
      },
    );
  });
} finally {
  await db.close();
}
