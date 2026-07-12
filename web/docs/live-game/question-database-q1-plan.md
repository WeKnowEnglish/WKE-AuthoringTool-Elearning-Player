# Live Game — Question Database Phase Q1 Plan

**Status:** Complete (2026-07-12)  
**Prepared:** 2026-07-12  
**Parent:** [question-database-plan.md](./question-database-plan.md)  
**Delivers:** Supabase schema, seeded content, TypeScript types/schemas, DB resolver + TS fallback, unit tests  
**Does not ship:** UI, API route rewiring, challenge-table changes, slug→uuid session migration

---

## 0. Locked decisions (from approval)

| Decision | Value |
| --- | --- |
| Play UX | **Play on card** creates room with that set |
| System set editing | **Duplicate-to-draft** only (editor in Q4) |
| Deposit banks | **Fully separate** from harvest |
| MC student UI | **Single choice**; server accepts any author-marked correct answer |
| Carousel location | **Host page only** (Q3) |

Q1 lays the database and server foundation. **No production behavior change** until Q2 wires challenge routes.

---

## 1. Q1 goals

1. Create Supabase tables for question sets and questions (three banks).
2. Seed all 4 current TS sets with correct bank split (adjectives → 61 harvest + 61 deposit + 1 craft).
3. Add TypeScript types + Zod validators for all payload shapes.
4. Build a **question-set resolver** that reads DB first, falls back to existing `question-sets.ts` if DB unavailable or row missing.
5. Add unit tests for validation, multi-correct MC, deterministic picks, and seed parity.
6. Document deterministic set UUIDs so Q2/Q3 can reference stable IDs.

---

## 2. Q1 non-goals

| Out of scope | Phase |
| --- | --- |
| Host carousel / editor UI | Q3 / Q4 |
| `GET/POST` question-set CRUD APIs | Q3 / Q4 |
| Challenge route rewiring | Q2 |
| `live_game_challenges` new columns | Q2 |
| Session `questionSetId` uuid migration | Q2 |
| Remove `question-sets.ts` static registry | Q5 |
| RLS write policies for teacher-authored sets | Q4 (Q1: read-only published + service-role seed) |

---

## 3. Supabase migration `035_live_game_question_sets.sql`

### 3.1 Enums via check constraints

```sql
-- bank: harvest | deposit | craft
-- status: draft | published
-- visibility: system | teacher
-- level: A1 | A2
```

### 3.2 Table `live_game_question_sets`

```sql
create table public.live_game_question_sets (
  id uuid primary key,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  level text not null check (level in ('A1', 'A2')),
  topic text not null default '',
  learning_objective text not null default '',
  description text not null default '',
  version int not null default 1 check (version >= 1),
  status text not null default 'published'
    check (status in ('draft', 'published')),
  visibility text not null default 'system'
    check (visibility in ('system', 'teacher')),
  sort_order int not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Indexes**

- `live_game_question_sets_status_sort_idx` on `(status, sort_order, title)`
- `live_game_question_sets_created_by_idx` on `(created_by)` where `visibility = 'teacher'`

**Deterministic UUIDs (seed ids — stable across environments)**

| slug | UUID |
| --- | --- |
| `grade56-adjectives` | `a1000001-0000-4000-8000-000000000001` |
| `daily-routines-a1` | `a1000001-0000-4000-8000-000000000002` |
| `school-life-a1` | `a1000001-0000-4000-8000-000000000003` |
| `describing-places-a1` | `a1000001-0000-4000-8000-000000000004` |

Using fixed UUIDs (not v5) keeps seed SQL readable and grep-friendly. Document in `question-set-ids.ts`.

### 3.3 Table `live_game_questions`

```sql
create table public.live_game_questions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.live_game_question_sets (id) on delete cascade,
  bank text not null check (bank in ('harvest', 'deposit', 'craft')),
  sort_order int not null default 0,
  prompt text not null check (char_length(prompt) between 1 and 2000),
  payload jsonb not null,
  enabled boolean not null default true,
  legacy_source_id text,  -- e.g. adj-001, routine-wake (seed traceability)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Indexes**

