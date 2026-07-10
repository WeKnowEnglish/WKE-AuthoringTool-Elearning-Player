# Proposal: P1a — Supabase mastery schema + RLS

**Status:** Implemented (2026-07-09)  
**Runtime spec:** [MASTERY_SUPABASE_SYNC.md](./MASTERY_SUPABASE_SYNC.md)  
**Prepared:** 2026-07-09  
**Track:** P1 Supabase mastery sync — Phase 1 of 5  
**Depends on:** P0 ✅ · M0–M6 ✅ · S1 ✅ · G1 ✅  
**Parent:** [PROPOSAL_NEXT_STEP_POST_S1.md](./PROPOSAL_NEXT_STEP_POST_S1.md) §5.3  
**Blocks:** P1b pull · P1c write-through · P1d bootstrap wire · T1 teacher views

---

## 1. Executive summary

**P1a** adds two Supabase tables that mirror the shapes already used in `lib/mastery/types.ts`, with student-only Row Level Security. **No runtime wire** in this slice — students continue to use localStorage only; the app behavior does not change until P1b–P1d.

| Deliverable | Student-visible? |
| --- | --- |
| Migration `024_student_mastery.sql` | No |
| RLS policies (authenticated student owns rows) | No (until P1b+) |
| Slim TypeScript row types + mappers | No |
| RLS verification checklist | No |
| Doc index updates | No |

**Effort:** ~1 focused session (2–3 hours)  
**Risk:** Low — schema-only; no production behavior change until later P1 phases.

---

## 2. Goals and non-goals

### 2.1 In scope (P1a)

1. Create `student_mastery_records` and `student_learning_evidence` tables.
2. Enable RLS; policies allow **only** `auth.uid() = student_id` for `SELECT` / `INSERT` / `UPDATE`.
3. Add indexes for pull queries (P1b): per-student, ordered by recency.
4. Add `authenticated` role grants (no `anon` access).
5. Add TypeScript row types and pure mapper helpers (no Supabase client calls).
6. Add RLS verification checklist; run against dev Supabase project.
7. Update roadmap / README pointers.

### 2.2 Out of scope (defer to P1b–P1e)

| Item | Phase |
| --- | --- |
| Pull on login | P1b |
| Write-through after `recordLearningEvidenceEvent` | P1c |
| `StudentStorageBootstrap` wire + merge tests | P1d |
| Teacher SELECT / class views | T1 |
| Server-side mastery recompute | Never in P1 |
| Realtime subscriptions | Post-P1 |
| Evidence summarization / archival job | Post-P1 |
| `supabase gen types` codegen pipeline | Optional later |
| Garden / pet / progress Supabase tables | P0b / separate tracks |

### 2.3 Principles (carried from parent P1 plan)

1. **JSONB blobs match client types** — `record` holds full `StudentMasteryRecord`; `event` holds full `LearningEvidenceEvent`. Engine math stays client-side.
2. **Denormalized columns for query** — `target_key`, `target_type`, `updated_at`, `occurred_at` extracted as columns for indexes and upsert keys; blobs remain SoT for field-level detail.
3. **Auth-only** — Guests have no Supabase rows; P0 local-only path unchanged.
4. **Idempotent evidence** — `(student_id, id)` unique; client-generated event UUIDs.
5. **No second engine** — Server stores what the client already produces.

---

## 3. Schema design

**Migration file:** `web/supabase/migrations/024_student_mastery.sql`  
**Prerequisite migrations:** `001_initial.sql`, `002_grants_anon_authenticated.sql`, `022_student_profiles.sql`

### 3.1 Table: `student_mastery_records`

One row per `(student, target_key)` — mirrors `MasterySnapshot.records[targetKey]`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | `gen_random_uuid()` — server row id (not used for merge) |
| `student_id` | `uuid` NOT NULL | FK → `auth.users(id)` ON DELETE CASCADE |
| `target_key` | `text` NOT NULL | e.g. `word:g7-a2-apple`, `grammar:short-answers-there-is-a1` |
| `target_type` | `text` NOT NULL | CHECK against `LearningTargetType` enum values |
| `record` | `jsonb` NOT NULL | Full `StudentMasteryRecord` blob |
| `updated_at` | `timestamptz` NOT NULL | Denormalized from `record.updatedAt` (merge key) |
| `created_at` | `timestamptz` NOT NULL | `default now()` — first server insert |
| **Unique** | `(student_id, target_key)` | Upsert target for P1c |

