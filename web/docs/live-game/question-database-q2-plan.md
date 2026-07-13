# Live Game — Question Database Phase Q2 Plan

**Status:** Complete (2026-07-12)  
**Prepared:** 2026-07-12  
**Parent:** [question-database-plan.md](./question-database-plan.md)  
**Depends on:** [question-database-q1-plan.md](./question-database-q1-plan.md) (complete)  
**Delivers:** Runtime wiring — challenge/answer routes use DB resolver; independent deposit bank; challenge snapshot columns; session uuid storage  
**Does not ship:** Host carousel (Q3), editor (Q4), removal of `question-sets.ts` (Q5)

---

## 0. Locked decisions (carry forward from Q1)

| Decision | Value |
| --- | --- |
| Deposit banks | **Fully separate** from harvest — deposit challenge no longer reads `carry.questionId` for content |
| MC validation | **Single student choice**; server accepts any author-marked correct answer |
| Resolver strategy | **DB primary, TS fallback** until Q5 |
| Session IDs | **UUID canonical** in Liveblocks at room create; slug accepted at API boundary during Q2 (dropdown still sends slug) |
| Carousel / editor | **Deferred** to Q3 / Q4 — host page dropdown unchanged in Q2 |

**Q2 is the first phase that changes live gameplay behavior.** Harvest, deposit, and craft all pull content from the resolver (DB when migrations 035+036 are applied, otherwise TS fallback).

---

## 1. Q2 goals

1. Extend `live_game_challenges` with set snapshot metadata (`question_set_id`, `question_set_version`, `question_bank`).
2. Wire all six challenge/answer API routes to `question-set-resolver.ts` instead of `question-sets.ts`.
3. Decouple deposit challenges from harvest carry — pick from **deposit bank** with a deterministic seed.
4. Store **UUID** `questionSetId` + frozen `questionSetVersion` in Liveblocks session at room create.
5. Enforce session/challenge version when validating answers.
6. Add client payload adapters that map resolver rows → existing client JSON shapes (no student UI change).
7. Regression: full `lib/live-game` suite + manual smoke checklist.

---

## 2. Q2 non-goals

| Out of scope | Phase |
| --- | --- |
| Host carousel UI | Q3 |
| `GET /api/live-game/question-sets` list API | Q3 |
| Question editor / teacher CRUD | Q4 |
| Remove `question-sets.ts` static registry | Q5 |
| Historical DB snapshots per version (only current published row) | Future — v1 pins version 1 for system sets |
| Mid-session set switching | Never in v1 |
| `carry.questionId` removal from Liveblocks schema | Optional cleanup — deprecate deposit usage only in Q2 |

---

## 3. Behavioral changes (what players/teachers will notice)

### 3.1 Deposit independence (main gameplay change)

| Today | After Q2 |
| --- | --- |
| Deposit spell comes from the **same** MC row the student harvested (`carry.questionId`) | Deposit spell is picked from the **deposit bank** |
| Student must spell the adjective they just answered correctly | Student may get a **different** deposit word (still from the same set’s deposit bank) |
| A1 sets reused harvest MC metadata for deposit | A1 sets use dedicated deposit rows (seeded in Q1) |

**Carry still stores `questionId`** after harvest (which harvest question was answered) for analytics and award idempotency. Deposit routes **stop reading** it.

### 3.2 Question IDs in challenges

| Layer | ID format |
| --- | --- |
| `live_game_challenges.question_id` | Canonical **question UUID** from DB (or deterministic uuid from legacy adapter) |
| Client JSON `question.id` / challenge re-fetch | **`legacySourceId` when present** (e.g. `adj-001`, `mc-hot-cold`) so existing React hooks and prefetch caches keep working |
| Answer validation | Lookup by stored `question_id` — resolver `findQuestionInSnapshot` matches **both** uuid and `legacySourceId` |

### 3.3 Session binding