- `live_game_questions_set_bank_order_idx` on `(set_id, bank, sort_order)`
- `live_game_questions_set_bank_enabled_idx` on `(set_id, bank)` where `enabled`
- `live_game_questions_legacy_idx` on `(set_id, legacy_source_id)` where `legacy_source_id is not null`

**Payload check (lightweight SQL guard)**

```sql
constraint live_game_questions_payload_type_check check (
  payload ? 'type'
  and payload->>'type' in ('multiple_choice', 'deposit_spell', 'drag_sentence')
)
```

Full shape validation stays in application Zod (Q1 tests).

### 3.4 RLS (Q1 minimal)

Mirror `grammar_modules` read pattern; writes only via service role in Q1.

```sql
alter table public.live_game_question_sets enable row level security;
alter table public.live_game_questions enable row level security;

grant select on public.live_game_question_sets to authenticated;
grant select on public.live_game_questions to authenticated;

-- Teachers read all published system sets
create policy live_game_question_sets_published_select
  on public.live_game_question_sets for select to authenticated
  using (status = 'published');

create policy live_game_questions_published_select
  on public.live_game_questions for select to authenticated
  using (
    exists (
      select 1 from public.live_game_question_sets s
      where s.id = set_id and s.status = 'published'
    )
  );
```

No insert/update/delete policies for `authenticated` in Q1. Seed script uses **service role** (same as `challenge-store.ts`).

### 3.5 Updated-at trigger

Reuse existing `set_updated_at()` if present; otherwise add small trigger on both tables.

---

## 4. Seed strategy

### 4.1 Seed artifact

**File:** `web/scripts/seed-live-game-question-sets.mjs`

- Reads nothing from DB; outputs SQL or calls Supabase service role
- **Idempotent:** `INSERT … ON CONFLICT (slug) DO NOTHING` for sets; for questions `DELETE FROM live_game_questions WHERE set_id = $id AND visibility via join system` then re-insert, OR `ON CONFLICT (set_id, legacy_source_id, bank) DO UPDATE` if we add that unique index

**Recommended idempotency:** For system sets only:

```sql
-- upsert set by slug
-- delete questions for that set_id where set is system
-- insert all questions fresh
```

Run via: `node web/scripts/seed-live-game-question-sets.mjs` (documents env: `SUPABASE_SERVICE_ROLE_KEY`, project URL).

**Also commit:** `web/supabase/migrations/036_seed_live_game_question_sets.sql` as the canonical seed for hosted Supabase deploys (generated by script, reviewed in PR).

### 4.2 Set metadata (from `question-sets-client.ts`)

| slug | title | level | harvest | deposit | craft | sort_order |
| --- | --- | --- | --- | --- | --- | --- |
| grade56-adjectives | Grade 5–6 Adjectives | A2 | 60 | 60 | 1 | 1 |
| daily-routines-a1 | Daily Routines | A1 | 6 | 6 | 1 | 2 |
| school-life-a1 | School Life | A1 | 6 | 6 | 1 | 3 |
| describing-places-a1 | Describing Places | A1 | 6 | 6 | 1 | 4 |

All seeded as `status = published`, `visibility = system`, `version = 1`.

### 4.3 Harvest bank transform

**Source:** `question-sets.ts` MC arrays + `grade56-adjectives-v1.ts`

**Per question:**

```ts
{
  bank: "harvest",
  legacy_source_id: question.id,        // adj-001, routine-wake, …
  prompt: question.prompt,
  payload: {
    type: "multiple_choice",
    options: question.options,
    correctAnswers: [question.correctAnswer],  // single-element array in seed
  },
  sort_order: index,
}
```

Multi-correct is supported in schema; seed uses one correct answer per row (equivalent to today).

### 4.4 Deposit bank transform

**Fully independent rows** — not linked to harvest at runtime (Q2).

#### Grade 5–6 Adjectives (60 rows)

For each `EnglishCraftAdjectiveQuestion`:

```ts
{
  bank: "deposit",
  legacy_source_id: `deposit-${question.id}`,  // deposit-adj-001
  prompt: `Spell the word: ${question.spellHint}`,
  payload: {
    type: "deposit_spell",
    targetWord: normalizeTargetWord(question.targetWord),
    spellHint: question.spellHint,
  },
  sort_order: index,
}
```

