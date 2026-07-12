# Live Game — Question Database Plan

**Status:** Q1–Q5 complete (2026-07-12) — see [Q1](./question-database-q1-plan.md) · [Q2](./question-database-q2-plan.md) · [Q3](./question-database-q3-plan.md) · [Q4](./question-database-q4-plan.md) · [Q5](./question-database-q5-plan.md)  
**Prepared:** 2026-07-12  
**Scope:** Supabase-backed question sets, host carousel UI, teacher editor with three banks  
**Does not ship code** — design + phased implementation plan only

---

## 1. Problem

Today, all Live Game questions live in TypeScript files (`question-sets.ts`, `grade56-adjectives-v1.ts`). Teachers pick a set from a **dropdown** on `LiveGameHostPage`, but cannot view, edit, or create sets without a deploy.

We need:

1. A **database** of question sets teachers can manage
2. A **carousel** on the host screen (character + set selection) with **Play** and **Edit** per set
3. An **editor** with three banks — **harvest**, **deposit**, **craft**
4. Simple **add / delete / edit** for prompts and answers
5. **Multiple correct answers** for multiple-choice harvest questions

---

## 2. Current system (baseline)

| Piece | Today |
| --- | --- |
| Set catalog | 4 hardcoded IDs in `question-sets-client.ts` |
| Full content | `question-sets.ts` + `grade56-adjectives-v1.ts` |
| Host UI | `<select>` on `LiveGameHostPage.tsx` (not lobby panel) |
| Session binding | `session.questionSetId` + `questionSetVersion` in Liveblocks at room create |
| Harvest | MC from set; `pickQuestionFromSet(seed)`; single `correctAnswer` |
| Deposit | Reuses **harvest** `questionId` from carry; spell fields on MC row |
| Craft | **One** sentence-order question per set |
| Challenge DB | `live_game_challenges` stores `question_id` only — no content |
| Auth pattern | Teacher via `requireTeacher()` / `is_teacher()` RLS (see `grammar_modules`, `activity_library_items`) |

**Important behavioral change:** deposit is currently **linked** to the harvest question the student carried. This plan moves to **three independent banks**, so deposit challenges pick from the deposit bank directly.

---

## 3. Goals & non-goals

### Goals

- Teachers see all published sets in a carousel before creating a room
- **Play** → create session with that set (same as today, but DB-backed)
- **Edit** → open set editor (draft sets editable; published sets open as new draft or in-place per policy — see §8)
- Three tabbed banks in editor; CRUD per question
- Harvest MC supports `correctAnswers: string[]` (any checked option counts as correct)
- Runtime challenge APIs keep **server-only validation** (answers never sent to clients)
- Seed migration of existing 4 TS sets into DB

### Non-goals (this phase)

- Student-facing multi-select UI (student still picks **one** option; multiple author-marked answers are accepted)
- Mid-session question set switching
- AI question generation
- Sharing sets between teachers (v1: each teacher owns drafts; system sets are read-only templates — see §8)
- Coins / shop content

---

## 4. Data model (Supabase)

### 4.1 Tables

#### `live_game_question_sets`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | Runtime ID stored in Liveblocks |
| `slug` | `text` unique | Human-stable key; seed `grade56-adjectives`, etc. |
| `title` | `text` | Carousel card title |
| `level` | `text` | `A1` \| `A2` (check constraint) |
| `topic` | `text` | |
| `learning_objective` | `text` | Shown on host carousel |
| `description` | `text` | Optional subtitle |
| `version` | `int` | Bumped on publish |
| `status` | `text` | `draft` \| `published` |
| `visibility` | `text` | `system` \| `teacher` — system = seeded curated, teacher = authored |
| `created_by` | `uuid` FK → `auth.users` | Null for system seeds |
| `created_at` / `updated_at` | `timestamptz` | |

Indexes: `(status, updated_at)`, `(created_by, status)`.

#### `live_game_questions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | Stored in `live_game_challenges.question_id` going forward |
| `set_id` | `uuid` FK → sets, cascade delete | |
| `bank` | `text` | `harvest` \| `deposit` \| `craft` |
| `sort_order` | `int` | Editor list order; default 0 |
| `prompt` | `text` | Question stem / craft instruction |
| `payload` | `jsonb` | Bank-specific shape (§4.2) |
| `enabled` | `boolean` | Soft-disable without delete |
| `created_at` / `updated_at` | `timestamptz` | |