| Field | Today | After Q2 |
| --- | --- | --- |
| `session.questionSetId` | Slug (`grade56-adjectives`) | **UUID** (`a1000001-0000-4000-8000-000000000001`) |
| `session.questionSetVersion` | From TS `getQuestionSetVersion` | From resolver `getQuestionSetVersion` (DB or fallback) |
| Host API input | Slug from dropdown | Still accepts slug **or** uuid; normalizes to uuid before writing session |

**In-flight rooms** created before Q2 deploy may still have slug in session. Resolver already accepts slug refs — no migration of Liveblocks storage required.

### 3.4 Multi-correct MC (latent until DB edited)

Seeded content has single correct answers today. Q2 wiring enables multi-correct validation immediately via resolver — no extra route work when teachers publish multi-correct sets in Q4.

---

## 4. Supabase migration `037_live_game_challenges_question_set.sql`

### 4.1 Add columns

```sql
alter table public.live_game_challenges
  add column if not exists question_set_id uuid
    references public.live_game_question_sets (id) on delete set null,
  add column if not exists question_set_version int
    check (question_set_version is null or question_set_version >= 1),
  add column if not exists question_bank text
    check (question_bank is null or question_bank in ('harvest', 'deposit', 'craft'));
```

- All three columns **nullable** — existing challenge rows remain valid.
- New challenges from Q2 routes populate all three plus `question_id` (uuid).

### 4.2 Index (optional, low cost)

```sql
create index if not exists live_game_challenges_question_set_idx
  on public.live_game_challenges (question_set_id, question_bank)
  where question_set_id is not null;
```

### 4.3 RLS

No policy changes — table remains service-role only (same as migration `033`).

### 4.4 Rollback

```sql
alter table public.live_game_challenges
  drop column if exists question_bank,
  drop column if exists question_set_version,
  drop column if exists question_set_id;
```

App rollback: revert route imports to `question-sets.ts` (Q1 resolver dormant again).

---

## 5. Server modules (new + updated)

### 5.1 `lib/live-game/question-banks/client-payloads.ts` (new)

Maps `LiveGameQuestionRow` → existing client types. Keeps `questions-v1.ts` shuffle helpers.

| Function | Input | Output |
| --- | --- | --- |
| `clientQuestionId(row)` | `LiveGameQuestionRow` | `row.legacySourceId ?? row.id` |
| `toClientMcQuestionFromRow(row, shuffleSeed?)` | harvest row | `EnglishCraftMcQuestionClient` |
| `toClientCraftQuestionFromRow(row, shuffleSeed?)` | craft row | `EnglishCraftCraftQuestionClient` |
| `toClientDepositSpellFromRow(row, ctx)` | deposit row + `{ resourceType, storageLabel, shuffleSeed }` | `EnglishCraftDepositSpellClient` |

**Harvest mapping:**

```ts
{
  id: clientQuestionId(row),
  type: "multiple_choice",
  prompt: row.prompt,
  options: shuffleWithSeed(payload.options, `${shuffleSeed}:mc-options`),
}
```

**Deposit mapping:** read `targetWord` + `spellHint` from payload server-side only; delegate to existing `toClientDepositSpell`.

**Craft mapping:** read `wordBank` + `slotCount` from payload; shuffle bank with `${shuffleSeed}:craft-bank`.

### 5.2 `lib/live-game/server/question-set-session.ts` (new)

Centralizes session ref + version so routes do not duplicate slug/uuid logic.

```ts
export type SessionQuestionSetBinding = {
  /** Value stored in Liveblocks — uuid preferred, slug tolerated */
  ref: string;
  /** Resolved canonical set uuid */
  setId: string;
  /** Frozen at room create */
  version: number;
};

export function readSessionQuestionSetBinding(
  session: Pick<LiveGameSessionState, "questionSetId" | "questionSetVersion">,
): SessionQuestionSetBinding;

export async function resolveHostQuestionSetBinding(
  inputRef: string | undefined,
): Promise<SessionQuestionSetBinding>;
```

**`resolveHostQuestionSetBinding` behavior:**

1. Normalize input via existing `resolveLiveGameQuestionSetId` (slug default) when input missing/invalid.
2. Resolve uuid via `resolveQuestionSetUuid(ref)`.
3. Call `getQuestionSetVersion(ref)` from resolver (async).
4. Return `{ ref: uuid, setId: uuid, version }` for writing into Liveblocks.

