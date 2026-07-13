# Live Game — Question Database Phase Q4 Plan

**Status:** Complete  
**Prepared:** 2026-07-12  
**Parent:** [question-database-plan.md](./question-database-plan.md)  
**Depends on:** [question-database-q3-plan.md](./question-database-q3-plan.md) (complete)  
**Delivers:** Teacher question-set editor, CRUD APIs, RLS write policies, duplicate-to-draft, publish flow, carousel Edit wiring  
**Does not ship:** Removal of `question-sets.ts` static registry (Q5), student-facing set picker, mid-session edits

---

## 0. Locked decisions (carry forward)

| Decision | Value |
| --- | --- |
| System set editing | **Duplicate-to-draft** only — never mutate `visibility = system` rows in place |
| Save model | **Explicit Save** per question row + dirty indicator (no autosave in v1) |
| Student MC | Author marks **multiple correct**; student still picks **one** (unchanged) |
| Deposit banks | **Independent** from harvest (already live since Q2) |
| Edit entry | Carousel **Edit** → duplicate if system → open `/live-game/question-sets/[id]/edit` |
| Auth pattern | Teacher `createClient()` + **RLS** for writes (mirror `grammar_modules`) |
| API style | REST under `/api/live-game/question-sets/**` (consistent with host/challenge routes) |
| Carousel list | Stays **published-only**; teacher drafts visible only in editor |

---

## 1. Q4 goals

1. Add Supabase **RLS write policies** for teacher-owned draft sets + questions (migration `038`).
2. Implement **set + question CRUD APIs** with Zod validation on all payloads.
3. Implement **duplicate-to-draft** and **publish** flows (version bump on publish).
4. Build **editor page** at `/live-game/question-sets/[id]/edit` with three bank tabs.
5. Wire carousel **Edit** button (system sets → duplicate → editor).
6. Invalidate resolver cache after publish so new rooms pick up content.
7. Tests + manual smoke; **no** challenge-route changes.

---

## 2. Q4 non-goals

| Out of scope | Phase / note |
| --- | --- |
| Remove `question-sets.ts` / `question-sets-client.ts` | Q5 |
| Host carousel shows teacher drafts | Optional later; v1 = published only |
| “New blank set” button on host page | Optional stretch — duplicate covers pilot |
| Delete entire set (metadata row) | v1 — delete **questions** only |
| Re-publish in-place without version bump | Publish always bumps `version` |
| Drag-and-drop reorder UI | v1 — reorder API exists; UI uses move up/down or manual `sort_order` on save |
| AI question generation | Never in v1 |
| Student access to editor APIs | Blocked by teacher auth + RLS |
| Historical version snapshots in DB | Single published row; sessions pin version at room create |
| Editor on mobile polish pass | Functional responsive layout only |

---

## 3. Behavioral changes

### 3.1 Teacher workflows

| Action | Today (Q3) | After Q4 |
| --- | --- | --- |
| Edit on carousel card | Disabled stub | **Duplicate** system set → open editor on new draft |
| Change harvest MC options | Deploy / SQL seed | Editor harvest tab → Save |
| Add deposit spell row | Seed only | Editor deposit tab → Add → Save |
| Ship edits to live game | Re-seed + deploy | **Publish** → bumps `version`; **new rooms** use new version |
| In-flight live session | Frozen at host create | **Unchanged** — still pinned to `questionSetVersion` |

### 3.2 System vs teacher sets

| `visibility` | `status` | Carousel Play | Carousel Edit | Editor |
| --- | --- | --- | --- | --- |
| `system` | `published` | Yes | Duplicate → draft | Read-only source (no direct edit) |
| `teacher` | `draft` | No (not listed) | N/A | Owner edits + Publish |
| `teacher` | `published` | Yes | Open editor (owner) or duplicate (others) — see §5.4 |

**Q4 pilot default:** All four seeded sets are `system` + `published`. Every Edit starts with duplicate.

### 3.3 Publish semantics

On **Publish**:

1. Validate metadata (title, level, …).
2. Each bank has **≥ 1 enabled** question with valid Zod payload.
3. `status` → `published`, `version` → `version + 1`, `updated_at` → now.
4. Resolver cache cleared for that set id/slug.
5. Carousel list shows updated counts on next fetch.