Indexes: `(set_id, bank, sort_order)`, `(set_id, bank) WHERE enabled`.

Unique constraint optional later: none in v1 (duplicate prompts allowed).

### 4.2 Payload shapes

**Harvest (`bank = harvest`)**

```json
{
  "type": "multiple_choice",
  "options": ["tiny", "small", "large", "huge"],
  "correctAnswers": ["tiny", "small"]
}
```

- Validation: submitted answer must be in `correctAnswers`
- Client payload: `options` shuffled; `correctAnswers` stripped (unchanged security model)
- Min 2 options, min 1 correct answer, all correct answers must exist in `options`

**Deposit (`bank = deposit`)**

```json
{
  "type": "deposit_spell",
  "targetWord": "tiny",
  "spellHint": "It means very small."
}
```

- `targetWord`: letters only (a–z), used by `deposit-spell-tiles.ts`
- `spellHint`: shown in deposit modal (definition-style)
- Validation: normalized spelling equals `targetWord` (case-insensitive, same as today)

**Craft (`bank = craft`)**

```json
{
  "type": "drag_sentence",
  "wordBank": ["I", "usually", "play football", "after school"],
  "correctOrder": ["I", "usually", "play football", "after school"],
  "slotCount": 4
}
```

- `slotCount` must equal `correctOrder.length`
- `wordBank` must contain exactly the tokens in `correctOrder` (multiset match)
- Client: shuffled `wordBank`; `correctOrder` stripped

### 4.3 Challenge table extension

Extend `live_game_challenges` (migration `035_…`):

| New column | Purpose |
| --- | --- |
| `question_set_id` | `uuid` — snapshot reference |
| `question_set_version` | `int` — content version at challenge issue |
| `question_bank` | `harvest` \| `deposit` \| `craft` |

Existing rows remain valid; new challenges populate all fields.

### 4.4 Session snapshot

At room create, Liveblocks `session` keeps:

```ts
questionSetId: string      // uuid (breaking change from slug union)
questionSetVersion: number // frozen for session lifetime
```

Answer validation loads content for **that version**. If teacher publishes edits mid-session, in-flight sessions keep old version until new room.

---

## 5. Runtime resolver (replaces `question-sets.ts`)

New server module: `lib/live-game/server/question-set-resolver.ts`

| Function | Behavior |
| --- | --- |
| `listPublishedQuestionSets()` | Carousel data for host |
| `getQuestionSetSnapshot(id, version?)` | Full set + three banks; cached in memory ~60s |
| `pickHarvestQuestion(setId, version, seed)` | Deterministic pick from enabled harvest rows |
| `pickDepositQuestion(setId, version, seed)` | Deterministic pick from enabled deposit rows |
| `pickCraftQuestion(setId, version, seed)` | Deterministic pick from enabled craft rows |
| `getQuestionById(setId, version, questionId)` | Re-fetch for answer validation |
| `validateHarvestAnswer(...)` | MC against `correctAnswers` |
| `validateDepositSpell(...)` | Spell against `targetWord` |
| `validateCraftOrder(...)` | Order against `correctOrder` |

**Transition:** Phase 1 ships resolver with **DB primary, TS fallback** for the 4 seeded slugs if DB row missing (safe deploy). Phase 2 removes TS registry.

**Deposit flow change:** `deposit/challenge` picks from **deposit bank** using seed `${playerId}:${storageId}:${depositCount}` — no longer reads `carry.questionId` for content (carry still tracks resource type only). Update `LiveGamePlayerCarry` to drop `questionId` or keep for analytics only.

---

## 6. API routes

All teacher routes use `requireTeacher()`.

### Sets

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/live-game/question-sets` | List published (+ own drafts for editor index) |
| `POST` | `/api/live-game/question-sets` | Create empty draft set |
| `GET` | `/api/live-game/question-sets/[id]` | Full set + questions (all banks) |
| `PATCH` | `/api/live-game/question-sets/[id]` | Update metadata |
| `POST` | `/api/live-game/question-sets/[id]/publish` | Validate banks → bump version → `published` |
| `POST` | `/api/live-game/question-sets/[id]/duplicate` | Clone set as new draft (for editing system sets) |

### Questions

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/live-game/question-sets/[id]/questions` | Add question `{ bank, prompt, payload }` |
| `PATCH` | `/api/live-game/question-sets/[id]/questions/[qid]` | Edit prompt / payload / enabled |
| `DELETE` | `/api/live-game/question-sets/[id]/questions/[qid]` | Hard delete |
| `POST` | `/api/live-game/question-sets/[id]/questions/reorder` | Batch `sort_order` update |