### 5.3 `lib/live-game/server/question-set-challenge-context.ts` (new)

Unifies “which snapshot validates this challenge?”

```ts
export type ChallengeQuestionSetContext = SessionQuestionSetBinding & {
  bank: LiveGameQuestionBank;
};

export function inferQuestionBankFromNodeId(nodeId: string): LiveGameQuestionBank | null;

export function readChallengeQuestionSetContext(
  session: LiveGameSessionState,
  challenge: LiveGameChallengeRecord,
): ChallengeQuestionSetContext;
```

**Version precedence for answer validation:**

1. If `challenge.questionSetVersion != null` → use challenge row (frozen at issue).
2. Else → use `session.questionSetVersion`.
3. Set ref: `challenge.questionSetId ?? session.questionSetId` (resolver accepts both).

**Bank precedence:**

1. `challenge.questionBank` when present.
2. Else `inferQuestionBankFromNodeId(challenge.nodeId)`:
   - Resource node id → `harvest`
   - Storage building id → `deposit`
   - `craft-bench-v1` → `craft`

### 5.4 `lib/live-game/server/challenge-store.ts` (update)

**Extended record:**

```ts
export type LiveGameChallengeRecord = {
  challengeId: string;
  roomId: string;
  playerId: string;
  nodeId: string;
  questionId: string;
  questionSetId: string | null;
  questionSetVersion: number | null;
  questionBank: LiveGameQuestionBank | null;
  expiresAt: number;
  status: LiveGameChallengeStatus;
};
```

**Extended `createLiveGameChallenge` input:**

```ts
{
  roomId: string;
  playerId: string;
  nodeId: string;
  questionId: string;
  questionSetId: string;
  questionSetVersion: number;
  questionBank: LiveGameQuestionBank;
}
```

- All `select(...)` lists add the three new columns.
- Insert always sets them for new challenges.
- `toRecord` maps nulls for legacy rows.

### 5.5 `lib/live-game/server/award-deposit.ts` (update)

Remove harvest coupling:

| Remove | Reason |
| --- | --- |
| `expectedQuestionId` parameter | Deposit no longer tied to carry’s harvest question |
| `carry.questionId !== expectedQuestionId` guard | Same |

**Keep:**

- Carry must exist with matching `resourceType`.
- Session phase `playing`.
- Award receipt idempotency by `challengeId`.

### 5.6 `lib/live-game/liveblocks/config.ts` (update)

Widen session type:

```ts
questionSetId: string; // canonical uuid; legacy sessions may hold slug until replaced
```

Add JSDoc — full slug union removal happens in Q5. No Liveblocks schema migration required (string field).

### 5.7 Resolver — no functional changes expected

Q1 resolver already exposes everything Q2 needs. Optional tiny addition if useful:

```ts
export async function getDepositSpellMetadataFromRow(
  ref: string,
  questionId: string,
  version?: number,
): Promise<{ targetWord: string; spellHint: string } | null>;
```

Otherwise routes inline `getQuestionById` + `getDepositPayload`.

---

## 6. Deterministic pick seeds

| Flow | Seed formula | Notes |
| --- | --- | --- |
| Harvest | `${playerId}:${nodeId}:${collectedCount}` | **Unchanged** from today (`nodeState.collectedCount ?? 0`) |
| Deposit | `${playerId}:${storageId}:${poolCount}` | **New** — `poolCount` = current pool total for carried `resourceType` before deposit (`readResourcePool(storage)[resourceType]`) |
| Craft | `${playerId}:${recipeId}:0` | Single craft row per set today; seed leaves room for future multi-craft |

Deposit seed intentionally **does not** use `carry.questionId`, so repeated deposits at the same pool level get the same deposit question (stable retry UX). When pool increments after successful deposit, next carry gets a new seed.

---

## 7. Per-route refactor spec

All routes drop direct imports from `question-sets.ts` except where noted. Pattern:

