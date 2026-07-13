# Live Game — Question Database Phase Q5 Plan

**Status:** Complete  
**Prepared:** 2026-07-12  
**Parent:** [question-database-plan.md](./question-database-plan.md)  
**Depends on:** [question-database-q4-plan.md](./question-database-q4-plan.md) (complete)  
**Delivers:** DB-only runtime — remove TS question registry, legacy resolver fallback, and slug catalog from live paths  
**Does not ship:** Historical version snapshots in DB, new editor features, challenge-route behavior changes

---

## 0. Locked decisions (carry forward)

| Decision | Value |
| --- | --- |
| Runtime source of truth | **Supabase only** — no TS `SETS` registry, no `legacySnapshotFromTs` fallback |
| Seed authoring | TS files remain **dev-only** inputs for migration `036` regeneration |
| `legacy_source_id` in DB | **Keep** — client JSON ids and answer lookup for seeded rows (`adj-001`, `routine-wake`, …) |
| Session `questionSetId` | **UUID canonical** — slug normalization stays read-only for old sessionStorage only |
| Host carousel / editor | **Unchanged** — already DB-backed since Q3/Q4 |
| DB precondition | Migrations **035, 036, 038** applied in target environment before deploy |
| Version pinning | **Unchanged** — sessions freeze `questionSetVersion` at room create; no per-version DB rows in v1 |

---

## 1. Q5 goals

1. **Delete** runtime `question-sets.ts` registry and all live imports of `pickQuestionFromSet`, `getLiveGameQuestionSet`, etc.
2. **Remove** TS fallback paths from `question-set-resolver.ts` and `question-set-list.ts`.
3. **Slim** `question-set-legacy-adapter.ts` to snapshot helpers only (`findQuestionInSnapshot`, payload getters) — no TS content loading.
4. **Relocate** system-set metadata + A1 inline MC rows into a **seed-only** module consumed by `seed-data.ts` / `036` generator — not imported by `app/` or challenge routes.
5. **Tighten** host session binding to uuid-only defaults (drop `resolveLiveGameQuestionSetId` slug default).
6. **Refactor tests** that compared TS registry ↔ resolver into DB-seed ↔ resolver parity.
7. Update docs (`README`, `architecture.md`, parent plan) to reflect DB-only runtime.

---

## 2. Q5 non-goals

| Out of scope | Phase / note |
| --- | --- |
| Historical content versions in DB | Future — v1 stores one published row per set |
| Re-seed production from editor | Manual SQL / migration regen only |
| Remove `grade56-adjectives-v1.ts` file | Keep as seed source; remove from **runtime** import graph |
| Remove `questions-v1.ts` | Still used by `client-payloads.ts` (`toClientDepositSpell`) and phase tests |
| Student UI changes | Challenge JSON shapes unchanged |
| Challenge / answer route logic | Same resolver calls; only fallback removal |
| `legacy_source_id` column removal | Needed for client id + answer lookup |
| Slug column removal from DB | `slug` stays for display, seed idempotency, teacher copies |
| Auto-migrate in-flight sessions off old versions | Document limitation when system set `version` bumps |

---

## 3. Behavioral changes

### 3.1 Runtime

| Scenario | Today (Q4) | After Q5 |
| --- | --- | --- |
| DB empty / migrations missing | Resolver + carousel fall back to TS `SETS` | **503 / explicit error** — game cannot load question sets |
| Unknown `questionSetId` at host create | Slug coerced via `resolveLiveGameQuestionSetId` | **400** if not a known uuid (or slug with uuid mapping) |
| Host default set (no selection) | Defaults to slug `"grade56-adjectives"` | Defaults to `DEFAULT_LIVE_GAME_QUESTION_SET_UUID` |
| `GET /api/live-game/question-sets` | DB rows, else 4 legacy cards | **DB rows only** — empty list if none published |
| Answer validation by `question_id` | Matches uuid **or** `legacy_source_id` | **Unchanged** — DB rows carry `legacy_source_id` |
| Client `question.id` in challenges | `legacySourceId ?? id` | **Unchanged** |

### 3.2 Developer workflow

| Task | Today | After Q5 |
| --- | --- | --- |
| Edit system set content for production | Edit TS + regen `036` + deploy | Edit via **editor duplicate → publish** **or** regen `036` from seed module |
| Add 5th system set | Edit `question-sets-client.ts` + `question-sets.ts` + seed | New migration row + seed module entry only |
| Local dev without Supabase | Game runs on TS fallback | **Requires** local Supabase with migrations applied |

### 3.3 What “legacy” still means after Q5