**Non-blocking warning** (UI toast): harvest enabled count &lt; 10.

### 3.4 Slug rules for teacher copies

| Source | New slug pattern | Example |
| --- | --- | --- |
| Duplicate system set | `{sourceSlug}-copy-{8 hex}` | `grade56-adjectives-copy-a1b2c3d4` |
| Collision | Retry with new suffix | — |

- New set `id`: random uuid v4.
- `legacy_source_id` on copied questions: **`null`** (teacher content is not tied to TS seed ids).
- `created_by`: current teacher `auth.uid()`.

---

## 4. Supabase migration `038_live_game_question_sets_teacher_rls.sql`

### 4.1 Grants

```sql
grant insert, update, delete on public.live_game_question_sets to authenticated;
grant insert, update, delete on public.live_game_questions to authenticated;
```

Service-role seed path (migrations `036`) unchanged.

### 4.2 Policies — `live_game_question_sets`

```sql
-- Teachers read their own drafts (published already readable via Q1 policy)
create policy live_game_question_sets_teacher_draft_select
  on public.live_game_question_sets for select to authenticated
  using (visibility = 'teacher' and created_by = auth.uid());

-- Teachers create draft teacher sets they own
create policy live_game_question_sets_teacher_insert
  on public.live_game_question_sets for insert to authenticated
  with check (
    visibility = 'teacher'
    and created_by = auth.uid()
    and status = 'draft'
  );

-- Teachers update only their own draft teacher sets (not system, not published)
create policy live_game_question_sets_teacher_draft_update
  on public.live_game_question_sets for update to authenticated
  using (visibility = 'teacher' and created_by = auth.uid() and status = 'draft')
  with check (visibility = 'teacher' and created_by = auth.uid());

-- Optional v1: allow delete own drafts only
create policy live_game_question_sets_teacher_draft_delete
  on public.live_game_question_sets for delete to authenticated
  using (visibility = 'teacher' and created_by = auth.uid() and status = 'draft');
```

**No** `authenticated` UPDATE/DELETE on `visibility = system` rows.

### 4.3 Policies — `live_game_questions`

Helper condition (inline in policies):

```sql
exists (
  select 1 from public.live_game_question_sets s
  where s.id = set_id
    and s.visibility = 'teacher'
    and s.created_by = auth.uid()
    and s.status = 'draft'
)
```

| Policy | Operation |
| --- | --- |
| `live_game_questions_teacher_draft_select` | SELECT (draft owner) |
| `live_game_questions_teacher_insert` | INSERT |
| `live_game_questions_teacher_update` | UPDATE |
| `live_game_questions_teacher_delete` | DELETE |

Published question rows remain read-only for `authenticated` (Q1 policy).

### 4.4 Rollback

Drop new policies; revoke insert/update/delete grants. App rollback removes editor routes; runtime keeps working from published system rows.

---

## 5. API routes

All routes: `export const dynamic = "force-dynamic"`. Teacher gate via `createClient()` + `isTeacher(user)` (same as `GET /api/live-game/question-sets`).

Shared helper: `lib/live-game/server/question-set-access.ts`

```ts
export type QuestionSetAccess = {
  userId: string;
  supabase: SupabaseClient;
  set: LiveGameQuestionSetRow; // from DB
};

export async function requireTeacher(): Promise<{ userId: string; supabase: SupabaseClient }>;
export async function requireDraftSetAccess(setId: string): Promise<QuestionSetAccess>;
export async function requirePublishedOrDraftSetRead(setId: string): Promise<QuestionSetAccess>;
```

