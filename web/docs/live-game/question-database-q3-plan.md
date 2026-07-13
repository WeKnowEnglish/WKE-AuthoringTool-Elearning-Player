# Live Game — Question Database Phase Q3 Plan

**Status:** Complete (2026-07-12)  
**Prepared:** 2026-07-12  
**Parent:** [question-database-plan.md](./question-database-plan.md)  
**Depends on:** [question-database-q2-plan.md](./question-database-q2-plan.md) (complete)  
**Delivers:** Host carousel UI, `GET /api/live-game/question-sets`, uuid-based client session context, Play with selected set  
**Does not ship:** Question editor page/APIs (Q4), removal of static TS catalog (Q5)

---

## 0. Locked decisions (carry forward)

| Decision | Value |
| --- | --- |
| Carousel location | **Host page only** (`/live-game/host`) — lobby panel unchanged |
| Play UX | **Play on card** creates room with that set immediately; bottom **Create room** uses the **highlighted** card (same host API call) |
| Edit UX | **Edit** visible on cards but **stub in Q3** — disabled or “coming soon” until Q4 editor ships; system sets still duplicate-to-draft in Q4 |
| Set IDs | Carousel + host POST send **uuid**; slug display-only from API |
| Resolver strategy | **DB primary, TS fallback** for list API (same as runtime) |
| Auth | Teacher-only list + host (existing host route pattern) |

---

## 1. Q3 goals

1. Add `GET /api/live-game/question-sets` — teacher-authenticated list of **published** sets with bank counts.
2. Add `listPublishedQuestionSets()` to resolver (DB + legacy fallback).
3. Replace host-page **dropdown** with `LiveGameQuestionSetCarousel`.
4. Host page fetches sets on mount; Play / Create send **uuid** to `POST /api/live-game/sessions/host`.
5. Fix client **session context** to accept uuid `questionSetId` (required after Q2 — see §3.0).
6. Add loading / empty / error states on host page.
7. Tests + manual smoke; no gameplay route changes.

---

## 2. Q3 non-goals

| Out of scope | Phase |
| --- | --- |
| Question editor page + CRUD APIs | Q4 |
| `POST` duplicate / publish flows | Q4 |
| Teacher-owned draft sets in carousel | Q4 (v1 list = published only) |
| Carousel on `LiveGameHostLobbyPanel` | Never in v1 |
| Remove `question-sets-client.ts` static list | Q5 |
| Optimized SQL view for bank counts | Optional Q3b if N+1 is slow (4 sets — fine in v1) |
| Student-facing set picker | Never — set locked at host create |

---

## 3. Behavioral changes

### 3.0 Critical fix: session context accepts uuid (Q2 gap)

Q2 host API already writes and returns **uuid** `questionSetId`. Client session storage still validates slug-only:

```ts
// identity.ts today — rejects uuid
!isLiveGameQuestionSetId(parsed.questionSetId)
```

**After Q3:** `LiveGameSessionContext.questionSetId` is `string` (uuid). Validation checks non-empty string + optional uuid format; **remove** slug union gate.

**Files that must widen `questionSetId: string`:**

| File | Today |
| --- | --- |
| `lib/live-game/liveblocks/identity.ts` | `LiveGameQuestionSetId` + `isLiveGameQuestionSetId` check |
| `components/live-game/LiveGameRoomShell.tsx` | `LiveGameQuestionSetId` prop |
| `components/live-game/LiveGameHostPage.tsx` | slug state + static summaries |
| `components/live-game/LiveGameJoinForm.tsx` | slug fallback on join payload |

`LiveGameHostLobbyPanel` — **no change** (does not show set name today).

### 3.1 Host page UX

| Today | After Q3 |
| --- | --- |
| `<select>` from `LIVE_GAME_QUESTION_SET_SUMMARIES` | Horizontal **carousel** of cards from API |
| Sends slug to host API | Sends **uuid** |
| Learning objective under dropdown | On selected card + below carousel |
| Single “Create English Craft room” | **Create room** (selected card) + per-card **Play** (same action, that card’s uuid) |
| No Edit | **Edit** button stub (Q4) |