| Term | Meaning after Q5 |
| --- | --- |
| `legacy_source_id` (DB column) | Stable string id from original TS seed (`adj-001`, `routine-wake`) — **kept** |
| `legacySnapshotFromTs` | **Removed** — was full in-memory TS registry mirror |
| `question-sets.ts` | **Deleted** — was runtime `SETS` record |
| `question-sets-client.ts` catalog | **Removed from runtime** — summaries move to seed-only module |
| Slug in sessionStorage | `normalizeQuestionSetRefForSession` still maps 4 system slugs → uuid on read |

---

## 4. Precondition gate (must pass before Q5 deploy)

Run against **production/staging** Supabase before merging Q5:

| Check | Expected |
| --- | --- |
| `select count(*) from live_game_question_sets where status = 'published'` | ≥ 4 |
| `select count(*) from live_game_questions` | ≥ 160 (system seed total) |
| Each system slug present | `grade56-adjectives`, `daily-routines-a1`, `school-life-a1`, `describing-places-a1` |
| Host smoke (Q4) | Carousel shows sets from DB; room play works |
| Teacher editor smoke | Duplicate + publish works |

**If gate fails:** do **not** deploy Q5. Apply migrations 035/036/038 first.

Optional CI guard (recommended in Q5):

```ts
// scripts/check-live-game-db-seed.mjs — fails prebuild if SUPABASE_URL set and count < 4
```

---

## 5. File inventory — delete, move, keep

### 5.1 Delete entirely

| File | Reason |
| --- | --- |
| `lib/live-game/modes/english-craft/question-sets.ts` | Runtime `SETS` registry — replaced by DB |

### 5.2 Slim / rename

| File | Action |
| --- | --- |
| `lib/live-game/server/question-set-legacy-adapter.ts` | Remove `legacySnapshotFromTs`, TS imports, deposit row builders. **Rename** → `question-set-snapshot.ts` (or keep filename, gut TS paths). **Keep:** `findQuestionInSnapshot`, `getHarvestPayload`, `getDepositPayload`, `getCraftPayload` |
| `lib/live-game/modes/english-craft/question-sets-client.ts` | **Delete runtime exports** (`LIVE_GAME_QUESTION_SET_SUMMARIES`, `isLiveGameQuestionSetId`, `getLiveGameQuestionSetSummary`). Move remaining metadata to seed module (§6.1) |
| `lib/live-game/server/question-set-resolver.ts` | Remove `legacySnapshotFromTs` import + fallback block in `getQuestionSetSnapshot` |
| `lib/live-game/server/question-set-list.ts` | Remove `legacyPublishedQuestionSetCards()` + `LIVE_GAME_QUESTION_SET_SUMMARIES` import |
| `lib/live-game/server/question-set-session.ts` | Remove `resolveLiveGameQuestionSetId`; default to `DEFAULT_LIVE_GAME_QUESTION_SET_UUID` |

### 5.3 Keep (dev / seed only)

| File | Role |
| --- | --- |
| `lib/live-game/modes/english-craft/grade56-adjectives-v1.ts` | Adjective bank source for seed builder |
| `lib/live-game/question-banks/seed-data.ts` | Builds `036` rows — update imports to seed-only source |
| `lib/live-game/question-banks/a1-deposit-overrides.ts` | A1 deposit spell mapping for seed |
| `scripts/seed-live-game-question-sets.mjs` | Optional live re-seed |
| `scripts/generate-live-game-question-set-seed-sql.ts` | Regen migration helper |
| `scripts/convert-grade56-adjectives-docx.mjs` | One-time docx → TS converter |
| `supabase/migrations/036_seed_live_game_question_sets.sql` | Idempotent system content |

### 5.4 Keep (runtime, unchanged or minor import path updates)

| File | Notes |
| --- | --- |
| `lib/live-game/question-banks/question-set-ids.ts` | Keep uuid constants + slug↔uuid helpers for session normalization |
| `lib/live-game/question-banks/schemas.ts` | Validation |
| `lib/live-game/question-banks/client-payloads.ts` | Update import path if adapter renamed |
| `lib/live-game/server/question-set-repository.ts` | DB reads |
| `lib/live-game/server/question-set-editor-*.ts` | Q4 editor (unchanged) |
| `lib/live-game/modes/english-craft/questions-v1.ts` | Client shape helpers |

---

## 6. New seed-only module

### 6.1 `lib/live-game/question-banks/system-seed-source.ts` (new)

**Purpose:** Single dev/seed import surface — **no** `app/` or `app/api/` imports.

