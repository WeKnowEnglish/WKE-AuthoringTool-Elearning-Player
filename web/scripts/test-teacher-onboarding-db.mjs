// Actual policy migrations in isolated Postgres. Never reads .env or contacts Supabase.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
const require = createRequire(import.meta.url);
const index = process.argv.indexOf("--runtime");
const runtime = index >= 0 ? process.argv[index + 1] : process.cwd();
const { PGlite } = await import(pathToFileURL(require.resolve("@electric-sql/pglite", { paths: [runtime] })).href);
const db = new PGlite();
const migration = (name) => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const [admin,a,b,sa,sb,pending] = [1,2,3,4,5,6].map(id);
const [ca,cb,ha,hb] = [11,12,21,22].map(id);
const scalar = async (sql, params = []) => Object.values((await db.query(sql,params)).rows[0])[0];
const asUser = async (user,role="teacher") => {
  await db.exec("reset role");
  await db.query("select set_config('test.uid',$1,false),set_config('test.jwt_role',$2,false)",[user,role]);
  await db.exec("set role authenticated");
};
// Keep legacy/negative fixtures out of the existing history and isolation cases.
const withTemporaryFixtures = async (run) => {
  await db.exec("reset role; begin");
  try { await run(); }
  finally { await db.exec("rollback; reset role"); }
};
const rejectsInTransaction = async (run, expected) => {
  await db.exec("savepoint expected_denial");
  try { await assert.rejects(run, expected); }
  finally { await db.exec("rollback to savepoint expected_denial; release savepoint expected_denial"); }
};
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; grant usage on schema auth to anon,authenticated,service_role;
    create publication supabase_realtime;
    create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('app_metadata',jsonb_build_object('role',current_setting('test.jwt_role',true))) $$;
    create function public.is_teacher() returns boolean language sql stable as $$ select auth.jwt()->'app_metadata'->>'role'='teacher' $$;
    create table public.courses(id uuid primary key);
    create table public.student_profiles(user_id uuid primary key references auth.users(id),display_name text);
    alter table public.student_profiles enable row level security;
    create policy student_profiles_own on student_profiles for select to authenticated using(user_id=auth.uid());
    grant select on student_profiles to authenticated;
    create table public.student_mastery_records(id uuid primary key default gen_random_uuid(),student_id uuid references auth.users(id),score integer);
    alter table public.student_mastery_records enable row level security;
    create policy mastery_own on student_mastery_records for select to authenticated using(student_id=auth.uid());
    grant select on student_mastery_records to authenticated;`);
  for (const [user,email,metadata] of [
    [admin,"admin@example.test",{role:"teacher",admin:true}],
    [a,"teacher-a@example.test",{role:"teacher",teacher_tier:"light"}],
    [b,"teacher-b@example.test",{role:"teacher"}],
    [sa,"student-a@example.test",{role:"student"}],
    [sb,"student-b@example.test",{role:"student"}],
    [pending,"pending@example.test",{role:"teacher",teacher_access_status:"pending"}],
  ]) await db.query("insert into auth.users(id,email,raw_app_meta_data) values($1,$2,$3)",[user,email,JSON.stringify(metadata)]);
  for (const name of ["026_teacher_classes.sql","027_teacher_mastery_read.sql","047_whiteboard_p1.sql","048_whiteboard_p2.sql","049_whiteboard_p3.sql","064_class_homework.sql","065_class_homework_completions.sql","103_homework_student_targeting.sql","153_teacher_communications.sql","154_admin_audit_log.sql"])
    await db.exec(migration(name));
  await db.query("insert into teacher_classes(id,teacher_id,title,join_code) values($1,$2,'Class A','ABC234'),($3,$4,'Class B','BCD345')",[ca,a,cb,b]);
  await db.query("insert into class_enrollments(class_id,student_id) values($1,$2),($3,$4)",[ca,sa,cb,sb]);
  await db.query("insert into student_profiles values($1,'Student A'),($2,'Student B')",[sa,sb]);
  await db.query("insert into student_mastery_records(student_id,score) values($1,80),($2,90)",[sa,sb]);
  await db.query("insert into class_homework(id,class_id,teacher_id,title,status) values($1,$2,$3,'Homework A','assigned'),($4,$5,$6,'Homework B','assigned')",[ha,ca,a,hb,cb,b]);
  await db.query("insert into class_homework_completions(homework_id,student_id,correct_count) values($1,$2,8),($3,$4,9)",[ha,sa,hb,sb]);
  await db.query("insert into whiteboard_rounds(id,liveblocks_room_id,join_code,host_user_id,class_id,phase) values('round-a','wke-whiteboard-ABC234','ABC234',$1,$2,'OPEN'),('round-b','wke-whiteboard-BCD345','BCD345',$3,$4,'OPEN')",[a,ca,b,cb]);
  await db.query("insert into whiteboard_submissions(id,round_id,liveblocks_room_id,board_id,owner_type,owner_id,contributor_ids,revision,submission_type,document_json,preview_path) values('submission-a','round-a','wke-whiteboard-ABC234','board-a','student',$1,array[$1],1,'manual','{}','round-a/board-a/r1.png'),('submission-b','round-b','wke-whiteboard-BCD345','board-b','student',$2,array[$2],1,'manual','{}','round-b/board-b/r1.png')",[sa,sb]);
  // Model old owner/JWT policies and upload/realtime surfaces to prove intersection.
  await db.exec(`create schema storage; create table storage.objects(id uuid primary key,owner uuid);
    create schema realtime; create table realtime.messages(id uuid primary key);
    alter table storage.objects enable row level security; alter table realtime.messages enable row level security;
    grant usage on schema storage,realtime to authenticated;
    grant select,insert on storage.objects,realtime.messages to authenticated;
    create policy legacy_upload_owner on storage.objects to authenticated using(owner=auth.uid()) with check(owner=auth.uid());
    create policy legacy_jwt_realtime on realtime.messages to authenticated using(auth.jwt()->'app_metadata'->>'role'='teacher');
    insert into storage.objects values('${id(30)}','${a}'); insert into realtime.messages values('${id(31)}');`);
  await db.exec(migration("159_teacher_account_lifecycle.sql"));
  await db.exec(migration("160_whiteboard_submission_provenance.sql"));
  await db.exec(migration("161_teacher_class_approval_boundary.sql"));
  await test("teacher onboarding access and isolation",async (suite) => {
    await suite.test("an approved teacher can create, read, edit and archive their own class", () => withTemporaryFixtures(async () => {
      await asUser(a);
      const created = await scalar("insert into teacher_classes(teacher_id,title,join_code) values($1,'New class','CDE456') returning id",[a]);
      assert.equal(await scalar("select title from teacher_classes where id=$1",[created]),"New class");
      assert.equal((await db.query("update teacher_classes set title='Updated',archived_at=now() where id=$1 returning id",[created])).rows.length,1);
      assert.equal(await scalar("select title from teacher_classes where id=$1",[created]),"Updated");
      await rejectsInTransaction(() => db.query("insert into teacher_classes(teacher_id,title,join_code) values($1,'Wrong owner','DEF567')",[b]),/row-level security/);
    }));
    const deniedOwners = [
      ["student", sa, {role:"student"}, "student"],
      ["parent", id(80), {role:"parent"}, "parent"],
      ["account without a role", id(81), {}, ""],
      ["pending teacher", pending, {role:"teacher",teacher_access_status:"pending"}, "teacher"],
      ["suspended teacher", id(82), {role:"teacher",teacher_access_status:"suspended"}, "teacher"],
      ["teacher with an unknown approval state", id(83), {role:"teacher",teacher_access_status:"unexpected"}, "teacher"],
      ["demoted teacher with a stale teacher JWT", id(84), {role:"parent"}, "teacher"],
    ];
    for (const [offset,[label,user,metadata,jwtRole]] of deniedOwners.entries()) {
      await suite.test(`${label} cannot create or manage a teacher class or another student's roster`, () => withTemporaryFixtures(async () => {
        await db.query("insert into auth.users(id,email,raw_app_meta_data) values($1,$2,$3) on conflict(id) do nothing",[user,`fixture-${offset}@example.test`,JSON.stringify(metadata)]);
        const legacyClass = id(90+offset);
        await db.query("insert into teacher_classes(id,teacher_id,title,join_code) values($1,$2,'Legacy class',$3)",[legacyClass,user,`N${String(offset).padStart(5,"0")}`]);
        await db.query("insert into class_enrollments(class_id,student_id) values($1,$2)",[legacyClass,sb]);
        await asUser(user,jwtRole);
        assert.equal(await scalar("select count(*)::int from teacher_classes where id=$1",[legacyClass]),0);
        assert.equal(await scalar("select count(*)::int from class_enrollments where class_id=$1",[legacyClass]),0);
        await rejectsInTransaction(() => db.query("insert into teacher_classes(teacher_id,title,join_code) values($1,'Forbidden','CDE456')",[user]),/row-level security/);
        assert.equal((await db.query("update teacher_classes set title='Tampered' where id=$1 returning id",[legacyClass])).rows.length,0);
        assert.equal((await db.query("delete from class_enrollments where class_id=$1 returning student_id",[legacyClass])).rows.length,0);
        await db.exec("reset role");
        assert.equal(await scalar("select title from teacher_classes where id=$1",[legacyClass]),"Legacy class");
        assert.equal(await scalar("select count(*)::int from class_enrollments where class_id=$1",[legacyClass]),1);
      }));
    }
    await suite.test("restrictive class write guards still deny students under an additional permissive policy", () => withTemporaryFixtures(async () => {
      await db.exec("create policy temporary_owner_policy on teacher_classes for all to authenticated using(teacher_id=auth.uid()) with check(teacher_id=auth.uid())");
      const legacyClass = id(90);
      await db.query("insert into teacher_classes(id,teacher_id,title,join_code) values($1,$2,'Legacy class','CDE456')",[legacyClass,sa]);
      await asUser(sa,"student");
      await rejectsInTransaction(() => db.query("insert into teacher_classes(teacher_id,title,join_code) values($1,'Forbidden','DEF567')",[sa]),/row-level security/);
      assert.equal((await db.query("update teacher_classes set title='Tampered' where id=$1 returning id",[legacyClass])).rows.length,0);
      await db.exec("reset role");
      assert.equal(await scalar("select title from teacher_classes where id=$1",[legacyClass]),"Legacy class");
    }));
    await suite.test("student join normalizes the code and repeated joining creates one membership", () => withTemporaryFixtures(async () => {
      await db.query("delete from class_enrollments where class_id=$1 and student_id=$2",[ca,sa]);
      await asUser(sa,"student");
      assert.deepEqual(await scalar("select join_class_by_code($1)",["  abc234  "]),{ok:true,classId:ca,title:"Class A"});
      assert.equal((await scalar("select join_class_by_code('ABC234')")).ok,true);
      assert.equal(await scalar("select count(*)::int from class_enrollments where class_id=$1",[ca]),1);
      for (const code of [null,"","ABC23","ZZZZZZ"]) {
        assert.deepEqual(await scalar("select join_class_by_code($1)",[code]),{ok:false,error:"invalid_code"});
      }
    }));
    await suite.test("joining checks the current student account rather than a stale or missing role", () => withTemporaryFixtures(async () => {
      await db.query("insert into auth.users(id,email,raw_app_meta_data) values($1,'parent@example.test','{\"role\":\"parent\"}')",[id(80)]);
      for (const user of [a,pending,id(80),id(81)]) {
        await asUser(user,"student");
        assert.deepEqual(await scalar("select join_class_by_code('ABC234')"),{ok:false,error:"students_only"});
      }
      await db.exec("reset role");
      await db.query("update auth.users set raw_app_meta_data='{\"role\":\"parent\"}' where id=$1",[sa]);
      await asUser(sa,"student");
      assert.deepEqual(await scalar("select join_class_by_code('ABC234')"),{ok:false,error:"students_only"});
      await db.exec("reset role");
      await db.query("select set_config('test.uid','',false)");
      await db.exec("set role authenticated");
      assert.deepEqual(await scalar("select join_class_by_code('ABC234')"),{ok:false,error:"not_authenticated"});
      await db.exec("reset role; set role anon");
      await rejectsInTransaction(() => db.query("select join_class_by_code('ABC234')"),/permission denied/);
    }));
    await suite.test("join codes cannot enroll students into a nonteacher or unapproved owner's class", () => withTemporaryFixtures(async () => {
      for (const [offset,[,user,metadata]] of deniedOwners.entries()) {
        await db.query("insert into auth.users(id,email,raw_app_meta_data) values($1,$2,$3) on conflict(id) do nothing",[user,`fixture-${offset}@example.test`,JSON.stringify(metadata)]);
        await db.query("insert into teacher_classes(id,teacher_id,title,join_code) values($1,$2,'Unavailable class',$3)",[id(90+offset),user,`N${String(offset).padStart(5,"0")}`]);
      }
      await asUser(sb,"student");
      for (const offset of deniedOwners.keys()) {
        assert.deepEqual(await scalar("select join_class_by_code($1)",[`N${String(offset).padStart(5,"0")}`]),{ok:false,error:"invalid_code"});
      }
      await db.exec("reset role");
      assert.equal(await scalar("select count(*)::int from class_enrollments where class_id=any($1::uuid[])",[deniedOwners.map((_,offset)=>id(90+offset))]),0);
    }));
    await suite.test("suspension stops new enrollment, preserves history and restoration reopens joining", () => withTemporaryFixtures(async () => {
      await db.query("select set_teacher_account_access($1,$2,'suspended')",[admin,a]);
      await asUser(sb,"student");
      assert.deepEqual(await scalar("select join_class_by_code('ABC234')"),{ok:false,error:"invalid_code"});
      await asUser(sa,"student");
      assert.equal(await scalar("select count(*)::int from class_enrollments where class_id=$1",[ca]),1);
      assert.equal(await scalar("select count(*)::int from class_homework_completions where homework_id=$1",[ha]),1);
      await db.exec("reset role");
      assert.equal(await scalar("select count(*)::int from class_enrollments where class_id=$1",[ca]),1);
      await db.query("select set_teacher_account_access($1,$2,'approved')",[admin,a]);
      await asUser(sb,"student");
      assert.equal((await scalar("select join_class_by_code('ABC234')")).ok,true);
    }));
    await suite.test("archiving a class prevents new joins without deleting existing enrollment", () => withTemporaryFixtures(async () => {
      await asUser(a);
      await db.query("update teacher_classes set archived_at=now() where id=$1",[ca]);
      await asUser(sb,"student");
      assert.deepEqual(await scalar("select join_class_by_code('ABC234')"),{ok:false,error:"invalid_code"});
      await asUser(sa,"student");
      assert.equal(await scalar("select count(*)::int from class_enrollments where class_id=$1",[ca]),1);
    }));
    await suite.test("migration preserves explicit Light and legacy Plus without granting pending access",async () => {
      assert.equal(await scalar("select raw_app_meta_data->>'teacher_tier' from auth.users where id=$1",[a]),"light");
      assert.equal(await scalar("select raw_app_meta_data->>'teacher_tier' from auth.users where id=$1",[b]),"plus");
      await asUser(pending); assert.equal(await scalar("select is_teacher()"),false);
      assert.equal(await scalar("select count(*)::int from teacher_profiles"),0);
    });
    await suite.test("each teacher sees only their classes, roster, assignments, results and mastery",async () => {
      for (const [user,student,homework] of [[a,sa,ha],[b,sb,hb]]) {
        await asUser(user);
        assert.deepEqual((await db.query("select teacher_id from teacher_classes")).rows,[{teacher_id:user}]);
        assert.deepEqual((await db.query("select student_id from class_enrollments")).rows,[{student_id:student}]);
        assert.deepEqual((await db.query("select user_id from student_profiles")).rows,[{user_id:student}]);
        assert.deepEqual((await db.query("select id from class_homework")).rows,[{id:homework}]);
        assert.deepEqual((await db.query("select student_id from class_homework_completions")).rows,[{student_id:student}]);
        assert.deepEqual((await db.query("select student_id from student_mastery_records")).rows,[{student_id:student}]);
        assert.deepEqual((await db.query("select host_user_id from whiteboard_rounds")).rows,[{host_user_id:user}]);
        assert.deepEqual((await db.query("select owner_id from whiteboard_submissions")).rows,[{owner_id:student}]);
      }
    });
    await suite.test("changed IDs cannot mutate another class, remove its student or target its homework",async () => {
      await asUser(a);
      assert.equal((await db.query("update teacher_classes set title='Tampered' where id=$1 returning id",[cb])).rows.length,0);
      assert.equal((await db.query("delete from class_enrollments where student_id=$1 returning student_id",[sb])).rows.length,0);
      await assert.rejects(db.query("insert into class_homework(class_id,teacher_id,title) values($1,$2,'Tampered')",[cb,a]),/row-level security/);
      await assert.rejects(db.query("update class_homework set class_id=$1 where id=$2",[cb,ha]),/row-level security/);
      assert.equal(await scalar("select count(*)::int from class_homework where id=$1",[hb]),0);
    });
    await suite.test("students see their own assigned work and results",async () => {
      await asUser(sa,"student");
      assert.deepEqual((await db.query("select id from class_homework")).rows,[{id:ha}]);
      assert.equal(await scalar("select count(*)::int from class_homework_completions where student_id=$1",[sb]),0);
    });
    await suite.test("whiteboard previews require own/contributed work or an archived same-class gallery",async () => {
      await db.exec("reset role");
      const peer = id(7);
      await db.query("insert into auth.users(id,email,raw_app_meta_data) values($1,'peer@example.test','{\"role\":\"student\"}')",[peer]);
      await db.query("insert into class_enrollments(class_id,student_id) values($1,$2)",[ca,peer]);
      await db.query("insert into whiteboard_submissions(id,round_id,liveblocks_room_id,board_id,owner_type,owner_id,contributor_ids,revision,submission_type,document_json,preview_path) values('submission-peer','round-a','wke-whiteboard-ABC234','board-peer','student',$1,array[$1],1,'manual','{}','round-a/board-peer/r1.png'),('submission-group','round-a','wke-whiteboard-ABC234','board-group','group','group-a',array[$1,$2],1,'manual','{}','round-a/board-group/r1.png')",[peer,sa]);
      await asUser(sa,"student");
      assert.equal(await scalar("select count(*)::int from whiteboard_submissions where preview_path='round-a/board-peer/r1.png'"),0);
      assert.equal(await scalar("select count(*)::int from whiteboard_submissions where preview_path='round-a/board-group/r1.png'"),1);
      assert.equal(await scalar("select count(*)::int from whiteboard_submissions where preview_path='round-b/board-b/r1.png'"),0);
      await db.exec("reset role");
      await db.exec("update whiteboard_rounds set archived_at=now() where id='round-a'");
      await asUser(sa,"student");
      assert.equal(await scalar("select count(*)::int from whiteboard_submissions where preview_path='round-a/board-peer/r1.png'"),1);
      await asUser(sb,"student");
      assert.equal(await scalar("select count(*)::int from whiteboard_submissions where preview_path like 'round-a/%'"),0);
      await asUser(b);
      assert.equal(await scalar("select count(*)::int from whiteboard_submissions where preview_path like 'round-a/%'"),0);
      await db.exec("reset role");
      await db.exec("update whiteboard_rounds set archived_at=null where id='round-a'");
      await db.query("delete from class_enrollments where class_id=$1 and student_id=$2",[ca,peer]);
    });
    await suite.test("removing a student preserves class-specific results and their own learning history",async () => {
      await asUser(a);
      await db.query("delete from class_enrollments where class_id=$1 and student_id=$2",[ca,sa]);
      assert.equal(await scalar("select count(*)::int from class_homework_completions where student_id=$1",[sa]),1);
      assert.equal(await scalar("select count(*)::int from whiteboard_submissions where owner_id=$1",[sa]),1);
      await asUser(sa,"student");
      assert.equal(await scalar("select count(*)::int from class_homework where id=$1",[ha]),0);
      assert.equal(await scalar("select count(*)::int from class_homework_completions where student_id=$1",[sa]),1);
      assert.equal(await scalar("select count(*)::int from student_mastery_records where student_id=$1",[sa]),1);
      await db.exec("reset role");
      await db.query("insert into class_enrollments(class_id,student_id) values($1,$2)",[ca,sa]);
    });
    await suite.test("archiving a class preserves its roster, assignments and results for its owner",async () => {
      await asUser(a);
      await db.query("update teacher_classes set archived_at=now() where id=$1",[ca]);
      assert.equal(await scalar("select count(*)::int from class_enrollments where class_id=$1",[ca]),1);
      assert.equal(await scalar("select count(*)::int from class_homework where id=$1",[ha]),1);
      assert.equal(await scalar("select count(*)::int from class_homework_completions where homework_id=$1",[ha]),1);
      await asUser(b);
      assert.equal(await scalar("select count(*)::int from class_homework_completions where homework_id=$1",[ha]),0);
      await asUser(a);
      await db.query("update teacher_classes set archived_at=null where id=$1",[ca]);
    });
    await suite.test("browser and ordinary teacher cannot change lifecycle state",async () => {
      await asUser(a);
      await assert.rejects(db.query("select set_teacher_account_access($1,$2,'suspended')",[admin,b]),/permission denied/);
      await db.exec("reset role");
      await assert.rejects(db.query("select set_teacher_account_access($1,$2,'suspended')",[a,b]),/Admin access required/);
      await assert.rejects(db.query("select set_teacher_account_access($1,$2,'suspended')",[admin,admin]),/own access/);
      await assert.rejects(db.query("select set_teacher_account_access($1,$2,'approved')",[admin,pending]),/application queue/);
    });
    await suite.test("suspension blocks stale tokens, owner policies, messaging RPCs, uploads and realtime",async () => {
      await asUser(a);
      const conversation = await scalar("select get_or_create_teacher_direct_conversation($1)",[b]);
      await db.exec("reset role");
      await db.query("select set_teacher_account_access($1,$2,'suspended')",[admin,a]);
      await asUser(a); // JWT still claims teacher: account state wins.
      assert.equal(await scalar("select is_teacher()"),false);
      for (const table of ["teacher_classes","class_enrollments","student_profiles","student_mastery_records","class_homework","class_homework_completions","whiteboard_rounds","whiteboard_submissions","class_sessions","teacher_profiles","teacher_conversations","teacher_conversation_members","storage.objects","realtime.messages"])
        assert.equal(await scalar(`select count(*)::int from ${table}`),0,table);
      await assert.rejects(db.query("insert into teacher_classes(teacher_id,title) values($1,'Forbidden')",[a]),/row-level security/);
      await assert.rejects(db.query("select get_or_create_teacher_direct_conversation($1)",[b]),/authentication required/);
      assert.equal(await scalar("select teacher_is_conversation_member($1)",[conversation]),false);
      await assert.rejects(db.query("insert into storage.objects values($1,$2)",[id(32),a]),/row-level security/);
    });
    await suite.test("concurrent stale metadata cannot undo suspension",async () => {
      await db.exec("reset role");
      await assert.rejects(db.query("update auth.users set raw_app_meta_data=raw_app_meta_data||'{\"teacher_access_status\":\"approved\",\"must_change_password\":false}' where id=$1",[a]),/audited teacher access/);
      assert.equal(await scalar("select raw_app_meta_data->>'teacher_access_status' from auth.users where id=$1",[a]),"suspended");
      assert.equal(await scalar("select count(*)::int from teacher_classes"),2);
      assert.equal(await scalar("select count(*)::int from class_homework_completions"),2);
    });
    await suite.test("restoring access preserves history and audits each actual transition once",async () => {
      await db.query("select set_teacher_account_access($1,$2,'approved')",[admin,a]);
      await db.query("select set_teacher_account_access($1,$2,'approved')",[admin,a]);
      assert.equal(await scalar("select count(*)::int from admin_audit_log where target_id=$1",[a]),2);
      await asUser(a); assert.equal(await scalar("select is_teacher()"),true);
      assert.equal(await scalar("select count(*)::int from class_homework_completions"),1);
      await asUser(sa,"student"); assert.equal(await scalar("select count(*)::int from class_homework"),1);
    });
    await suite.test("an audit failure rolls back the account transition",async () => {
      await db.exec("reset role");
      await db.exec(`create function reject_audit() returns trigger language plpgsql as $$ begin raise exception 'Audit unavailable'; end $$;
        create trigger reject_audit before insert on admin_audit_log for each row execute function reject_audit();`);
      await assert.rejects(db.query("select set_teacher_account_access($1,$2,'suspended')",[admin,a]),/Audit unavailable/);
      assert.equal(await scalar("select raw_app_meta_data->>'teacher_access_status' from auth.users where id=$1",[a]),"approved");
    });
    const ownBoard = 'board:student:' + sa;
    const save = (actor, board, revision=1, document={elements:[],zOrder:[]}, preview=null, type='manual', room='wke-whiteboard-ABC234') =>
      scalar('select persist_whiteboard_submission($1,$2,$3,$4,$5,$6,$7)',[room,actor,board,revision,type,JSON.stringify(document),preview]);
    const group = (members) => JSON.stringify([{id:'group-a',memberIds:members}]);
    await suite.test("only a current Plus host or enrolled student can establish board authorship",async () => {
      await db.exec('reset role');
      await assert.rejects(db.query('select register_whiteboard_participant($1,$2,$3)',['wke-whiteboard-ABC234',a,'host']),/Host access required/);
      await db.query("update auth.users set raw_app_meta_data=raw_app_meta_data||$2::jsonb where id=$1",[a,JSON.stringify({teacher_tier:"plus"})]);
      await db.query('select register_whiteboard_participant($1,$2,$3)',['wke-whiteboard-ABC234',a,'host']);
      await db.query('select register_whiteboard_participant($1,$2,$3)',['wke-whiteboard-ABC234',sa,'player']);
      await assert.rejects(db.query('select register_whiteboard_participant($1,$2,$3)',['wke-whiteboard-ABC234',sb,'player']),/Enrollment required/);
      await assert.rejects(db.query('select register_whiteboard_participant($1,$2,$3)',['wke-whiteboard-ABC234',b,'host']),/Host access required/);
      await asUser(a);
      await assert.rejects(db.query('select register_whiteboard_participant($1,$2,$3)',['wke-whiteboard-ABC234',sa,'player']),/permission denied/);
      await assert.rejects(db.query('select * from whiteboard_board_authority'),/permission denied/);
      await assert.rejects(save(sa,ownBoard),/permission denied/);
    });
    await suite.test("forged room identities cannot transfer a student's saved work or overwrite another teacher's result",async () => {
      await db.exec('reset role');
      const canonical = await save(sa,ownBoard,1,{id:'board-b',ownerType:'group',ownerId:sb,revision:100,elements:[],zOrder:[]});
      assert.deepEqual(canonical.contributorIds,[sa]);
      assert.equal(canonical.roundId,'round-a'); assert.equal(canonical.ownerId,sa);
      const saved = (await db.query('select round_id,owner_type,owner_id,document_json from whiteboard_submissions where board_id=$1',[ownBoard])).rows[0];
      assert.equal(saved.round_id,'round-a'); assert.equal(saved.owner_type,'student'); assert.equal(saved.owner_id,sa);
      assert.equal(saved.document_json.id,ownBoard); assert.equal(saved.document_json.revision,1);
      await assert.rejects(save(sb,ownBoard),/Whiteboard access required/);
      await assert.rejects(save(a,'board-b',1,{},null,'teacher_pull','wke-whiteboard-BCD345'),/Whiteboard access required/);
      assert.equal(await scalar("select owner_id from whiteboard_submissions where id='submission-b'"),sb);
      await assert.rejects(save(sa,ownBoard,1,{elements:[{id:'changed'}],zOrder:[]}),/Cannot rewrite recorded submission/);
      const before = await scalar('select submitted_at::text from whiteboard_submissions where board_id=$1',[ownBoard]);
      await save(sa,ownBoard); assert.equal(await scalar('select submitted_at::text from whiteboard_submissions where board_id=$1',[ownBoard]),before);
      await assert.rejects(save(sa,ownBoard,1,undefined,'round-b/board-b/r1.png'),/Invalid preview path/);
      const preview = 'round-a/'+ownBoard+'/r1.png';
      assert.equal((await save(sa,ownBoard,1,undefined,preview)).previewPath,preview);
      await db.exec('set role service_role');
      assert.equal((await save(sa,ownBoard)).ownerId,sa);
      await db.exec('reset role');
    });
    await suite.test("group authority uses joined current students and waits for a successful room update",async () => {
      await db.exec('reset role'); const peer=id(7);
      await db.query('insert into class_enrollments(class_id,student_id) values($1,$2)',[ca,peer]);
      await db.query('select register_whiteboard_participant($1,$2,$3)',['wke-whiteboard-ABC234',peer,'player']);
      await assert.rejects(db.query('select register_whiteboard_groups($1,$2,$3)',['wke-whiteboard-ABC234',a,group([sa,sb])]),/distinct joined participants/);
      assert.equal(await scalar("select authority_pending from whiteboard_rounds where id='round-a'"),false);
      await db.query('select register_whiteboard_groups($1,$2,$3)',['wke-whiteboard-ABC234',a,group([peer,sa])]);
      await assert.rejects(save(sa,'board:group:group-a'),/Retry group assignment/);
      await assert.rejects(db.query('select confirm_whiteboard_groups($1,$2)',['wke-whiteboard-ABC234',b]),/Host access required/);
      await db.query('select confirm_whiteboard_groups($1,$2)',['wke-whiteboard-ABC234',a]);
      assert.deepEqual((await save(sa,'board:group:group-a')).contributorIds,[sa,peer].sort());
    });
    await suite.test("group changes preserve the original contributors and prior work",async () => {
      await db.exec('reset role'); const peer=id(7);
      await db.query('select register_whiteboard_groups($1,$2,$3)',['wke-whiteboard-ABC234',a,group([sa])]);
      await db.query('select confirm_whiteboard_groups($1,$2)',['wke-whiteboard-ABC234',a]);
      assert.deepEqual((await save(a,'board:group:group-a',1,undefined,null,'teacher_pull')).contributorIds,[sa,peer].sort());
      assert.deepEqual((await save(sa,'board:group:group-a',2)).contributorIds,[sa]);
      await db.query('delete from class_enrollments where class_id=$1 and student_id=$2',[ca,peer]);
      await assert.rejects(save(peer,'board:group:group-a'),/Whiteboard access required/);
      await asUser(peer,'student');
      assert.equal(await scalar("select count(*)::int from whiteboard_submissions where board_id='board:group:group-a' and revision=1"),1);
      assert.equal(await scalar("select count(*)::int from whiteboard_submissions where board_id='board:group:group-a' and revision=2"),0);
    });
    await suite.test("suspension and removal block new saves without deleting learning evidence",async () => {
      await db.exec('reset role');
      await db.exec('drop trigger reject_audit on admin_audit_log');
      await db.query("select set_teacher_account_access($1,$2,'suspended')",[admin,a]);
      await assert.rejects(save(a,ownBoard),/Whiteboard access required/);
      await db.query("select set_teacher_account_access($1,$2,'approved')",[admin,a]);
      await db.query('delete from class_enrollments where class_id=$1 and student_id=$2',[ca,sa]);
      await assert.rejects(save(sa,ownBoard),/Whiteboard access required/);
      assert.equal(await scalar('select count(*)::int from whiteboard_submissions where board_id=$1',[ownBoard]),1);
      await db.query('insert into class_enrollments(class_id,student_id) values($1,$2)',[ca,sa]);
    });
    await suite.test("one-off guests use server identities and cannot join a classroom or claim an invented board",async () => {
      await db.exec('reset role');
      await db.query("insert into whiteboard_rounds(id,liveblocks_room_id,join_code,host_user_id,phase) values('guest-round','wke-whiteboard-CDE456','CDE456',$1,'OPEN')",[b]);
      const guest='whiteboard_guest_'+id(90);
      await assert.rejects(db.query('select register_whiteboard_participant($1,$2,$3)',['wke-whiteboard-ABC234',guest,'player']),/Invalid participant/);
      await assert.rejects(db.query('select register_whiteboard_participant($1,$2,$3)',['wke-whiteboard-CDE456','browser-user-id','player']),/Invalid participant/);
      await db.query('select register_whiteboard_participant($1,$2,$3)',['wke-whiteboard-CDE456',guest,'player']);
      assert.equal((await save(guest,'board:student:'+guest,1,undefined,null,'manual','wke-whiteboard-CDE456')).ownerId,guest);
      await assert.rejects(save(guest,'board:student:invented',1,undefined,null,'manual','wke-whiteboard-CDE456'),/authority required/);
      await assert.rejects(db.query('select register_whiteboard_participant($1,$2,$3)',['wke-whiteboard-CDE456',pending,'player']),/Account access required/);
    });
  });
} catch (error) {
  console.error(`Teacher onboarding database setup failed: ${error.message}`);
  process.exitCode = 1;
} finally { await db.close(); }