`normalizeTargetWord`: lowercase a–z only; strip non-letters; seed script **fails** on invalid rows (surfaces bad docx data before deploy).

#### A1 sets (6 rows each)

MC correct answers are often phrases (`"wake up"`, `"have breakfast"`). Deposit needs a **single spellable word**.

**Seed rule per A1 MC question:**

| Step | Rule |
| --- | --- |
| 1 | `targetWord` = first token of `correctAnswer` matching `/^[a-z]+$/i` after normalization |
| 2 | If no single token (e.g. `"it was full of people"`), use explicit override map in seed script |

**Explicit overrides file:** `web/scripts/live-game-a1-deposit-overrides.ts`

| legacy MC id | targetWord | spellHint |
| --- | --- | --- |
| routine-wake | wake | wake up in the morning |
| routine-dressed | dressed | get dressed before school |
| routine-breakfast | breakfast | eat in the morning |
| routine-homework | homework | work after school |
| routine-usually | usually | on most days |
| routine-never | never | not on any day |
| … | … | … |

(School-life + describing-places: 6 overrides each — defined in seed script, reviewed in PR.)

```ts
{
  bank: "deposit",
  legacy_source_id: `deposit-${mc.id}`,
  prompt: `Spell the word: ${spellHint}`,
  payload: { type: "deposit_spell", targetWord, spellHint },
}
```

### 4.5 Craft bank transform

One row per set from existing `craftQuestion`:

```ts
{
  bank: "craft",
  legacy_source_id: craft.id,
  prompt: craft.prompt,
  payload: {
    type: "drag_sentence",
    wordBank: craft.wordBank,
    correctOrder: craft.correctOrder,
    slotCount: craft.slotCount,
  },
  sort_order: 0,
}
```

Update craft prompts while seeding (remove "build the bridge" wording):

- `"Put the routine in order:"`
- `"Put the school message in order:"`
- `"Put the map description in order:"`
- Adjectives: keep existing craft prompt (already generic)

### 4.6 Seed counts (acceptance)

| Set | harvest | deposit | craft | total rows |
| --- | --- | --- | --- | --- |
| grade56-adjectives | 60 | 60 | 1 | 121 |
| daily-routines-a1 | 6 | 6 | 1 | 13 |
| school-life-a1 | 6 | 6 | 1 | 13 |
| describing-places-a1 | 6 | 6 | 1 | 13 |
| **Total** | **78** | **78** | **4** | **160** |

---

## 5. TypeScript modules (new files)

### 5.1 `lib/live-game/question-banks/types.ts`

Shared types (client-safe where noted):

```ts
export type LiveGameQuestionBank = "harvest" | "deposit" | "craft";

export type HarvestMcPayload = {
  type: "multiple_choice";
  options: string[];
  correctAnswers: string[];
};

export type DepositSpellPayload = {
  type: "deposit_spell";
  targetWord: string;
  spellHint: string;
};

export type CraftSentencePayload = {
  type: "drag_sentence";
  wordBank: string[];
  correctOrder: string[];
  slotCount: number;
};

export type LiveGameQuestionPayload =
  | HarvestMcPayload
  | DepositSpellPayload
  | CraftSentencePayload;

export type LiveGameQuestionRow = {
  id: string;
  setId: string;
  bank: LiveGameQuestionBank;
  sortOrder: number;
  prompt: string;
  payload: LiveGameQuestionPayload;
  enabled: boolean;
  legacySourceId: string | null;
};

export type LiveGameQuestionSetRow = {
  id: string;
  slug: string;
  title: string;
  level: "A1" | "A2";
  topic: string;
  learningObjective: string;
  description: string;
  version: number;
  status: "draft" | "published";
  visibility: "system" | "teacher";
  sortOrder: number;
};

export type LiveGameQuestionSetSnapshot = LiveGameQuestionSetRow & {
  harvest: LiveGameQuestionRow[];
  deposit: LiveGameQuestionRow[];
  craft: LiveGameQuestionRow[];
};
```

### 5.2 `lib/live-game/question-banks/schemas.ts`