Contents moved here:

| From (today) | To |
| --- | --- |
| `LIVE_GAME_QUESTION_SET_SUMMARIES` | `SYSTEM_QUESTION_SET_SUMMARIES` |
| `LiveGameQuestionSetId` type | `SystemQuestionSetSlug` (4 literal slugs) |
| A1 MC + craft rows from `question-sets.ts` `SETS` | `SYSTEM_A1_QUESTION_BANKS` record |
| `DEFAULT_LIVE_GAME_QUESTION_SET_ID` | `DEFAULT_SYSTEM_SET_SLUG` (seed scripts only) |

`seed-data.ts` changes:

```ts
// Before
import { getLiveGameQuestionSet } from "@/lib/live-game/modes/english-craft/question-sets";
import { LIVE_GAME_QUESTION_SET_SUMMARIES } from "@/lib/live-game/modes/english-craft/question-sets-client";

// After
import {
  SYSTEM_A1_QUESTION_BANKS,
  SYSTEM_QUESTION_SET_SUMMARIES,
  type SystemQuestionSetSlug,
} from "@/lib/live-game/question-banks/system-seed-source";
```

`buildA1Seed(slug)` reads `SYSTEM_A1_QUESTION_BANKS[slug]` instead of `getLiveGameQuestionSet(slug)`.

### 6.2 `question-set-ids.ts` decouple

Remove dependency on `question-sets-client.ts`:

```ts
// Inline slug union or import SystemQuestionSetSlug from system-seed-source.ts
export const LIVE_GAME_SYSTEM_SET_UUIDS: Record<SystemQuestionSetSlug, string> = { ... };
```

Runtime uuid map stays — it is not the TS content registry.

---

## 7. Server module changes (detailed)

### 7.1 `getQuestionSetSnapshot` — DB only

**Today:**

```ts
const fromDb = await loadSnapshotFromDb(ref);
if (fromDb && (version == null || fromDb.version === version)) {
  writeCache(fromDb);
  return fromDb;
}
const legacy = legacySnapshotFromTs(ref);
// ...
```

**After:**

```ts
const fromDb = await loadSnapshotFromDb(ref);
if (!fromDb) {
  throw new QuestionSetNotFoundError(ref);
}
if (version != null && fromDb.version !== version) {
  throw new QuestionSetVersionMismatchError(ref, version, fromDb.version);
}
writeCache(fromDb);
return fromDb;
```

New errors (server-only):

```ts
export class QuestionSetNotFoundError extends Error { ... }
export class QuestionSetVersionMismatchError extends Error {
  constructor(ref: string, requested: number, available: number) { ... }
}
```

Challenge routes already return 404/400 on resolver failure — map new errors consistently.

**Version mismatch note:** If a teacher publishes system set v2 (via future re-seed), sessions pinned to v1 will fail validation. Accept for v1; document in §13. Teacher-owned sets use new uuid on publish — no cross-version collision.

### 7.2 `listPublishedQuestionSetsForHost`

**Today:**

```ts
const fromDb = await fetchPublishedSetSummaries();
if (fromDb.length > 0) return fromDb.map(mapSummaryToCard);
return legacyPublishedQuestionSetCards();
```

**After:**

```ts
const fromDb = await fetchPublishedSetSummaries();
return fromDb.map(mapSummaryToCard);
```

Empty list → host page already shows “No published question sets.”

### 7.3 `resolveHostQuestionSetBinding`

**Today:**

```ts
if (!trimmed) return resolveLiveGameQuestionSetId(undefined); // → slug
const uuid = resolveQuestionSetUuid(trimmed);
if (uuid) return uuid;
return resolveLiveGameQuestionSetId(trimmed); // slug coercion
```

**After:**

```ts
import { DEFAULT_LIVE_GAME_QUESTION_SET_UUID } from "@/lib/live-game/question-banks/question-set-ids";

if (!trimmed) return DEFAULT_LIVE_GAME_QUESTION_SET_UUID;
const uuid = resolveQuestionSetUuid(trimmed);
if (uuid) return uuid;
throw new HostQuestionSetInvalidError(trimmed); // 400 at host route
```

Host route `POST /api/live-game/sessions/host` returns `{ error: "Unknown question set." }` with 400.

### 7.4 Snapshot helpers (ex-legacy-adapter)

**Keep unchanged behavior:**

```ts
findQuestionInSnapshot(snapshot, bank, questionId)
// matches row.id === questionId || row.legacySourceId === questionId
```

This is how challenges storing `adj-001` still validate after Q5 — data comes from DB row, not TS file.