### 3.2 Question count on cards

Display **total enabled questions** across all three banks:

```
questionCount = harvestCount + depositCount + craftCount
```

Examples (seeded DB):

| Set | Harvest | Deposit | Craft | Card label |
| --- | ---: | ---: | ---: | --- |
| Grade 5–6 Adjectives | 60 | 60 | 1 | `A2 · 121 questions` |
| Daily Routines | 6 | 6 | 1 | `A1 · 13 questions` |

Subtitle (optional, smaller): `learningObjective` from DB row (same as today under dropdown).

### 3.3 API list vs runtime

| Concern | Behavior |
| --- | --- |
| DB empty (migrations not applied) | API returns **legacy fallback** — 4 system sets with stable UUIDs + counts from `legacySnapshotFromTs` |
| DB populated | API returns published rows ordered by `sort_order`, then `title` |
| Draft / teacher sets | **Not listed** in Q3 (published only) |

### 3.4 Edit button (stub)

Per approved master plan, **Edit** is part of the card chrome but editor is Q4.

**Q3 recommendation:**

- Render `Edit` as `KidButton variant="secondary"` **disabled** with `title="Question editor coming soon"`.
- Do **not** add `/live-game/question-sets/[id]/edit` route yet (avoids 404 confusion).
- Q4 replaces stub with `Link` to editor; system sets trigger duplicate-to-draft first.

---

## 4. API: `GET /api/live-game/question-sets`

### 4.1 Route

**File:** `app/api/live-game/question-sets/route.ts`

| Method | Auth | Response |
| --- | --- | --- |
| `GET` | Teacher (`isTeacher` — same as host route) | `{ sets: LiveGameQuestionSetCard[] }` |

Non-teacher → `401`. Server error → `503` with generic message.

### 4.2 Response shape

**New client-safe type** in `lib/live-game/question-banks/types.ts` (or `question-sets-api.ts`):

```ts
export type LiveGameQuestionSetCard = {
  id: string;              // uuid — use for host POST
  slug: string;            // display / analytics only
  title: string;
  level: "A1" | "A2";
  topic: string;
  learningObjective: string;
  description: string;
  version: number;
  visibility: "system" | "teacher";
  harvestCount: number;
  depositCount: number;
  craftCount: number;
  questionCount: number;   // sum of the three counts
};
```

**Do not expose:** question payloads, `correctAnswers`, `targetWord`, craft `correctOrder`.

### 4.3 Server implementation

**File:** `lib/live-game/server/question-set-list.ts` (new)

```ts
export async function listPublishedQuestionSetsForHost(): Promise<LiveGameQuestionSetCard[]>
```

**Algorithm:**

1. `const fromDb = await fetchPublishedSetSummaries()` (already in `question-set-repository.ts`).
2. If `fromDb.length > 0` → map each row to `LiveGameQuestionSetCard` + compute `questionCount`.
3. Else → `legacyPublishedQuestionSetCards()`:
   - Iterate `LIVE_GAME_QUESTION_SET_SUMMARIES` in catalog order.
   - For each slug: `legacySnapshotFromTs(slug)` → count `harvest.length`, `deposit.length`, `craft.length`.
   - `id` = `LIVE_GAME_SYSTEM_SET_UUIDS[slug]`.
   - `visibility` = `"system"`.

**Optional:** thin wrapper on resolver:

```ts
// question-set-resolver.ts
export async function listPublishedQuestionSets(): Promise<LiveGameQuestionSetCard[]>
```

re-exporting `listPublishedQuestionSetsForHost` for consistency with master plan naming.

### 4.4 Caching

- **No CDN cache** (teacher-specific auth).
- Route: `export const dynamic = "force-dynamic"`.
- Client: fetch once on `LiveGameHostPage` mount; no SWR required for 4 cards.

### 4.5 Future Q4 extension (document only)

Same route may later accept query `?include=drafts` for owner’s drafts — **not in Q3**.