Zod schemas + parsers:

- `parseHarvestPayload(raw) → HarvestMcPayload | error`
- `parseDepositPayload(raw) → DepositSpellPayload | error`
- `parseCraftPayload(raw) → CraftSentencePayload | error`
- `validateQuestionRow(row)` — runs on repository read and before seed insert

**Harvest rules**

- `options.length >= 2`
- `correctAnswers.length >= 1`
- every `correctAnswers[i]` ∈ `options`
- no duplicate options (trim-aware)

**Deposit rules**

- `targetWord` matches `/^[a-z]+$/`
- `spellHint` non-empty

**Craft rules**

- `slotCount === correctOrder.length`
- multiset equality: `wordBank` sorted = `correctOrder` sorted

### 5.3 `lib/live-game/question-banks/question-set-ids.ts`

Exports `LIVE_GAME_SYSTEM_SET_UUIDS` map slug → uuid (§3.2 table).

### 5.4 `lib/live-game/server/question-set-repository.ts` (server-only)

Uses `createServiceRoleSupabase()` with authenticated fallback read (pattern from `grammar-modules.ts`).

| Function | Notes |
| --- | --- |
| `fetchPublishedSetBySlug(slug)` | Join questions; group by bank |
| `fetchPublishedSetById(id)` | Same |
| `fetchPublishedSetSummaries()` | For future carousel; not wired in Q1 |

Returns `null` if Supabase unavailable (resolver falls back).

### 5.5 `lib/live-game/server/question-set-resolver.ts` (server-only)

Core Q1 deliverable. **Not imported by challenge routes yet.**

#### Set reference resolution

```ts
type QuestionSetRef = string; // slug OR uuid

function resolveSetRef(ref: QuestionSetRef): {
  slug: string | null;
  id: string | null;
}
```

- If ref matches uuid regex → lookup by id
- Else if ref matches known slug → lookup by slug
- Else → null (fallback default slug)

#### Public API

| Function | Behavior |
| --- | --- |
| `getQuestionSetSnapshot(ref, version?)` | DB snapshot; on miss → `legacySnapshotFromTs(ref)` |
| `pickHarvestQuestion(ref, version, seed)` | Enabled harvest rows; `hashSeed(seed) % length` |
| `pickDepositQuestion(ref, version, seed)` | Enabled deposit rows; same hash |
| `pickCraftQuestion(ref, version, seed)` | Enabled craft rows; if multiple later, hash pick; today 1 row |
| `getQuestionById(ref, bank, questionId)` | By uuid id |
| `isHarvestAnswerCorrect(ref, questionId, answer)` | `answer` ∈ `correctAnswers` |
| `isDepositSpellCorrect(ref, questionId, spelling)` | Normalized spell === `targetWord` |
| `isCraftOrderCorrect(ref, questionId, order)` | Array equal `correctOrder` |
| `getQuestionSetVersion(ref)` | From DB row or TS summary |

#### In-memory cache

```ts
const CACHE_TTL_MS = 60_000;
// key: `${id}:v${version}` → snapshot
```

Invalidate on TTL only in Q1 (publish invalidation in Q4).

#### TS fallback adapter

**File:** `lib/live-game/server/question-set-legacy-adapter.ts`

Wraps existing `question-sets.ts` functions:

- Converts `correctAnswer` → `correctAnswers: [correctAnswer]`
- For deposit fallback on adjectives: synthesize deposit row from adjective MC spell fields (keeps current game working pre-Q2)
- For A1 deposit fallback: same override map as seed script

This ensures **zero regression** if migration not applied yet.

---

## 6. Tests (Q1)

**File:** `lib/live-game/question-banks/schemas.test.ts`

- Valid/invalid payloads per bank
- Multi-correct: `correctAnswers: ["a","c"]` accepts `"a"` and `"c"`, rejects `"b"`
- Craft multiset mismatch fails

**File:** `lib/live-game/server/question-set-resolver.test.ts`

- `legacySnapshotFromTs` parity: harvest count, craft order for each slug
- Deterministic pick: same seed → same question
- `isHarvestAnswerCorrect` multi-correct cases
- Deposit spell normalization (case-insensitive)
- Fallback path: mock repository returning `null` → resolver uses TS adapter