**Indexes:**

- `(student_id, updated_at DESC)` — P1b full pull / incremental fetch

**Constraints:**

```sql
check (target_type in (
  'word', 'phrase', 'grammar', 'strand', 'skill', 'standard', 'learning_goal'
))
check (char_length(target_key) between 1 and 256)
```

**Why `student_id` not `user_id`:** Matches mastery domain language (`LearningEvidenceEvent.studentId`) and parent P1 proposal. Existing `student_lesson_progress.user_id` stays as-is; new mastery tables use `student_id` consistently with event payloads.

### 3.2 Table: `student_learning_evidence`

Append-only evidence log — mirrors capped local `wke-learning-evidence-v1` array.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | **Client-generated** — equals `LearningEvidenceEvent.id` |
| `student_id` | `uuid` NOT NULL | FK → `auth.users(id)` ON DELETE CASCADE |
| `occurred_at` | `timestamptz` NOT NULL | Denormalized from `event.occurredAt` |
| `event` | `jsonb` NOT NULL | Full `LearningEvidenceEvent` blob |
| `created_at` | `timestamptz` NOT NULL | `default now()` — server insert time |
| **Unique** | `(student_id, id)` | Idempotent insert on retry |

**Indexes:**

- `(student_id, occurred_at DESC)` — recent evidence fetch (debug / future T1)

**No UPDATE policy** — evidence is append-only; corrections happen via new events + mastery recompute (client-side).

### 3.3 Relationship diagram

```
auth.users (student account)
    │
    ├── student_mastery_records (1:N)
    │       unique (student_id, target_key)
    │       record jsonb → StudentMasteryRecord
    │
    └── student_learning_evidence (1:N)
            unique (student_id, id)
            event jsonb → LearningEvidenceEvent
```

### 3.4 Draft migration SQL

```sql
-- 024_student_mastery.sql
-- P1a: durable mastery + evidence tables (schema + RLS only; no app wire yet)

create table public.student_mastery_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  target_key text not null,
  target_type text not null,
  record jsonb not null,
  updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint student_mastery_records_target_key_len
    check (char_length(target_key) between 1 and 256),
  constraint student_mastery_records_target_type_check
    check (target_type in (
      'word', 'phrase', 'grammar', 'strand', 'skill', 'standard', 'learning_goal'
    )),
  constraint student_mastery_records_student_target_unique
    unique (student_id, target_key)
);

create index student_mastery_records_student_updated_idx
  on public.student_mastery_records (student_id, updated_at desc);

create table public.student_learning_evidence (
  id uuid primary key,
  student_id uuid not null references auth.users (id) on delete cascade,
  occurred_at timestamptz not null,
  event jsonb not null,
  created_at timestamptz not null default now(),
  constraint student_learning_evidence_student_id_unique
    unique (student_id, id)
);

create index student_learning_evidence_student_occurred_idx
  on public.student_learning_evidence (student_id, occurred_at desc);

-- RLS
alter table public.student_mastery_records enable row level security;
alter table public.student_learning_evidence enable row level security;

-- Mastery: student owns rows
create policy "student_mastery_records_select_own"
  on public.student_mastery_records for select
  to authenticated
  using (student_id = auth.uid());

create policy "student_mastery_records_insert_own"
  on public.student_mastery_records for insert
  to authenticated
  with check (student_id = auth.uid());

create policy "student_mastery_records_update_own"
  on public.student_mastery_records for update
  to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Evidence: student owns rows; append-only (no update/delete policies)
create policy "student_learning_evidence_select_own"
  on public.student_learning_evidence for select
  to authenticated
  using (student_id = auth.uid());

create policy "student_learning_evidence_insert_own"
  on public.student_learning_evidence for insert
  to authenticated
  with check (student_id = auth.uid());

-- API grants (authenticated students only; guests stay local)
grant select, insert, update on public.student_mastery_records to authenticated;
grant select, insert on public.student_learning_evidence to authenticated;
```