### 5.1 Sets

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/live-game/question-sets` | List **published** cards (existing) | Teacher |
| `POST` | `/api/live-game/question-sets` | Create **empty** draft teacher set | Teacher |
| `GET` | `/api/live-game/question-sets/[id]` | Full set + all questions (editor load) | Teacher; published **or** own draft |
| `PATCH` | `/api/live-game/question-sets/[id]` | Update metadata | Own **draft** only |
| `POST` | `/api/live-game/question-sets/[id]/duplicate` | Clone set → new draft | Teacher |
| `POST` | `/api/live-game/question-sets/[id]/publish` | Validate + publish + version bump | Own **draft** only |

#### `POST /api/live-game/question-sets` (optional stretch)

Body: `{ title?, level?, topic?, learningObjective? }` defaults — creates empty draft with generated slug `teacher-set-{hex}`. **Include if time permits;** duplicate alone satisfies pilot.

#### `GET /api/live-game/question-sets/[id]`

Response:

```ts
{
  set: LiveGameQuestionSetRow;
  questions: {
    harvest: LiveGameQuestionRow[];
    deposit: LiveGameQuestionRow[];
    craft: LiveGameQuestionRow[];
  };
}
```

- Strip nothing server-side for editor (payloads included).
- Never expose this route to students.

#### `PATCH /api/live-game/question-sets/[id]`

Body (all optional):

```ts
{ title?, level?, topic?, learningObjective?, description? }
```

Zod: string lengths match DB checks.

#### `POST .../duplicate`

- **System set:** any teacher may duplicate.
- **Teacher published:** any teacher may duplicate (creates **their** new draft copy) — recommended for v1 simplicity.
- **Teacher draft:** owner may duplicate as “Save as copy” (optional); minimum: system only.

Response:

```ts
{ id: string; slug: string; title: string }
```

Implementation: service-role **read** source snapshot + authenticated **insert** new rows, OR single transaction via server using `createClient()` reading published rows (RLS allows SELECT) then inserting teacher draft (RLS allows INSERT).

#### `POST .../publish`

Response:

```ts
{ id: string; version: number; status: "published" }
```

Errors `400` with `{ error, bank?, questionId? }` on validation failure.

Calls `clearQuestionSetResolverCacheForTests()` production equivalent — export `invalidateQuestionSetCache(ref)`.

### 5.2 Questions

| Method | Route | Body | Auth |
| --- | --- | --- | --- |
| `POST` | `.../questions` | `{ bank, prompt, payload, enabled? }` | Own draft |
| `PATCH` | `.../questions/[qid]` | `{ prompt?, payload?, enabled? }` | Own draft |
| `DELETE` | `.../questions/[qid]` | — | Own draft |
| `POST` | `.../questions/reorder` | `{ bank, items: { id, sortOrder }[] }` | Own draft |

**POST** assigns `sort_order = max(bank) + 1`. New question `id` = `crypto.randomUUID()`.

**PATCH** re-validates full payload when `payload` present.

### 5.3 Error codes

| Code | When |
| --- | --- |
| `401` | Not teacher |
| `403` | Teacher but not owner / system set write |
| `404` | Unknown set or question |
| `400` | Zod / publish gate failure |
| `409` | Slug collision on duplicate (retry) |
| `503` | DB error |

---

## 6. Server modules (new + updated)

| File | Responsibility |
| --- | --- |
| `server/question-set-access.ts` | Teacher auth + draft ownership checks |
| `server/question-set-editor-repository.ts` | CRUD queries via authenticated client |
| `server/question-set-duplicate.ts` | Deep copy set + questions |
| `server/question-set-publish.ts` | Bank minimums + Zod sweep + version bump |
| `server/question-set-list.ts` | Unchanged for carousel (published only) |
| `question-banks/schemas.ts` | Reuse existing Zod — add `parseQuestionPayloadForBank(bank, raw)` wrapper if useful |
| `question-banks/editor-types.ts` | Client editor DTOs + form defaults per bank |

### 6.1 Publish validation (`question-set-publish.ts`)

```ts
export type PublishValidationResult =
  | { ok: true; warnings: string[] }
  | { ok: false; error: string; bank?: LiveGameQuestionBank };