**Move** `getHarvestPayload`, `getDepositPayload`, `getCraftPayload` imports in:

- `client-payloads.ts`
- `question-set-resolver.ts`

to `@/lib/live-game/server/question-set-snapshot`.

---

## 8. Test migration plan

### 8.1 Delete

| File | Reason |
| --- | --- |
| `lib/live-game/question-sets.test.ts` | Tested deleted `question-sets.ts` registry |

### 8.2 Rewrite

| File | New approach |
| --- | --- |
| `question-set-resolver.test.ts` | Remove `legacySnapshotFromTs` parity block. Mock `fetchPublishedSetBySlug` with fixture built from `buildSystemQuestionSetSeeds()[0]`. Keep deterministic pick + multi-correct tests. |
| `question-set-route-parity.test.ts` | Replace `pickQuestionFromSet` / `getCraftQuestionFromSet` with **seed builder** expectations: same seed → same `legacySourceId` via resolver mock. |
| `question-set-resolver-cache.test.ts` | Mock repository snapshot instead of `legacySnapshotFromTs`. |
| `client-payloads.test.ts` | Build fixture snapshot from `buildSystemQuestionSetSeeds()` transform helper (not TS registry). |
| `question-set-list.test.ts` | Remove “empty DB → 4 legacy cards” case. Add “empty DB → []”. |

### 8.3 Keep unchanged

| File | Why |
| --- | --- |
| `question-set-seed-parity.test.ts` | Already tests seed builder only |
| `write-seed-sql.test.ts` | Regenerates `036` from seed-data |
| `grade56-adjectives.test.ts` | Validates **source file** `grade56-adjectives-v1.ts` content quality |
| `question-set-publish.test.ts` | Q4 editor validation |
| All `english-craft-phase-*.test.ts` | Gameplay mechanics, not registry |

### 8.4 New tests

| File | Cases |
| --- | --- |
| `question-set-resolver-db-only.test.ts` | `getQuestionSetSnapshot` throws `QuestionSetNotFoundError` when repository returns null; throws on version mismatch |
| `question-set-session.test.ts` (update) | Host binding defaults to default uuid; unknown slug → error |
| `question-set-list.test.ts` (update) | No legacy fallback |

### 8.5 Gate

```bash
npm test -- lib/live-game
npm run build
```

Target: **≥ 218** tests (net −3 to +5 after deleting `question-sets.test.ts` and adding db-only cases).

Verify no runtime import of deleted modules:

```bash
rg "modes/english-craft/question-sets\"|legacySnapshotFromTs|pickQuestionFromSet" web --glob "*.{ts,tsx}" \
  --glob "!**/system-seed-source.ts" --glob "!**/seed-data.ts"
```

---

## 9. UI impact

| Surface | Change |
| --- | --- |
| Host carousel | None if DB seeded |
| Editor | None |
| Student gameplay | None if DB seeded |
| Local dev without DB | Host shows empty sets / room create fails — **document** in README dev setup |

Add to `web/README` or `docs/live-game/README.md`:

> Live Game requires Supabase migrations 035–038. TS question fallback removed in Q5.

---

## 10. Documentation updates

| File | Update |
| --- | --- |
| `docs/live-game/question-database-plan.md` | Mark Q5 planned; §5 transition note → complete |
| `docs/live-game/README.md` | Q5 link; DB required for local dev |
| `docs/live-game/architecture.md` | Resolver diagram: DB only; list question-set tables |
| `docs/live-game/question-database-q1-plan.md` | Footnote: TS fallback removed in Q5 |
| `docs/live-game/question-database-q2-plan.md` | Footnote: fallback removal date |
| `docs/live-game/question-database-q3-plan.md` | Remove “DB empty → legacy cards” |

---

## 11. File checklist

| Action | Path |
| --- | --- |
| **New** | `lib/live-game/question-banks/system-seed-source.ts` |
| **New** | `lib/live-game/server/question-set-snapshot.ts` (if split from adapter) |
| **New** | `lib/live-game/server/question-set-resolver-db-only.test.ts` |
| **Delete** | `lib/live-game/modes/english-craft/question-sets.ts` |
| **Delete** | `lib/live-game/question-sets.test.ts` |
| **Delete** | `lib/live-game/modes/english-craft/question-sets-client.ts` (after moving content) |
| **Update** | `lib/live-game/server/question-set-resolver.ts` |
| **Update** | `lib/live-game/server/question-set-list.ts` |
| **Update** | `lib/live-game/server/question-set-session.ts` |
| **Update** | `lib/live-game/server/question-set-legacy-adapter.ts` → snapshot-only or delete after move |
| **Update** | `lib/live-game/question-banks/seed-data.ts` |
| **Update** | `lib/live-game/question-banks/question-set-ids.ts` |
| **Update** | `lib/live-game/question-banks/client-payloads.ts` (import path) |
| **Update** | `app/api/live-game/sessions/host/route.ts` (400 on invalid set) |
| **Update** | Tests listed in §8 |
| **Update** | `docs/live-game/*` per §10 |
| **Optional** | `scripts/check-live-game-db-seed.mjs` |
| **Unchanged** | Editor routes, challenge routes (logic), `grade56-adjectives-v1.ts`, `036` migration |