1. Read storage → `readSessionQuestionSetBinding(session)`.
2. Pick or load question via resolver with `binding.ref` + `binding.version`.
3. Create/reuse challenge with snapshot metadata.
4. Return client payload via `client-payloads.ts`.

### 7.1 `POST /api/live-game/challenge` (harvest)

**File:** `app/api/live-game/challenge/route.ts`

| Step | Change |
| --- | --- |
| Pick new question | `pickHarvestQuestion(ref, version, seed)` |
| Rehydrate existing | `getQuestionById(ref, "harvest", existing.questionId, version)` — fallback re-pick only if null |
| Store challenge | `questionId: row.id`, `questionBank: "harvest"`, + set id/version |
| Response | `toClientMcQuestionFromRow(row, challengeId)` |

Remove: `pickQuestionFromSet`, `getQuestionFromSet`, `toClientMcQuestion` (from questions-v1).

### 7.2 `POST /api/live-game/answer` (harvest)

**File:** `app/api/live-game/answer/route.ts`

| Step | Change |
| --- | --- |
| Validate | `readChallengeQuestionSetContext` → `isHarvestAnswerCorrect(ctx.ref, challenge.questionId, answer, ctx.version)` |
| Award carry | `questionId: challenge.questionId` (uuid) — carry stores uuid; acceptable for analytics |

Remove: `isQuestionSetAnswerCorrect`, `resolveLiveGameQuestionSetId`.

### 7.3 `POST /api/live-game/deposit/challenge`

**File:** `app/api/live-game/deposit/challenge/route.ts`

| Step | Change |
| --- | --- |
| Remove | `getQuestionSetSpellMetadata(questionSetId, carry.questionId)` |
| Pick | `pickDepositQuestion(ref, version, depositSeed)` |
| Empty bank | If deposit bank length 0 → `409` “does not support deposit spelling” (same message as today) |
| Store challenge | `questionId: depositRow.id`, `questionBank: "deposit"` |
| Response spell | `toClientDepositSpellFromRow(depositRow, { resourceType, storageLabel, shuffleSeed: challengeId })` |

**No longer** sets `questionId: carry.questionId` on challenge create.

### 7.4 `POST /api/live-game/deposit/answer`

**File:** `app/api/live-game/deposit/answer/route.ts`

| Step | Change |
| --- | --- |
| Remove | `carry.questionId !== challenge.questionId` guard |
| Validate | `isDepositSpellCorrect(ctx.ref, challenge.questionId, spelling, ctx.version)` |
| Award | `awardDepositForCarry({ roomId, playerId, challengeId })` — no `expectedQuestionId` |

### 7.5 `POST /api/live-game/craft/challenge`

**File:** `app/api/live-game/craft/challenge/route.ts`

| Step | Change |
| --- | --- |
| Load craft | `pickCraftQuestion(ref, version, seed)` (deterministic; same row until multi-craft) |
| Store | `questionBank: "craft"` |
| Response | `toClientCraftQuestionFromRow(row, challengeId)` |

Remove: `getCraftQuestionFromSet`.

### 7.6 `POST /api/live-game/craft/answer`

**File:** `app/api/live-game/craft/answer/route.ts`

| Step | Change |
| --- | --- |
| Validate | `isCraftOrderCorrect(ctx.ref, challenge.questionId, order, ctx.version)` |

### 7.7 `POST /api/live-game/sessions/host`

**File:** `app/api/live-game/sessions/host/route.ts`

| Step | Change |
| --- | --- |
| Resolve set | `await resolveHostQuestionSetBinding(record.questionSetId)` |
| Write session | `questionSetId: binding.setId` (uuid), `questionSetVersion: binding.version` |
| Input | Dropdown still sends slug — no host UI change in Q2 |

Remove: sync `getQuestionSetVersion` from `question-sets.ts`.

### 7.8 Files that **stay** on `question-sets.ts` (until Q5)