export function validateSetForPublish(
  set: LiveGameQuestionSetRow,
  questions: LiveGameQuestionRow[],
): PublishValidationResult;
```

Rules:

| Rule | Blocking |
| --- | --- |
| Each bank has ≥ 1 `enabled` question | Yes |
| Each enabled question has valid payload Zod | Yes |
| `title` non-empty | Yes |
| Harvest enabled count &lt; 10 | No (warning) |

### 6.2 Duplicate (`question-set-duplicate.ts`)

```ts
export async function duplicateQuestionSetForTeacher(
  sourceSetId: string,
  teacherId: string,
): Promise<{ id: string; slug: string }>;
```

Steps:

1. Load source via `fetchPublishedSetById` or authenticated read (system published).
2. Generate unique slug.
3. Insert set row (`visibility: teacher`, `status: draft`, `version: 1`, `sort_order: 0`).
4. Bulk insert questions with new ids, same bank/prompt/payload/sort_order, `legacy_source_id: null`.
5. Return new id.

### 6.3 Cache invalidation

Extend `question-set-resolver.ts`:

```ts
export function invalidateQuestionSetCache(ref: string): void
```

Delete cache entries matching set id or slug. Call after publish and after PATCH on draft (optional for draft — drafts not in runtime until published).

---

## 7. UI plan

### 7.1 Routes

| Route | File | Guard |
| --- | --- | --- |
| `/live-game/question-sets/[id]/edit` | `app/live-game/question-sets/[id]/edit/page.tsx` | Teacher login (redirect like `/live-game/host`) |

### 7.2 Page structure

**`LiveGameQuestionSetEditorPage.tsx`** (client)

```
┌─ Header ─────────────────────────────────────────────────────┐
│ ← Back to host    [Draft v1] or [Published v2]             │
│ Title [________]  Level [A1|A2]                              │
│ Topic [________]  Learning objective [________]  [Save meta] │
│ [Publish] (disabled until banks valid)                       │
├──────────────────────────────────────────────────────────────┤
│ [ Harvest ] [ Deposit ] [ Craft ]                            │
├──────────────────────────────────────────────────────────────┤
│ + Add question                                               │
│ ┌─ Question card ──────────────────────── [Delete] ─────┐ │
│ │ Prompt [____________________________]                     │ │
│ │ … bank-specific fields …                                  │ │
│ │ [Save question]  (dirty ●)                                │ │
│ └───────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 7.3 Components

| Component | Responsibility |
| --- | --- |
| `LiveGameQuestionSetEditorPage` | Load set, tab state, publish/save orchestration |
| `LiveGameQuestionSetMetadataForm` | Title, level, topic, objective, description |
| `LiveGameQuestionBankTabs` | Tab bar + active bank |
| `LiveGameHarvestQuestionCard` | Options list, +option, correct checkboxes (multi) |
| `LiveGameDepositQuestionCard` | `targetWord`, `spellHint`, prompt |
| `LiveGameCraftQuestionCard` | `wordBank` chips, ordered slots, auto `slotCount` |
| `LiveGameQuestionSetPublishDialog` | Confirm publish; show warnings |

### 7.4 Bank-specific editor fields

**Harvest**

- `prompt` textarea
- Dynamic `options[]` text inputs + remove
- Checkboxes: “Correct?” per option (min 1 checked)
- Build payload: `{ type: "multiple_choice", options, correctAnswers }`

**Deposit**

- `prompt` (shown as definition in game)
- `targetWord` (lowercase a–z, validated live)
- `spellHint`
- Payload: `{ type: "deposit_spell", targetWord, spellHint }`

**Craft**

- `prompt`
- `wordBank` token list (add/remove)
- `correctOrder` — ordered list built from bank tokens (up/down buttons v1)
- Auto-set `slotCount = correctOrder.length`
- Payload: `{ type: "drag_sentence", wordBank, correctOrder, slotCount }`

### 7.5 Explicit Save UX

| Entity | Save trigger | Dirty state |
| --- | --- | --- |
| Metadata | **Save metadata** button | Unsaved changes warning on tab close (optional `beforeunload`) |
| Question row | **Save question** per card | Dot on card when local ≠ server |
| Publish | Separate confirm | — |

No autosave in v1.

### 7.6 Carousel wiring (`LiveGameQuestionSetCarousel.tsx`)

Replace disabled Edit with:

```ts
onEdit: (id: string) => void;
```

**`LiveGameHostPage` handler:**

1. If card `visibility === 'system'` → `POST /api/live-game/question-sets/{id}/duplicate`
2. Else if own draft (future) → navigate directly
3. `router.push(/live-game/question-sets/${draftId}/edit)`