### Publish validation rules

| Bank | Minimum to publish |
| --- | --- |
| Harvest | ≥ 1 enabled question |
| Deposit | ≥ 1 enabled question |
| Craft | ≥ 1 enabled question |

Warn (non-blocking) if harvest count < 10 for long sessions.

### Existing routes (modified)

- `POST /api/live-game/sessions/host` — accept `questionSetId` as **uuid**; resolve version from DB
- `challenge`, `deposit/challenge`, `craft/challenge` — use resolver + snapshot version
- `answer`, `deposit/answer`, `craft/answer` — validate via resolver

---

## 7. UI plan

### 7.1 Host page carousel (`LiveGameHostPage.tsx`)

Replace dropdown with horizontal carousel:

```
┌─────────────────────────────────────────────────────────┐
│  ◀  ┌──────────────────┐  ┌──────────────────┐  ▶     │
│     │ Grade 5–6 Adj    │  │ Daily Routines   │         │
│     │ A2 · 62 questions│  │ A1 · 13 questions│         │
│     │ Compare & describe│  │ Morning routines │         │
│     │ [ Play ] [ Edit ]│  │ [ Play ] [ Edit ]│         │
│     └──────────────────┘  └──────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

- **Selected card** highlighted; **Play** uses highlighted set when clicking main **Create room** (or Play on card creates immediately — pick one UX in §9)
- **Edit** → `/live-game/question-sets/[id]/edit`
- System sets: **Edit** opens duplicate-as-draft flow (cannot mutate `visibility = system` in place)
- Fetch sets from `GET /api/live-game/question-sets` on mount
- Keep character picker + session length on same page

**Note:** `LiveGameHostLobbyPanel` stays unchanged — set is locked at room create.

### 7.2 Set editor (`/live-game/question-sets/[id]/edit`)

Layout:

```
┌ Set metadata ─────────────────────────────────────────┐
│ Title · Level · Topic · Learning objective  [Save] [Publish] │
├───────────────────────────────────────────────────────┤
│ [ Harvest ] [ Deposit ] [ Craft ]    ← tabs            │
├───────────────────────────────────────────────────────┤
│ + Add question                                         │
│ ┌ Question 1 ──────────────────────────── [Delete] ┐  │
│ │ Prompt: [________________________]               │  │
│ │ Options: [opt1] [opt2] [opt3] [opt4]  + option  │  │
│ │ Correct: ☑ opt1  ☐ opt2  ☑ opt3  ☐ opt4        │  │
│ └──────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

**Harvest tab:** prompt + dynamic options list + checkboxes for correct (min 1 checked)

**Deposit tab:** prompt (definition display) + `targetWord` + `spellHint`

**Craft tab:** prompt + word bank chips (add/remove) + drag or ordered list for `correctOrder`; auto-sync `slotCount`

**Editor behaviors:**

- Autosave debounced PATCH per question, or explicit Save per row (recommend **explicit Save** + dirty indicator for classroom reliability)
- Delete confirms once
- Publish button disabled until all three banks pass minimums
- Draft badge / version number visible

Reuse existing kid-ui / teacher panel styling from `LiveGameHostPage` + grammar editor patterns where sensible.

---

## 8. Permissions & ownership

| Set type | Who can Play | Who can Edit |
| --- | --- | --- |
| `system` + `published` | All teachers | Duplicate → own draft only |
| `teacher` + `draft` | Owner only (optional) | Owner |
| `teacher` + `published` | All teachers | Owner |

RLS policies mirror `grammar_modules`:

- Teachers read all `published` sets
- Teachers CRUD own `teacher` sets
- `system` rows: service-role seed only; no teacher UPDATE/DELETE

Students never hit question CRUD APIs; challenge content still server-fetched.

---