---

## 5. UI: `LiveGameQuestionSetCarousel`

### 5.1 Component

**File:** `components/live-game/LiveGameQuestionSetCarousel.tsx`

**Props:**

```ts
type Props = {
  sets: LiveGameQuestionSetCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPlay: (id: string) => void;
  disabled?: boolean;       // while host POST in flight
};
```

### 5.2 Layout (matches master plan §7.1)

```
┌──────────────────────────────────────────────────────────────┐
│ Question set                                                 │
│  ◀  ┌────────────────────┐  ┌────────────────────┐  ▶      │
│     │ Grade 5–6 Adj      │  │ Daily Routines     │          │
│     │ A2 · 121 questions │  │ A1 · 13 questions  │          │
│     │ Compare & describe…│  │ Morning routines…  │          │
│     │ [ Play ] [ Edit ]  │  │ [ Play ] [ Edit ]  │          │
│     └────────────────────┘  └────────────────────┘          │
│ Selected: Understand adjective meanings…                     │
└──────────────────────────────────────────────────────────────┘
```

### 5.3 Interaction spec

| Action | Behavior |
| --- | --- |
| Click card body | `onSelect(set.id)` — highlight border/background |
| **Play** on card | `onPlay(set.id)` → parent runs host create with that uuid |
| **Edit** | Disabled stub (Q3) |
| ◀ / ▶ | Scroll carousel container by ~one card width; hide arrows when not overflow |
| Keyboard | Optional: left/right arrows move selection when carousel focused |
| Initial selection | First set in list, or `localStorage` key `wke-live-game-last-question-set-id` if still in list |

### 5.4 Styling

Reuse existing kid-ui tokens:

- Cards: `rounded-lg border-4 border-kid-ink bg-white` (selected: `bg-kid-panel` or ring)
- Carousel track: `flex gap-3 overflow-x-auto snap-x snap-mandatory` (hide scrollbar or thin)
- Buttons: `KidButton` primary for Play, secondary for Edit
- Match `LiveGameHostPage` / `KidPanel` typography

**No new global CSS file** — Tailwind only.

### 5.5 `LiveGameHostPage` refactor

**File:** `components/live-game/LiveGameHostPage.tsx`

| Step | Change |
| --- | --- |
| State | `selectedQuestionSetId: string \| null` (uuid) |
| Mount | `fetch("/api/live-game/question-sets")` → `sets` |
| Loading | Skeleton or “Loading question sets…” where carousel goes |
| Error | Message + “Retry” button re-fetching |
| Empty | “No published question sets.” (should not happen with fallback) |
| Remove | `<select>`, imports from `question-sets-client` summaries |
| `handleCreate(setId?)` | `setId ?? selectedQuestionSetId`; POST `questionSetId: uuid` |
| Session context | Store `payload.questionSetId` (uuid) + `payload.questionSetVersion` |
| Bottom button | `Create English Craft room` → `handleCreate()` with selected card |
| Card Play | `handleCreate(card.id)` directly |

**Keep unchanged on host page:** name, duration, character picker, back link.

---

## 6. Client type migration

### 6.1 New shared client module

**File:** `lib/live-game/question-banks/question-sets-api-client.ts` (new)

```ts
export type { LiveGameQuestionSetCard } from "./types";
export const DEFAULT_LIVE_GAME_QUESTION_SET_UUID = LIVE_GAME_SYSTEM_SET_UUIDS["grade56-adjectives"];

export function totalQuestionCount(card: Pick<LiveGameQuestionSetCard, "harvestCount" | "depositCount" | "craftCount">): number;

export async function fetchPublishedQuestionSets(): Promise<LiveGameQuestionSetCard[]>;
```

Host page uses `fetchPublishedQuestionSets()` wrapper for typed JSON parse + error handling.

### 6.2 `question-sets-client.ts` — keep until Q5

Still used by:

- `question-sets.ts` / legacy adapter (Q5 removal)
- Tests

**Do not delete in Q3.** Host page stops importing it.