**Explicitly omitted:**

- `anon` grants — guests must not read/write mastery server rows
- `DELETE` policies — students cannot delete mastery history via API
- `is_teacher()` SELECT — deferred to T1 (teacher-safe view or RPC)

---

## 4. TypeScript layer (no runtime wire)

**New file:** `lib/mastery/supabase-rows.ts`

```ts
// Row shapes matching 024_student_mastery.sql — used by P1b/P1c sync module

export type StudentMasteryRecordRow = {
  id: string;
  student_id: string;
  target_key: string;
  target_type: LearningTargetType;
  record: StudentMasteryRecord;
  updated_at: string;
  created_at: string;
};

export type StudentLearningEvidenceRow = {
  id: string;
  student_id: string;
  occurred_at: string;
  event: LearningEvidenceEvent;
  created_at: string;
};

// Pure mappers (no I/O):
export function masteryRecordToRow(studentId: string, record: StudentMasteryRecord): Omit<StudentMasteryRecordRow, "id" | "created_at">;
export function evidenceEventToRow(studentId: string, event: LearningEvidenceEvent): Omit<StudentLearningEvidenceRow, "created_at">;
export function rowToMasteryRecord(row: StudentMasteryRecordRow): StudentMasteryRecord;
```

**Tests:** `lib/mastery/supabase-rows.test.ts` — round-trip mapper tests using fixture records from existing mastery tests.

**Export:** Re-export from `lib/mastery/index.ts` (types + mappers only).

**Not in P1a:** `lib/mastery/supabase-sync.ts`, hooks in `recordLearningEvidenceEvent`, or `StudentStorageBootstrap` changes.

---

## 5. Verification plan

### 5.1 Migration apply

1. Run `024_student_mastery.sql` in dev Supabase SQL Editor (or CLI if configured).
2. Confirm tables exist: `\d student_mastery_records`, `\d student_learning_evidence`.
3. Confirm RLS enabled: `relrowsecurity = true` on both tables.

### 5.2 RLS manual checklist

Use two test student accounts (register via `/login` student flow) — **User A** and **User B**.

| # | Action | Role | Expected |
| --- | --- | --- | --- |
| 1 | `SELECT * FROM student_mastery_records` | anon (no JWT) | Permission denied / empty (no grant) |
| 2 | Insert row with `student_id = User A` | User A JWT (client or SQL with `set request.jwt.claims`) | Success |
| 3 | Insert row with `student_id = User B` | User A JWT | RLS violation |
| 4 | `SELECT` all mastery rows | User A JWT | Only User A rows |
| 5 | `UPDATE` User B row | User A JWT | 0 rows affected / denied |
| 6 | `DELETE` own row | User A JWT | Denied (no delete grant) |
| 7 | Insert duplicate `(student_id, target_key)` | User A JWT | Unique violation (upsert tested in P1c) |
| 8 | Insert evidence with duplicate `id` | User A JWT | Unique violation |
| 9 | `UPDATE` evidence row | User A JWT | Denied (no update policy) |
| 10 | Service role `SELECT` User A rows | service_role | Success (for future admin/T1) |

**Practical dev path:** Use Supabase Dashboard → Table Editor with student session cookie, or a one-off script using `createClient()` after student login. Document results in `docs/mastery/QA_P1A_SCHEMA.md`.

### 5.3 Automated tests (P1a only)

| Test file | Coverage |
| --- | --- |
| `lib/mastery/supabase-rows.test.ts` | Mapper round-trip, `updated_at` / `occurred_at` extraction |
| Existing `lib/mastery/*.test.ts` | Unchanged — no regressions |

No integration tests against live Supabase in CI for P1a (manual dev verification suffices).

---

## 6. Files to create / change