Show loading on Edit while duplicate runs.

### 7.7 Styling

- Reuse `KidPanel`, `KidButton`, host page input classes
- Editor max-width `max-w-3xl` (wider than host for question cards)
- Grammar editor patterns: explicit save feedback, inline validation errors in red

---

## 8. Client API module

**File:** `lib/live-game/question-banks/question-sets-editor-api.ts`

```ts
export async function fetchQuestionSetForEditor(id: string): Promise<EditorSetPayload>;
export async function updateQuestionSetMetadata(id: string, patch: MetadataPatch): Promise<void>;
export async function duplicateQuestionSet(id: string): Promise<{ id: string }>;
export async function publishQuestionSet(id: string): Promise<{ version: number }>;
export async function createQuestion(setId: string, input: CreateQuestionInput): Promise<LiveGameQuestionRow>;
export async function updateQuestion(setId: string, qid: string, patch: QuestionPatch): Promise<void>;
export async function deleteQuestion(setId: string, qid: string): Promise<void>;
export async function reorderQuestions(setId: string, bank: LiveGameQuestionBank, items: ReorderItem[]): Promise<void>;
```

Typed fetch wrappers with error message extraction.

---

## 9. Tests (Q4)

### 9.1 Server unit tests

| File | Cases |
| --- | --- |
| `question-set-publish.test.ts` | Blocks empty bank; blocks invalid craft multiset; warns low harvest; passes valid set |
| `question-set-duplicate.test.ts` | Copies 121 questions; new slug; `visibility=teacher`; `legacy_source_id` null |
| `question-set-access.test.ts` | Draft owner vs non-owner (mocked supabase) |
| `question-set-editor-repository.test.ts` | Sort order on insert; reorder batch |

### 9.2 Schema regression

Existing `schemas.test.ts` — add cases for editor-built payloads (multi-correct MC, craft order).

### 9.3 Integration / parity

| File | Cases |
| --- | --- |
| `question-set-publish-resolver.test.ts` | After publish mock, resolver returns bumped version from DB |

### 9.4 Manual smoke (§11)

### 9.5 Gate

```bash
npm test -- lib/live-game
npm run build
```

Target: **≥ 208** tests (net +15–25).

---

## 10. File checklist

| Action | Path |
| --- | --- |
| **New** | `supabase/migrations/038_live_game_question_sets_teacher_rls.sql` |
| **New** | `lib/live-game/server/question-set-access.ts` |
| **New** | `lib/live-game/server/question-set-editor-repository.ts` |
| **New** | `lib/live-game/server/question-set-duplicate.ts` |
| **New** | `lib/live-game/server/question-set-publish.ts` |
| **New** | `lib/live-game/question-banks/editor-types.ts` |
| **New** | `lib/live-game/question-banks/question-sets-editor-api.ts` |
| **New** | `app/api/live-game/question-sets/[id]/route.ts` |
| **New** | `app/api/live-game/question-sets/[id]/duplicate/route.ts` |
| **New** | `app/api/live-game/question-sets/[id]/publish/route.ts` |
| **New** | `app/api/live-game/question-sets/[id]/questions/route.ts` |
| **New** | `app/api/live-game/question-sets/[id]/questions/[qid]/route.ts` |
| **New** | `app/api/live-game/question-sets/[id]/questions/reorder/route.ts` |
| **New** | `app/live-game/question-sets/[id]/edit/page.tsx` |
| **New** | `components/live-game/editor/LiveGameQuestionSetEditorPage.tsx` |
| **New** | `components/live-game/editor/LiveGameQuestionSetMetadataForm.tsx` |
| **New** | `components/live-game/editor/LiveGameQuestionBankTabs.tsx` |
| **New** | `components/live-game/editor/LiveGameHarvestQuestionCard.tsx` |
| **New** | `components/live-game/editor/LiveGameDepositQuestionCard.tsx` |
| **New** | `components/live-game/editor/LiveGameCraftQuestionCard.tsx` |
| **New** | `lib/live-game/server/question-set-publish.test.ts` |
| **New** | `lib/live-game/server/question-set-duplicate.test.ts` |
| **Update** | `app/api/live-game/question-sets/route.ts` — optional `POST` create empty draft |
| **Update** | `components/live-game/LiveGameQuestionSetCarousel.tsx` — `onEdit` |
| **Update** | `components/live-game/LiveGameHostPage.tsx` — duplicate + navigate |
| **Update** | `lib/live-game/server/question-set-resolver.ts` — cache invalidation |
| **Update** | `docs/live-game/README.md` — link Q4 plan |
| **Unchanged** | Challenge/answer routes, lobby panel, `question-sets.ts` registry |