### 6.3 `identity.ts` session context

```ts
export type LiveGameSessionContext = {
  // ...
  questionSetId: string;   // uuid from host/join API
  questionSetVersion: number;
};
```

**Validation in `getLiveGameSessionContext`:**

- `typeof parsed.questionSetId === "string" && parsed.questionSetId.length > 0`
- Remove `isLiveGameQuestionSetId` import
- **Backward compat:** if old slug found in sessionStorage, map via `resolveQuestionSetUuid(slug)` before return (one-release migration helper)

```ts
function normalizeStoredQuestionSetId(value: string): string {
  return resolveQuestionSetUuid(value) ?? value;
}
```

### 6.4 `LiveGameJoinForm`

Join API should return host session’s uuid (from Liveblocks or join response). Update:

- Payload type: `questionSetId?: string`
- Fallback: `DEFAULT_LIVE_GAME_QUESTION_SET_UUID` instead of slug default
- Verify `app/api/live-game/sessions/join/route.ts` returns session `questionSetId` from storage (if not, Q3 adds it to join response)

---

## 7. Join route check (small Q3 task)

**File:** `app/api/live-game/sessions/join/route.ts`

Confirm join JSON includes `questionSetId` + `questionSetVersion` read from Liveblocks `session` (uuid after Q2 host).

If missing today, add to join response so student `sessionStorage` matches host. **No student UI** for set selection.

---

## 8. Tests (Q3)

### 8.1 Server unit tests

| File | Cases |
| --- | --- |
| `lib/live-game/server/question-set-list.test.ts` | DB summaries mapped to cards; empty DB → legacy 4 cards; `questionCount` sum; stable uuid ids |
| `lib/live-game/server/question-set-list.test.ts` | Order matches `sort_order` when mocked |

### 8.2 API route test

| File | Cases |
| --- | --- |
| `app/api/live-game/question-sets/route.test.ts` | 401 without teacher; 200 with mocked teacher + mocked list function |

Use same vitest pattern as other API tests if present; else unit-test `listPublishedQuestionSetsForHost` only.

### 8.3 Client / identity tests

| File | Cases |
| --- | --- |
| `lib/live-game/liveblocks/identity.test.ts` (new) | Accepts uuid context; migrates legacy slug from sessionStorage; rejects malformed |
| `lib/live-game/question-banks/question-sets-api-client.test.ts` | `totalQuestionCount` helper |

### 8.4 Component test (light)

| File | Cases |
| --- | --- |
| `components/live-game/LiveGameQuestionSetCarousel.test.tsx` | Renders cards; selecting calls `onSelect`; Play calls `onPlay` with uuid |

Optional if RTL setup is heavy — manual smoke may suffice for carousel.

### 8.5 Regression gate

```bash
npm test -- lib/live-game
npm run build
```

Target: **≥ 201** tests (net +10–15 from Q3).

---

## 9. Manual smoke checklist

1. Teacher logs in → `/live-game/host`.
2. Carousel shows **4 sets** with plausible counts (121 / 13 / 13 / 13 if DB seeded).
3. Select different cards — highlight moves; learning objective updates.
4. **Play** on “Daily Routines” → room creates → harvest uses routines content.
5. **Create room** with Grade 5–6 selected → same as before for adjectives gameplay.
6. Open DevTools → `sessionStorage` `wke-live-game-session-context` has **uuid** `questionSetId`.
7. Student joins → session loads (no “Join from host screen first” regression).
8. With DB unreachable / empty: carousel still shows 4 fallback cards.
9. Non-teacher `GET /api/live-game/question-sets` → 401.

---

## 10. File checklist