## 9. Open decisions (need your approval)

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | **Play UX** | Card **Play** = create room immediately with that set; bottom button becomes "Create with selected set" — same action |
| 2 | **Edit system sets** | Always **duplicate to draft** first; never edit `grade56-adjectives` in place |
| 3 | **Deposit independence** | Deposit bank fully separate (approved above); drop harvest→deposit question link |
| 4 | **Student MC UI** | Single-select; multiple author-correct options accepted server-side |
| 5 | **ID format** | UUID in DB + session; keep `slug` for display/seed/migration only |
| 6 | **Minimum bank sizes** | 1/1/1 to publish; recommend harvest ≥ 10 for pilot quality |
| 7 | **Autosave** | Manual Save per question in v1 (simpler, fewer partial rows) |
| 8 | **Carousel location** | Host page only (pre-room), not lobby panel |

---

## 10. Implementation phases

### Phase Q1 — Schema + seed (no UI)

- Migration `035_live_game_question_sets.sql`
- Seed script: import 4 TS sets → DB (split adjective MC spell fields into deposit bank)
- Resolver with DB + TS fallback
- Unit tests for validation + multi-correct MC
- **No host UI change yet**

### Phase Q2 — Wire runtime to DB

- Update challenge + answer routes to use resolver
- Deposit picks from deposit bank (update carry schema/docs)
- Extend `live_game_challenges` columns
- Enforce `questionSetVersion` on answer validation
- Regression: full `lib/live-game` suite + manual smoke

### Phase Q3 — Host carousel

- `GET /api/live-game/question-sets` list endpoint
- `LiveGameQuestionSetCarousel` component
- Replace dropdown on `LiveGameHostPage`
- Play → host API with uuid

### Phase Q4 — Editor

- Editor page + question CRUD APIs
- Three-tab bank UI
- Publish + duplicate flows
- Teacher auth guards

### Phase Q5 — Cleanup

- Remove `question-sets.ts` static `SETS` registry
- Remove TS resolver/list fallbacks (`legacySnapshotFromTs`)
- Move system-set catalog + A1 inline banks to seed-only `system-seed-source.ts`
- Tighten host binding to uuid-only defaults
- Update docs index + architecture.md

**Detail:** [question-database-q5-plan.md](./question-database-q5-plan.md)

**Estimated order:** Q1 → Q2 → Q3 → Q4 → Q5 (Q3 and Q4 can overlap after Q2).

---

## 11. Migration: adjectives set split

Today `grade56-adjectives` embeds spell fields on each MC row. Seed script will:

1. Copy each MC row → **harvest** bank (strip spell fields from payload)
2. Create matching **deposit** row per MC: `targetWord` + `spellHint` from adjective metadata, prompt = definition/hint text
3. Copy craft question → **craft** bank

A1 sets (`daily-routines`, etc.): generate deposit rows from a simple template (e.g. spell key vocabulary from MC correct answer) or leave deposit bank empty until teacher fills via duplicate+edit.

---

## 12. Testing plan

| Area | Tests |
| --- | --- |
| Payload validation | Zod schemas per bank; reject invalid craft order / empty correctAnswers |
| Multi-correct MC | Any listed answer passes; unlisted fails |
| Resolver cache | Version bump invalidates cache |
| Publish gate | Blocks publish when bank empty |
| Seed parity | DB set matches TS set for harvest count + craft answer |
| E2E smoke | Host carousel → play → harvest/deposit/craft all pull DB questions |

---

## 13. Risks

| Risk | Mitigation |
| --- | --- |
| Deposit decoupled from harvest feels disconnected pedagogically | Optional future: "linked deposit" toggle per set |
| Mid-session content drift | Version snapshot on session + challenge rows |
| Large adjective bank (61+) in editor | Virtualized list in Phase Q4b if sluggish |
| Breaking `questionSetId` type (slug → uuid) | Fallback resolver during Q1–Q2 |
| Teachers publish broken craft orders | Publish-time validation + preview button (later) |

---

## 14. Approval checklist

Please confirm or adjust:

- [x] Three **independent** banks (deposit no longer tied to harvest carry)
- [x] Carousel on **host page** with Play + Edit per set
- [x] System sets edited via **duplicate**, not in-place
- [x] MC: author marks **multiple correct**; student picks **one**
- [x] UUID set IDs in sessions
- [x] Phase order Q1 → Q5
- [x] Open decisions in §9

**Phase detail:** [Q1](./question-database-q1-plan.md) · [Q2](./question-database-q2-plan.md) · [Q3](./question-database-q3-plan.md) · [Q4](./question-database-q4-plan.md) · [Q5](./question-database-q5-plan.md)