---

## 12. Manual smoke checklist

1. Confirm precondition gate (§4) on target Supabase.
2. Deploy Q5 build.
3. `/live-game/host` → carousel shows ≥ 4 sets (all from DB).
4. **Play** each system set → harvest, deposit, craft all return questions.
5. Answer harvest MC with correct option → awards resource.
6. **Edit** system set → duplicate → editor → publish teacher copy → new card appears in carousel.
7. Create room with teacher-published set → gameplay works.
8. **Negative:** `POST /api/live-game/sessions/host` with `{ questionSetId: "not-a-real-id" }` → 400.
9. **Negative (staging only):** temporarily point app at empty DB schema → host shows no sets (no silent TS fallback).
10. Reload student session with old slug in sessionStorage → `normalizeQuestionSetRefForSession` still resolves to uuid.

---

## 13. Deployment steps

1. Verify §4 precondition on production/staging.
2. Merge + deploy Q5 app (no new migration required if 035/036/038 already applied).
3. `npm test -- lib/live-game` green.
4. Manual smoke §12.
5. Optional: remove any ops runbooks referencing “TS fallback if DB empty.”

**Rollback:** Revert app to Q4 tag. DB rows remain; Q4 code still reads DB first and falls back to TS if reverted build includes registry.

---

## 14. Acceptance criteria

- [ ] `question-sets.ts` deleted; no runtime imports remain
- [ ] `legacySnapshotFromTs` removed; resolver throws on DB miss
- [ ] Host list API returns DB published sets only
- [ ] Host create rejects unknown `questionSetId` (no slug coercion to default set)
- [ ] `legacy_source_id` answer lookup still works for system-seeded questions
- [ ] `seed-data.ts` + `036` regen still work from `system-seed-source.ts`
- [ ] `grade56-adjectives-v1.ts` not imported by `app/` or challenge routes
- [ ] `npm test -- lib/live-game` green; `npm run build` passes
- [ ] Docs updated; local dev notes mention DB requirement
- [ ] Manual smoke §12 completed

---

## 15. Risks

| Risk | Mitigation |
| --- | --- |
| Deploy Q5 before migrations applied | §4 precondition gate; optional CI seed check |
| Local dev without Supabase breaks | Document Docker/local Supabase setup; keep seed scripts |
| Version mismatch after system set re-publish to v2 | Document; in-flight v1 sessions may fail; defer version snapshots |
| Tests relied on TS registry for fixtures | §8 migration to `buildSystemQuestionSetSeeds()` fixtures |
| Accidental import of seed module in runtime | `server-only` on seed-data; lint/rg check in §8.5 |
| Teacher expects offline demo | Use seeded local Supabase, not TS fallback |

---

## 16. Q5 vs Q4 boundary

| Q4 shipped | Q5 removes |
| --- | --- |
| DB editor + teacher publishes | — |
| Carousel Edit → duplicate | — |
| TS fallback in resolver/list | **Yes** |
| `question-sets.ts` runtime registry | **Yes** |
| `question-sets-client.ts` host catalog | **Yes** (moved to seed-only) |
| Slug default at host create | **Yes** (uuid default only) |

---

## 17. Approval checklist

Please confirm Q5 scope:

- [ ] **DB-only runtime** — remove TS fallback entirely (no silent degrade)
- [ ] **Delete** `question-sets.ts`; move A1 inline content to `system-seed-source.ts`
- [ ] **Keep** `grade56-adjectives-v1.ts` + `seed-data.ts` for migration regen only
- [ ] **Keep** `legacy_source_id` column + `findQuestionInSnapshot` dual lookup
- [ ] Host binding: uuid default + 400 on unknown set (no slug coercion)
- [ ] Precondition: migrations 035/036/038 applied before deploy
- [ ] No historical version snapshots in this phase
- [ ] No challenge-route / student UI changes

**Reply approve / adjust and we implement Q5.**