| Action | Path |
| --- | --- |
| **New** | `app/api/live-game/question-sets/route.ts` |
| **New** | `lib/live-game/server/question-set-list.ts` |
| **New** | `lib/live-game/server/question-set-list.test.ts` |
| **New** | `lib/live-game/question-banks/question-sets-api-client.ts` |
| **New** | `lib/live-game/question-banks/question-sets-api-client.test.ts` |
| **New** | `components/live-game/LiveGameQuestionSetCarousel.tsx` |
| **New** | `components/live-game/LiveGameQuestionSetCarousel.test.tsx` (optional) |
| **New** | `lib/live-game/liveblocks/identity.test.ts` |
| **Update** | `lib/live-game/question-banks/types.ts` — add `LiveGameQuestionSetCard` |
| **Update** | `lib/live-game/server/question-set-resolver.ts` — export `listPublishedQuestionSets` (thin) |
| **Update** | `components/live-game/LiveGameHostPage.tsx` — carousel + fetch |
| **Update** | `lib/live-game/liveblocks/identity.ts` — uuid session context |
| **Update** | `components/live-game/LiveGameRoomShell.tsx` — `questionSetId: string` |
| **Update** | `components/live-game/LiveGameJoinForm.tsx` — uuid types + fallback |
| **Update** | `app/api/live-game/sessions/join/route.ts` — expose set id/version if missing |
| **Update** | `docs/live-game/README.md` — link Q3 plan |
| **Update** | `question-database-plan.md` — Q3 status |
| **Unchanged** | Challenge/answer routes, `LiveGameHostLobbyPanel`, editor routes |

---

## 11. Deployment steps

1. Ensure Supabase migrations **035–037** applied (carousel reads DB; fallback if not).
2. Deploy app with Q3 UI + API.
3. `npm test -- lib/live-game` green.
4. Manual smoke §9.
5. Verify one classroom host flow end-to-end.

**Rollback:** Revert deploy; host page returns to dropdown (still works with slug host API). No DB rollback.

---

## 12. Acceptance criteria

- [ ] `GET /api/live-game/question-sets` returns published sets for teachers only
- [ ] List includes bank counts + `questionCount` sum
- [ ] DB-empty fallback returns 4 system sets with correct stable UUIDs
- [ ] Host page shows carousel (no dropdown)
- [ ] Card **Play** and bottom **Create** both POST uuid to host API
- [ ] `LiveGameSessionContext` accepts uuid; legacy slug sessionStorage migrated
- [ ] Student join + room entry works after host creates with carousel
- [ ] **Edit** stub visible, non-functional until Q4
- [ ] `LiveGameHostLobbyPanel` unchanged
- [ ] `npm test -- lib/live-game` green; `npm run build` passes
- [ ] Manual smoke §9 completed

---

## 13. Risks

| Risk | Mitigation |
| --- | --- |
| Q2 uuid breaks sessionStorage validation | §3.0 — priority fix in Q3 |
| Carousel cramped on mobile | `snap-x` horizontal scroll; min card width ~260px |
| Question count surprises teachers (121 vs old “61”) | Copy explains “all practice items” or subtitle “60 MC + 60 spell + 1 craft” in Q3b if feedback |
| Edit stub frustration | Clear `title` tooltip; Q4 follows soon |
| Join route missing uuid in response | §7 explicit check in implementation |

---

## 14. Q4 handoff notes

| Q3 prepares | Q4 consumes |
| --- | --- |
| `LiveGameQuestionSetCard` type | Editor header metadata |
| Carousel Edit button placement | Wire to `/live-game/question-sets/[id]/edit` |
| List API | Editor index may reuse same route + drafts query |
| uuid in host/client flow | Editor CRUD uses set uuid in URLs |
| `visibility: system` on cards | Duplicate-to-draft before edit |

---

## 15. Approval checklist

Please confirm Q3 scope:

- [ ] Host carousel replaces dropdown on `/live-game/host` only
- [ ] **Play on card** + **Create with selected** both use uuid host POST
- [ ] `GET /api/live-game/question-sets` (published only, teacher auth)
- [ ] Question count = harvest + deposit + craft enabled rows
- [ ] Fix session context uuid validation (Q2 gap)
- [ ] **Edit** stub on cards; full editor deferred to Q4
- [ ] DB list with TS fallback when empty
- [ ] No challenge route / gameplay logic changes

**Reply approve / adjust and we implement Q3.**