**File:** `lib/live-game/server/question-set-seed-parity.test.ts`

- Imports seed builder functions (shared with script)
- Asserts row counts §4.6
- Asserts every adjective `targetWord` is valid
- Asserts no duplicate `legacy_source_id` per bank per set
- **Does not require live Supabase** — tests the transform only

**Keep existing** `question-sets.test.ts` unchanged in Q1 (still validates TS registry until Q5).

---

## 7. File checklist

| Action | Path |
| --- | --- |
| **New** | `supabase/migrations/035_live_game_question_sets.sql` |
| **New** | `supabase/migrations/036_seed_live_game_question_sets.sql` |
| **New** | `lib/live-game/question-banks/types.ts` |
| **New** | `lib/live-game/question-banks/schemas.ts` |
| **New** | `lib/live-game/question-banks/question-set-ids.ts` |
| **New** | `lib/live-game/server/question-set-repository.ts` |
| **New** | `lib/live-game/server/question-set-resolver.ts` |
| **New** | `lib/live-game/server/question-set-legacy-adapter.ts` |
| **New** | `scripts/seed-live-game-question-sets.mjs` |
| **New** | `scripts/live-game-question-set-seed-data.ts` (shared transforms) |
| **New** | `scripts/live-game-a1-deposit-overrides.ts` |
| **New** | `lib/live-game/question-banks/schemas.test.ts` |
| **New** | `lib/live-game/server/question-set-resolver.test.ts` |
| **New** | `lib/live-game/server/question-set-seed-parity.test.ts` |
| **Update** | `docs/live-game/README.md` — link Q1 plan |
| **Update** | `question-database-plan.md` — mark parent decisions approved |
| **Unchanged** | Challenge routes, host page, `question-sets.ts` |

---

## 8. Deployment steps

1. Apply `035_live_game_question_sets.sql` to Supabase.
2. Apply `036_seed_live_game_question_sets.sql` (or run seed script in CI).
3. Deploy app with resolver code (**dormant** — nothing calls it yet).
4. Verify: `npm test -- lib/live-game/question-banks lib/live-game/server/question-set` green.
5. Optional smoke: temporary dev route or script `resolveQuestionSet('grade56-adjectives')` prints 60/60/1 counts.

**Rollback:** Tables are additive; app without Q2 wiring continues using TS only.

---

## 9. Acceptance criteria

- [ ] Migration creates both tables + RLS select policies
- [ ] 160 question rows seeded across 4 system sets
- [ ] Adjectives: 60 harvest + 60 deposit + 1 craft; deposit `targetWord` all valid a–z
- [ ] A1 sets: 6 deposit rows each with single-word `targetWord`
- [ ] Zod rejects invalid payloads (empty correctAnswers, bad craft order, etc.)
- [ ] Resolver returns DB snapshot when repository mocked with data
- [ ] Resolver falls back to TS when repository returns null
- [ ] Multi-correct MC validation works in resolver
- [ ] **No change** to live game play behavior (challenge routes untouched)
- [ ] `npm run build` passes

---

## 10. Q2 handoff notes (for context)

Q1 intentionally prepares these hooks for Q2:

| Q1 prepares | Q2 consumes |
| --- | --- |
| `pickDepositQuestion(ref, seed)` | `deposit/challenge` stops using `carry.questionId` |
| `getQuestionSetSnapshot` + version | Answer routes validate against session version |
| Stable set UUIDs | Host API stores uuid in Liveblocks |
| `legacy_source_id` | Optional analytics; challenge `question_id` becomes question uuid |

---

## 11. Approval checklist

Please confirm Q1 scope:

- [ ] Tables + RLS as specified (read-only for teachers in Q1)
- [ ] Fixed UUIDs for 4 system sets
- [ ] Seed totals: 160 questions with independent deposit banks
- [ ] A1 deposit words via override map (single spellable token)
- [ ] Resolver built but **not wired** to game routes in Q1
- [ ] TS fallback remains until Q5
- [ ] Craft prompts updated to remove "bridge" wording in seed

**Reply approve / adjust and we implement Q1.**
