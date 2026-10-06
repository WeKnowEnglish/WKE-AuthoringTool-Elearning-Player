// Runs the actual migration in an isolated Postgres engine; never connects to Supabase.
// Optional: --runtime <directory containing node_modules/@electric-sql/pglite>.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const runtimeIndex = process.argv.indexOf("--runtime");
const runtime = runtimeIndex >= 0 ? process.argv[runtimeIndex + 1] : undefined;
const resolved = require.resolve("@electric-sql/pglite", {
  paths: runtime ? [runtime] : [process.cwd()],
});
const { PGlite } = await import(pathToFileURL(resolved).href);
const db = new PGlite();
const migration = (name) =>
  readFileSync(
    new URL(`../supabase/migrations/${name}`, import.meta.url),
    "utf8",
  );
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key, email text,raw_app_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user_id',true),'')::uuid $$;
    create function public.is_teacher_communication_user() returns boolean language sql stable as $$ select exists(select 1 from auth.users where id=auth.uid() and raw_app_meta_data->>'role'='teacher') $$;`);
  await db.exec(migration("032_teacher_access_requests.sql"));
  await db.exec(migration("066_teacher_access_request_review.sql"));
  await db.exec(migration("067_teacher_access_welcome_email.sql"));
  await db.exec(`alter table public.teacher_access_requests add column landing_path text, add column referrer_host text, add column utm_source text, add column utm_medium text, add column utm_campaign text;
    create table public.parent_notifications(id uuid primary key default gen_random_uuid(),guardian_user_id uuid,email_status text,notification_type text);
    create table public.parent_profiles(user_id uuid primary key,notification_preferences jsonb);`);
  const foundation = migration("153_teacher_communications.sql");
  await db.exec(
    foundation.slice(
      0,
      foundation.indexOf("create table if not exists public.teacher_profiles"),
    ),
  );
  for (const name of [
    "teacher_profiles",
    "teacher_conversations",
    "teacher_conversation_members",
    "teacher_messages",
  ]) {
    const table = foundation.match(
      new RegExp(
        `create table if not exists public.${name} \\([\\s\\S]+?\\n\\);`,
      ),
    );
    assert.ok(table, `Missing table fixture ${name}`);
    await db.exec(table[0]);
  }
  await db.exec(`insert into teacher_access_requests(full_name,email,school,reason) values
    ('First Applicant','duplicate@example.test','Test School','Teaching English classes'),
    ('Repeated Applicant','duplicate@example.test','Test School','Teaching English classes');`);
  await db.exec(migration("156_teacher_access_delivery.sql"));
  const scalar = async (sql, params = []) =>
    Object.values((await db.query(sql, params)).rows[0])[0];
  assert.equal(
    await scalar(
      "select count(*)::int from teacher_access_requests where duplicate_of is not null",
    ),
    1,
  );
  assert.equal(
    await scalar("select count(*)::int from admin_email_sends"),
    1,
    "Only canonical historical admin alerts are queued",
  );
  const submit = () =>
    scalar(
      "select submit_teacher_access_request('New Applicant','NEW@example.test','School','Teaching new English classes','{}')",
    );
  const id = await submit();
  assert.equal(
    await submit(),
    id,
    "Duplicate submission returns original receipt",
  );
  assert.equal(
    await scalar(
      "select count(*)::int from admin_email_sends where access_request_id=$1",
      [id],
    ),
    2,
    "Receipt and alert commit with request",
  );
  await assert.rejects(() =>
    db.exec(
      "select submit_teacher_access_request('Broken Applicant','invalid@example.test','School','short','{}')",
    ),
  );
  assert.equal(
    await scalar(
      "select count(*)::int from teacher_access_requests where email='invalid@example.test'",
    ),
    0,
    "Failed transaction cannot leave an application without jobs",
  );
  const jobId = await scalar(
    "select id from admin_email_sends where access_request_id=$1 and purpose='request_admin'",
    [id],
  );
  const claimed = (
    await db.query("select * from claim_admin_email_send($1)", [jobId])
  ).rows[0];
  assert.ok(claimed.lease_token);
  assert.equal(
    (await db.query("select * from claim_admin_email_send($1)", [jobId])).rows
      .length,
    0,
    "Live lease prevents another worker claiming the job",
  );
  assert.equal(
    await scalar(
      'select finish_admin_email_send($1,gen_random_uuid(),\'{"status":"sent"}\')',
      [jobId],
    ),
    false,
    "Stale worker cannot finalize",
  );
  const providerId = "11111111-1111-4111-8111-111111111111";
  await db.query(
    "select record_email_delivery_event('event-1',$1,'delivered',now())",
    [providerId],
  );
  assert.equal(
    await scalar("select finish_admin_email_send($1,$2,$3)", [
      jobId,
      claimed.lease_token,
      JSON.stringify({ status: "sent", providerMessageId: providerId }),
    ]),
    true,
  );
  assert.equal(
    await scalar("select status from admin_email_sends where id=$1", [jobId]),
    "delivered",
    "Early webhook is reconciled after API response",
  );
  await db.query(
    "select record_email_delivery_event('event-1',$1,'delivered',now())",
    [providerId],
  );
  await db.query(
    "select record_email_delivery_event('event-2',$1,'sent',now())",
    [providerId],
  );
  assert.equal(
    await scalar("select count(*)::int from email_delivery_events"),
    2,
    "Webhook replay is deduplicated",
  );
  assert.equal(
    await scalar("select status from admin_email_sends where id=$1", [jobId]),
    "delivered",
    "Late accepted event cannot downgrade delivery",
  );
  const receiptId = await scalar(
    "select id from admin_email_sends where access_request_id=$1 and purpose='request_receipt'",
    [id],
  );
  await db.query("select * from claim_admin_email_send($1)", [receiptId]);
  await db.query(
    "update admin_email_sends set lease_until=now()-interval '1 minute' where id=$1",
    [receiptId],
  );
  const recovered = (
    await db.query("select * from claim_admin_email_send($1)", [receiptId])
  ).rows[0];
  assert.equal(recovered.attempts, 2, "Interrupted worker lease is recovered");
  await db.query(
    "update admin_email_sends set first_attempt_at=now()-interval '24 hours',lease_until=now()-interval '1 minute' where id=$1",
    [receiptId],
  );
  assert.equal(
    (await db.query("select * from claim_admin_email_send($1)", [receiptId]))
      .rows.length,
    0,
  );
  assert.equal(
    await scalar("select uncertain from admin_email_sends where id=$1", [
      receiptId,
    ]),
    true,
    "Ambiguous outcome stops outside idempotency window",
  );
  assert.equal(
    await scalar(
      "select has_table_privilege('authenticated','admin_email_sends','select')",
    ),
    false,
  );
  assert.equal(
    await scalar(
      "select has_table_privilege('authenticated','email_delivery_events','select')",
    ),
    false,
  );
  assert.equal(
    await scalar(
      "select has_function_privilege('anon','submit_teacher_access_request(text,text,text,text,jsonb)','execute')",
    ),
    false,
  );
  await db.exec(`insert into auth.users values('22222222-2222-4222-8222-222222222222','teacher@example.test','{"role":"teacher"}');
    insert into teacher_profiles(user_id,display_name) values('22222222-2222-4222-8222-222222222222','Teacher');
    insert into teacher_conversations(id,created_by,direct_pair_key) values('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','pair');
    insert into teacher_conversation_members(conversation_id,user_id) values('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222');
    insert into auth.users values('44444444-4444-4444-8444-444444444444','other@example.test','{"role":"teacher"}');
    insert into teacher_messages(conversation_id,sender_id,body) values('33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444','Private message');
    set test.user_id='22222222-2222-4222-8222-222222222222';`);
  assert.equal(
    Number(await scalar("select teacher_unread_conversation_count()")),
    1,
  );
  await db.exec(
    "select queue_unread_teacher_emails(); select queue_unread_teacher_emails();",
  );
  assert.equal(
    await scalar(
      "select count(*)::int from admin_email_sends where purpose='teacher_message'",
    ),
    1,
    "Unread email scanner is throttled and deduplicated",
  );
  await db.exec("update teacher_conversation_members set last_read_at=now();");
  assert.equal(
    Number(await scalar("select teacher_unread_conversation_count()")),
    0,
  );
  await db.exec(
    "insert into parent_notifications(guardian_user_id,email_status,notification_type) values('22222222-2222-4222-8222-222222222222','pending','report_published')",
  );
  assert.equal(
    await scalar(
      "select count(*)::int from admin_email_sends where purpose='parent_notification'",
    ),
    1,
    "Parent notification and job commit together",
  );
  const rejectedId = await scalar(
    "insert into admin_email_sends(recipient_email,subject,body_text,status) values('teacher@example.test','Rejected','Message','failed') returning id",
  );
  const retryId = await scalar(
    "insert into admin_email_sends(recipient_email,subject,body_text,context) values('teacher@example.test','Retry','Message',$1) returning id",
    [JSON.stringify({ retryOf: rejectedId })],
  );
  assert.equal(
    await scalar("select superseded_by from admin_email_sends where id=$1", [
      rejectedId,
    ]),
    retryId,
    "Successful queueing resolves the old failure while preserving history",
  );
  await db.exec("set test.user_id='44444444-4444-4444-8444-444444444444'");
  assert.equal(
    Number(await scalar("select teacher_unread_conversation_count()")),
    0,
    "Other members cannot see another teacher unread summary",
  );
  console.log(
    "PASS: migration, duplicate preservation, atomic receipt, leases, webhook replay/order, retry cutoff, private access, unread throttling, parent queue",
  );
} finally {
  await db.close();
}