| File | Reason |
| --- | --- |
| `question-set-legacy-adapter.ts` | TS fallback inside resolver |
| `question-banks/seed-data.ts` | Seed builders |
| `question-sets.test.ts` | Registry tests until removal |
| `grade56-adjectives.test.ts` | TS content tests |
| Host page / `question-sets-client.ts` | Dropdown catalog until Q3 carousel |

---

## 8. Backward compatibility matrix

| Scenario | Behavior |
| --- | --- |
| DB migrations 035–037 not applied | Resolver falls back to TS snapshots; gameplay works identically to Q1 semantics except deposit independence |
| Session has slug `questionSetId` | Resolver accepts slug ref |
| Session has uuid `questionSetId` | Normal path after Q2 host |
| Legacy challenge row (no snapshot columns) | Answer routes infer bank from `nodeId`, version from session |
| Legacy challenge `question_id` = `adj-001` | `findQuestionInSnapshot` matches `legacySourceId` |
| New challenge `question_id` = uuid | Validation by uuid |
| Student retries same deposit after wrong answer | Same challenge row + same deposit question (unchanged) |
| Teacher publishes v2 mid-session (future) | Session pinned to v1; if DB only stores latest version, resolver falls back to TS for v1 — acceptable until versioned snapshots |

---

## 9. Tests (Q2)

### 9.1 New unit tests

| File | Cases |
| --- | --- |
| `lib/live-game/question-banks/client-payloads.test.ts` | MC shuffle; craft shuffle; deposit never exposes `targetWord`; `clientQuestionId` prefers legacy id |
| `lib/live-game/server/question-set-session.test.ts` | Slug → uuid binding; default set; version from mocked resolver |
| `lib/live-game/server/question-set-challenge-context.test.ts` | Challenge row overrides session version; bank inference for tree vs storage vs bench |
| `lib/live-game/server/challenge-store.test.ts` | Insert/read new columns; legacy rows return nulls |

### 9.2 Updated tests

| File | Change |
| --- | --- |
| `english-craft-phase-3d.test.ts` | Replace `getQuestionSetSpellMetadata` / `isQuestionSetDepositSpellCorrect` with resolver `pickDepositQuestion` + `isDepositSpellCorrect` |
| `question-set-resolver.test.ts` | Add case: deposit pick seed stable; `getQuestionById` finds legacy id after uuid stored |

### 9.3 Parity test (new)

**File:** `lib/live-game/server/question-set-route-parity.test.ts`

For each system slug:

- Harvest: legacy `pickQuestionFromSet(slug, seed)` client id === resolver pick’s `clientQuestionId` for same seed (version 1).
- Deposit: resolver pick returns valid `deposit_spell` payload.
- Craft: legacy craft id === resolver craft row legacy id.

Ensures deploy does not shuffle question order unexpectedly for existing sessions.

### 9.4 Full suite gate

```bash
npm test -- lib/live-game
npm run build
```

Target: **≥ 178 tests** (net new tests from §9.1–9.3).

---

## 10. Manual smoke checklist (post-deploy)

1. Apply migrations **035**, **036**, **037** to Supabase.
2. Teacher hosts room with **Grade 5–6 Adjectives** (dropdown unchanged).
3. Student harvests wood → MC modal → correct answer → carry granted.
4. Student deposits at wood storage → **different** spell challenge (deposit bank) → correct spelling → pool +1, carry cleared.
5. Repeat deposit with A1 set (`Daily Routines`) — confirm deposit uses short target word (override), not MC sentence.
6. Craft boat recipe at workbench → sentence order → inventory updates.
7. Wrong deposit answer → carry retained, same challenge id on retry.
8. Disconnect/rejoin mid-challenge → challenge rehydrates same question.
9. Optional: temporarily break DB (`SUPABASE_SERVICE_ROLE_KEY` unset) → game still runs on TS fallback.

---

## 11. File checklist