| File | Action |
| --- | --- |
| `supabase/migrations/024_student_mastery.sql` | **Create** — schema + RLS + grants |
| `lib/mastery/supabase-rows.ts` | **Create** — row types + mappers |
| `lib/mastery/supabase-rows.test.ts` | **Create** — mapper unit tests |
| `lib/mastery/index.ts` | **Update** — export new module |
| `docs/mastery/QA_P1A_SCHEMA.md` | **Create** — RLS checklist + sign-off |
| `docs/mastery/MASTERY_DATA_MODEL.md` | **Update** — §7 Supabase: tables landed |
| `docs/mastery/MASTERY_ROADMAP.md` | **Update** — P1a in progress / partial DoD |
| `docs/mastery/README.md` | **Update** — link P1a proposal |
| `README.md` | **Update** — migration list includes `024_*` |

**No changes** to: `local-storage.ts`, `StudentStorageBootstrap`, activity emitters, secondary session builder.

---

## 7. Phased delivery (P1a only)

| Step | Task | Time |
| --- | --- | --- |
| 1 | Finalize + apply migration SQL | ~30 min |
| 2 | RLS manual verification (2 test students) | ~30 min |
| 3 | `supabase-rows.ts` + unit tests | ~45 min |
| 4 | Docs (QA sign-off, index updates) | ~20 min |
| 5 | Buffer for RLS edge-case fixes | ~0–30 min |

**Total:** ~2–3 hours

---

## 8. Definition of done (P1a)

- [x] `024_student_mastery.sql` merged; apply to dev Supabase (see [QA_P1A_SCHEMA.md](./QA_P1A_SCHEMA.md))
- [x] Both tables defined with correct constraints and indexes
- [ ] RLS enabled; manual checklist passes (§5.2) — run after migration apply
- [x] `authenticated` grants correct; `anon` has no access
- [x] `supabase-rows.ts` mappers + tests pass (`npx vitest run lib/mastery/supabase-rows.test.ts`)
- [x] No runtime behavior change (localStorage path unchanged)
- [ ] `QA_P1A_SCHEMA.md` signed off after manual RLS verification
- [x] Roadmap / data model docs updated

**P1 program DoD** (full persistence) remains open until P1b–P1e.

---

## 9. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Column naming drift (`user_id` vs `student_id`) | Document mapping; mappers use `student_id`; align with event payloads |
| JSONB schema drift when `StudentMasteryRecord` evolves | Blobs are versioned in client `schemaVersion`; add `record_schema_version` column later if needed |
| Large pull payload (many targets) | P1b can paginate by `updated_at`; index supports it |
| Evidence table growth | Same 500-event cap on push (P1c); no unbounded server insert in P1 |
| Teacher needs read access before T1 | Service role for internal tools only; no teacher RLS in P1a |
| Migration not run in production | Document in README; P1b wire gated on migration apply |

---

## 10. Open questions (approve before implementation)

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | **Column name `student_id` vs `user_id`?** | **`student_id`** — matches mastery event field; distinct from `student_lesson_progress` |
| 2 | **Store evidence table in P1a or mastery-only first?** | **Both tables now** — evidence supports audit/debug; mastery is pull SoT |
| 3 | **Append-only evidence (no UPDATE)?** | **Yes** — matches local append-only log |
| 4 | **Add `record_schema_version int` column?** | **Defer** — client `MasterySnapshot.schemaVersion` sufficient for P1 |
| 5 | **Teacher SELECT via `is_teacher()` in P1a?** | **No** — strict T1 defer; avoids premature class-data exposure |
| 6 | **QA sign-off file separate or inline?** | **Separate `QA_P1A_SCHEMA.md`** (matches S1 pattern) |

---

## 11. What comes immediately after P1a approval

| Phase | Scope | Depends on P1a |
| --- | --- | --- |
| **P1b** | `pullMasterySnapshotFromServer` + merge into local on login | Tables + RLS |
| **P1c** | Write-through after `recordLearningEvidenceEvent` | Tables + mappers |
| **P1d** | `StudentStorageBootstrap` wire + merge policy tests | P1b + P1c |
| **P1e** | `MASTERY_SUPABASE_SYNC.md` + manual cross-device QA | P1d |

---

## 12. Approval

| Role | Decision | Date |
| --- | --- | --- |
| Product / curriculum | ☑ Approve P1a as specified | 2026-07-09 |
| Engineering | ☑ Approve P1a as specified | 2026-07-09 |

**Approved options:** `student_id` column · both tables · evidence append-only · teacher read deferred to T1.

**Completed:** 2026-07-09