---

## 11. Manual smoke checklist

1. Apply migration **038** to Supabase.
2. Teacher → `/live-game/host` → carousel shows 4 system sets.
3. Click **Edit** on Grade 5–6 Adjectives → brief loading → editor opens on **draft** copy title “Grade 5–6 Adjectives (copy)” or similar.
4. Harvest tab: edit one MC prompt → **Save question** → reload page → change persisted.
5. Add deposit question with valid `targetWord` → Save.
6. Craft tab: verify craft row copied; Save after reorder tweak.
7. **Publish** → success; version shows `v2` in editor header if re-opened from published row (or navigate away).
8. Host carousel → Play with **original** system set still works.
9. Host carousel → Play with **newly published** teacher set (if published set appears in list) uses new content.
10. Second teacher cannot PATCH system set (403 via API).
11. Student cannot open editor URL (redirect to login).

---

## 12. Deployment steps

1. Apply `038_live_game_question_sets_teacher_rls.sql`.
2. Deploy app with editor + APIs.
3. `npm test -- lib/live-game` green.
4. Manual smoke §11.
5. Pilot: one teacher duplicates adjectives, edits 2–3 questions, publishes, hosts room.

**Rollback:** Revert app; disable Edit (restore stub). DB policies can remain (no effect without app).

---

## 13. Acceptance criteria

- [ ] Migration `038` adds teacher draft RLS without weakening system-set protection
- [ ] Duplicate creates `teacher` + `draft` set with copied questions
- [ ] Editor loads full set + three banks for draft owner
- [ ] Harvest/deposit/craft **explicit Save** persists via API
- [ ] Publish enforces 1/1/1 enabled questions + Zod payloads; bumps `version`
- [ ] Carousel **Edit** duplicates system sets and opens editor
- [ ] Published teacher sets appear in carousel `GET` list
- [ ] System sets cannot be PATCHed/deleted by teachers
- [ ] Resolver cache invalidated on publish
- [ ] `npm test -- lib/live-game` green; `npm run build` passes
- [ ] Manual smoke §11 completed

---

## 14. Risks

| Risk | Mitigation |
| --- | --- |
| Large adjective bank (121 rows) slow in editor | Paginate or collapse cards in Q4b if needed; v1 loads all with simple scroll |
| Teachers publish broken craft | Publish-time Zod + disabled Publish until valid |
| Duplicate slug collision | Retry with new suffix |
| RLS blocks duplicate insert | Test with real teacher session in smoke |
| Confusion: edit system vs copy | Editor banner: “Editing your draft copy — original unchanged” |
| Published in-flight sessions stale | Document: version pinned at room create (existing Q2 behavior) |

---

## 15. Q5 handoff notes

| Q4 prepares | Q5 consumes |
| --- | --- |
| DB as source of truth for teacher publishes | Remove `question-sets.ts` runtime registry |
| All content addressable by uuid | Host/list no TS fallback required |
| `legacy_source_id` only on system seed | TS seed scripts remain dev-only import |

---

## 16. Approval checklist

Please confirm Q4 scope:

- [ ] Editor at `/live-game/question-sets/[id]/edit` with harvest / deposit / craft tabs
- [ ] **Explicit Save** per question (no autosave)
- [ ] System sets: **duplicate-to-draft** only; carousel Edit uses duplicate flow
- [ ] REST CRUD + publish APIs with teacher auth + RLS migration `038`
- [ ] Publish gates: 1/1/1 enabled questions + Zod; version bump on publish
- [ ] Carousel remains published-only; drafts not listed until published
- [ ] No challenge-route / gameplay changes
- [ ] `question-sets.ts` removal deferred to Q5

**Reply approve / adjust and we implement Q4.**