| Action | Path |
| --- | --- |
| **New** | `supabase/migrations/037_live_game_challenges_question_set.sql` |
| **New** | `lib/live-game/question-banks/client-payloads.ts` |
| **New** | `lib/live-game/question-banks/client-payloads.test.ts` |
| **New** | `lib/live-game/server/question-set-session.ts` |
| **New** | `lib/live-game/server/question-set-session.test.ts` |
| **New** | `lib/live-game/server/question-set-challenge-context.ts` |
| **New** | `lib/live-game/server/question-set-challenge-context.test.ts` |
| **New** | `lib/live-game/server/question-set-route-parity.test.ts` |
| **New** | `lib/live-game/server/challenge-store.test.ts` |
| **Update** | `lib/live-game/server/challenge-store.ts` |
| **Update** | `lib/live-game/server/award-deposit.ts` |
| **Update** | `lib/live-game/liveblocks/config.ts` |
| **Update** | `app/api/live-game/challenge/route.ts` |
| **Update** | `app/api/live-game/answer/route.ts` |
| **Update** | `app/api/live-game/deposit/challenge/route.ts` |
| **Update** | `app/api/live-game/deposit/answer/route.ts` |
| **Update** | `app/api/live-game/craft/challenge/route.ts` |
| **Update** | `app/api/live-game/craft/answer/route.ts` |
| **Update** | `app/api/live-game/sessions/host/route.ts` |
| **Update** | `lib/live-game/english-craft-phase-3d.test.ts` |
| **Update** | `docs/live-game/README.md` — link Q2 plan |
| **Update** | `question-database-plan.md` — Q2 status line |
| **Unchanged** | Host page UI, student components, `question-sets.ts` registry |

---

## 12. Deployment steps

1. Apply `037_live_game_challenges_question_set.sql` (035+036 must already be applied from Q1).
2. Deploy app with Q2 route wiring.
3. Run `npm test -- lib/live-game` in CI.
4. Manual smoke §10 on staging.
5. Monitor first live class: deposit spells should vary independently of harvest MC.

**Rollback:** Revert app deploy; optional drop 037 columns. TS fallback keeps routes working if resolver code ships but DB empty.

---

## 13. Acceptance criteria

- [ ] Migration `037` adds nullable snapshot columns to `live_game_challenges`
- [ ] All six challenge/answer routes use resolver (no direct `question-sets.ts` imports in `app/api/live-game/**`)
- [ ] Host session stores uuid `questionSetId` + resolver `questionSetVersion`
- [ ] Deposit challenge picks from deposit bank with `${playerId}:${storageId}:${poolCount}` seed
- [ ] Deposit answer does not compare `carry.questionId` to challenge
- [ ] `awardDepositForCarry` does not require harvest question id match
- [ ] New challenges persist `question_set_id`, `question_set_version`, `question_bank`
- [ ] Answer validation uses challenge snapshot version when present, else session version
- [ ] Client payloads unchanged shape; `question.id` remains legacy-friendly where applicable
- [ ] Legacy in-flight challenges (pre-037 rows) still validate via `legacySourceId` + session version
- [ ] `npm test -- lib/live-game` green; `npm run build` passes
- [ ] Manual smoke §10 completed

---

## 14. Q3 handoff notes

Q2 intentionally leaves these for Q3:

| Q2 prepares | Q3 consumes |
| --- | --- |
| Session uuid `questionSetId` | Carousel sends uuid on Play |
| `listPublishedQuestionSets` in repository | `GET /api/live-game/question-sets` |
| Resolver-backed runtime | Host page fetches DB summaries instead of `question-sets-client.ts` static list |
| Deposit independence | Editor deposit tab edits what students spell at storage |

---

## 15. Approval checklist

Please confirm Q2 scope:

- [ ] Wire all challenge/answer routes to resolver (first gameplay behavior change)
- [ ] Deposit fully decoupled from harvest carry (deterministic deposit-bank pick)
- [ ] Challenge table snapshot columns (migration 037)
- [ ] Session stores uuid at host create; slug still accepted from current dropdown
- [ ] `carry.questionId` kept for harvest analytics; deposit stops using it
- [ ] Client question id stays legacy-friendly (`legacySourceId` in JSON)
- [ ] Host page UI unchanged (carousel is Q3)
- [ ] `question-sets.ts` remains as fallback until Q5

**Reply approve / adjust and we implement Q2.**
