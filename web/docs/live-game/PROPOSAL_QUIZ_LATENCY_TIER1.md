# Proposal: English Craft Quiz Latency — Tier 1

**Phase:** English Craft stabilization (post 2C)  
**Status:** Proposed — awaiting approval  
**Scope:** Tree MC challenges + craft bench challenges (shared patterns)  
**Out of scope:** Tier 2 (Supabase RPC collapse, async mark awarded), mastery integration (Phase 6)

---

## Summary

Students report that opening a quiz and submitting an answer feels slow. Investigation shows **mastery interactions are not on the hot path today** — the delay comes from sequential **Liveblocks + Supabase** round trips before the UI can show a question or confirm an award.

Tier 1 targets three changes that preserve the current security model (server-graded answers, one-time challenge tokens, Liveblocks as gameplay source of truth) while cutting perceived load time to near-zero and removing one full Liveblocks write per tree interaction.

| # | Change | Expected impact |
| --- | --- | --- |
| 1 | Remove `refreshExpiredNodeCooldowns` from challenge start; fix availability logic | ~100–300ms saved per open; removes 1 Liveblocks mutate |
| 2 | Instant question modal + parallel challenge token fetch | Perceived load ~0ms (modal opens immediately) |
| 3 | Prefetch challenge token when player is near a tree/bench | Interact often hits warm cache; token ready before keypress |

**Estimated engineering:** 1–2 days including tests and two-browser manual pass.

---

## Problem

### Current challenge-open waterfall

`POST /api/live-game/challenge` (tree chop) runs **sequentially**:

```
1. refreshExpiredNodeCooldowns(roomId)     → Liveblocks mutateStorage  (~100–250ms)
2. readLiveGameStorageJson(roomId)         → Liveblocks getStorageDocument
3. findActiveChallengeForPlayerNode(...)   → Supabase UPDATE (expire) + SELECT
4. createLiveGameChallenge(...)            → Supabase INSERT (if new)
```

Only after step 4 does `useLiveGameWoodChallenge` set `activeChallenge` and open `LiveGameMcChallengeModal`.

### Current client UX

```text
Press E → isLoading=true → wait for full API chain → modal opens
```

There is no loading skeleton in the modal; the student stares at the map until the network finishes.

### Why mastery is not the cause (today)

- No `mastery` or `interaction` imports under `web/app/api/live-game/*`.
- Questions come from static `ENGLISH_CRAFT_MC_QUESTIONS_V1` in `questions-v1.ts`.
- Mastery evidence is planned for Phase 6 and should stay async when added.

### Root cause of `refreshExpiredNodeCooldowns` on open

When wood is awarded, `awardWoodForNode` sets `available: false` and `cooldownEndsAt`. After cooldown elapses, something must flip the node back to interactable. Today that happens via a **full-room Liveblocks mutate** on every challenge request.

Tree **visuals** already use cooldown time only (`isNodeOnCooldown` in `EnglishCraftObjectsLayer`). Interactability and server validation still depend on the stale `available` flag unless refresh runs — hence the mutate was added to the hot path.

---

## Tier 1.1 — Remove cooldown refresh from challenge start

### Goal

Stop mutating Liveblocks storage when a student opens a quiz. Treat cooldown expiry as a **read-time** rule instead of a **write-time** cleanup.

### Design

**Unified availability rule** (client + server):

> A node is interactable when `cooldownEndsAt` is `null` or `<= now`.  
> The `available` boolean is authoritative **only while a cooldown is still active**; once elapsed, ignore a stale `available: false`.

Proposed logic:

```ts
function isResourceNodeAvailable(node, now = Date.now()): boolean {
  if (!node) return false;
  if (node.cooldownEndsAt != null && node.cooldownEndsAt > now) return false;
  return true;
}
```

Align client `isTreeInteractable` in `LiveGameCanvas.tsx` to the same rule (drop `available !== false` after cooldown check).

### Code changes

| File | Change |
| --- | --- |
| `web/lib/live-game/server/read-storage.ts` | Update `isResourceNodeAvailable` |
| `web/components/live-game/LiveGameCanvas.tsx` | Update `isTreeInteractable` to match |
| `web/app/api/live-game/challenge/route.ts` | **Remove** `await refreshExpiredNodeCooldowns(roomId)` |
| `web/lib/live-game/server/award-wood.ts` | Keep `refreshExpiredNodeCooldowns` exported but unused on hot path; optional: delete or restrict to admin/cron later |

### Optional cleanup (same PR or follow-up)

- Run `refreshExpiredNodeCooldowns` from `awardWoodForNode` only if we want storage JSON to eventually show `available: true` for debugging — **not required** for gameplay if read logic is fixed.
- Or a low-frequency background job (host tab / server cron) to normalize storage — deferred.

### Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Server rejects tree that client shows as interactable | Single shared availability function; unit tests for expired cooldown + `available: false` |
| HUD `collectedCount` / stats drift | Unaffected — award path unchanged |
| Anti-cheat bypass | Award still validated inside `awardWoodForNode` mutate (cooldown + availability re-checked atomically) |

### Acceptance criteria

- [ ] Opening a challenge no longer calls `mutateStorage` for cooldown refresh.
- [ ] Tree with elapsed cooldown is interactable on client and accepted by `POST /challenge` without a prior refresh.
- [ ] Tree still on cooldown returns 409 on server and is not in `interactableTrees` on client.
- [ ] Existing `english-craft-phase-2a` node availability tests updated and passing.

---

## Tier 1.2 — Instant question modal + parallel token fetch

### Goal

Show the MC question **immediately** on interact. Fetch `challengeId` in parallel. Student can read the question while the token loads; Submit stays disabled until the token is ready.

### Why this is safe

- `pickMcQuestionForNode(nodeId)` is **deterministic** (hash of `nodeId` → question index). Server uses the same function in `challenge/route.ts`.
- `toClientMcQuestion` strips `correctAnswer` — client never receives the key.
- Grading remains server-only via `isMcAnswerCorrect(challenge.questionId, answer)`.
- One-time `challengeId` still required before submit.

### State machine (`useLiveGameWoodChallenge`)

```text
idle
  → beginChallenge(tree)
      → open modal immediately with previewQuestion = toClientMcQuestion(pickMcQuestionForNode(tree.id))
      → tokenStatus = "pending"
      → fetch POST /challenge in background
      → on success: challengeId set, tokenStatus = "ready"
      → on error: tokenStatus = "error", show message, allow close/retry

submit (only if tokenStatus === "ready" && challengeId)
  → existing POST /answer flow
```

### UI changes (`LiveGameMcChallengeModal`)

| State | Submit button | Helper text |
| --- | --- | --- |
| `tokenStatus === "pending"` | Disabled | "Connecting..." or subtle spinner |
| `tokenStatus === "ready"` | Enabled when option selected | (none) |
| `tokenStatus === "error"` | Disabled | Error + retry via close and re-interact |

Do **not** block modal render on `isLoading` for the initial open — split `isLoading` into `isTokenLoading` vs `isSubmitting`.

### Reconcile edge case: active challenge reuse

If `findActiveChallengeForPlayerNode` returns an existing row, server may return `getMcQuestionById(existing.questionId)` instead of `pickMcQuestionForNode`. This happens when:

- Student closed modal without submitting and re-opens within TTL (~60s).

**Reconcile rule:** When token fetch completes, if `payload.question.id !== previewQuestion.id`, **replace** displayed question with server payload (rare; only on retry within TTL).

### Craft bench parity

Apply the same pattern to `useLiveGameCraftChallenge`:

- Preview: `toClientCraftQuestion(ENGLISH_CRAFT_CRAFT_BRIDGE_V1)` (static single question).
- Token fetch: `POST /api/live-game/craft/challenge` in parallel.
- Craft route has no `refreshExpiredNodeCooldowns` — even simpler.

### Code changes

| File | Change |
| --- | --- |
| `web/lib/live-game/hooks/useLiveGameWoodChallenge.ts` | Optimistic open + `tokenStatus` + reconcile |
| `web/lib/live-game/hooks/useLiveGameCraftChallenge.ts` | Same pattern |
| `web/components/live-game/LiveGameMcChallengeModal.tsx` | `tokenStatus` prop, split loading states |
| `web/components/live-game/LiveGameCraftModal.tsx` | Same (if craft modal has submit gate) |
| `web/lib/live-game/modes/english-craft/questions-v1.ts` | Ensure `pickMcQuestionForNode` + `toClientMcQuestion` are safe to import from client hooks (no server-only leakage) |

### Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Student submits before token ready | Submit disabled until `challengeId` present |
| Question bank change desyncs preview vs server | Reconcile on fetch complete; question bank versioned in pack later |
| Exposing answers via client bundle | Bank includes answers today in shared module — **pre-existing**; `toClientMcQuestion` never sends them over API; Tier 2+ can split `questions-server.ts` / `questions-client.ts` if needed |

### Acceptance criteria

- [ ] Modal visible within one frame of pressing E (no wait on network).
- [ ] Submit disabled until `challengeId` returned.
- [ ] Successful submit still awards wood exactly once.
- [ ] Retry within TTL shows same question (reconcile if server differs).
- [ ] 409 cooldown / not playing closes or errors gracefully without silent wrong state.

---

## Tier 1.3 — Prefetch challenge token on proximity

### Goal

When the student stands near a tree (or craft bench), start `POST /challenge` in the background so interact often finds a **warm token** already in memory.

### Trigger

Reuse existing proximity signal in `LiveGameCanvas`:

- `treeTarget` — nearest interactable tree from `findNearestInteractable`
- `craftBenchTarget` — nearest bench when `canCraft`

When `treeTarget.id` changes (or bench becomes target), debounce **300ms** then prefetch.

### Prefetch cache shape

```ts
type PrefetchedChallenge = {
  nodeId: string;
  challengeId: string;
  expiresAt: number;
  questionId: string;
  fetchedAt: number;
};

// Map<nodeId, PrefetchedChallenge> per hook instance
```

### Prefetch rules

| Rule | Behavior |
| --- | --- |
| Single target | Only prefetch **nearest** `treeTarget` / `craftBenchTarget` (not all trees in range) |
| Debounce | 300ms after target changes — avoid spam while walking |
| Abort | `AbortController` cancel in-flight prefetch when target changes or player leaves range |
| Skip if | Challenge modal open, `isSubmitting`, game not `playing`, node on cooldown |
| TTL | Treat cache entry stale when `expiresAt - 5s < now` or node enters cooldown |
| On interact | If cache hit for `tree.id`: open modal instantly with cached `challengeId` + question; skip fetch |
| On interact miss | Fall back to Tier 1.2 flow (instant preview + parallel fetch) |

### Invalidation

Clear cache entry when:

- `resourceNodes[nodeId]` enters cooldown (Liveblocks update after award)
- Challenge modal closes after correct answer
- Session phase ≠ `playing`
- Prefetch returns 409 (cooldown / not available)

### Rate limiting

- Max **1 prefetch request per 2s** per player (guard against edge-case target flicker).
- Do not prefetch same `nodeId` if valid cache entry exists.

### Implementation location

**Option A (recommended):** Extend `useLiveGameWoodChallenge` / `useLiveGameCraftChallenge` with optional `prefetchTarget: { nodeId } | null` argument updated from `LiveGameCanvas`.

**Option B:** New `useLiveGameChallengePrefetch` hook composed by canvas — more files, clearer separation.

### Code changes

| File | Change |
| --- | --- |
| `web/lib/live-game/hooks/useLiveGameWoodChallenge.ts` | Prefetch cache + `prefetch(nodeId)` + cache consume in `beginChallenge` |
| `web/lib/live-game/hooks/useLiveGameCraftChallenge.ts` | Prefetch when bench is target |
| `web/components/live-game/LiveGameCanvas.tsx` | `useEffect` driving prefetch from `treeTarget` / `craftBenchTarget` |

### Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Extra Supabase rows from unused prefetches | Challenges expire (~60s); same cost as today’s “open and cancel”; acceptable for pilot |
| Stale token after another player chops same tree | Per-player-per-node challenges; wood award is per-player token + node cooldown is shared — server still validates on answer |
| API spam near tree clusters | Nearest-only + debounce + 2s rate limit |
| Prefetch during host pause (future) | Gate on `session.phase === "playing"` |

### Acceptance criteria

- [ ] Walking up to a tree prefetches at most once per approach (debounced).
- [ ] Pressing E with warm cache opens modal with Submit enabled immediately (no “Connecting...”).
- [ ] Leaving tree range aborts in-flight prefetch.
- [ ] After chopping tree, prefetch does not fire again until cooldown clears on client.
- [ ] Network tab shows prefetch request before interact on typical walk-up.

---

## Implementation order

```text
1. Tier 1.1 — availability logic + remove refresh (unblocks correct behavior without mutate)
2. Tier 1.2 — instant modal (largest perceived win; depends on 1.1 for consistent cooldown)
3. Tier 1.3 — prefetch (optimizes best case on top of 1.2)
```

Ship 1.1 alone if we want a minimal low-risk PR first; 1.2 + 1.3 can follow in one UX-focused PR.

---

## Test plan

### Unit tests (Vitest)

| Test | File |
| --- | --- |
| `isResourceNodeAvailable` — elapsed cooldown + `available: false` → true | `english-craft-phase-2a.test.ts` or new `quiz-latency-tier1.test.ts` |
| Client `isTreeInteractable` matches server rule | Export shared helper `isEnglishCraftNodeInteractable` in `gameplay-v1.ts` or `read-storage` client-safe module |
| `pickMcQuestionForNode` stable + `toClientMcQuestion` omits answer | existing |
| Prefetch cache TTL + invalidation logic | new hook tests with mocked `fetch` |

### Integration / manual (two browsers)

1. **Cooldown expiry:** Chop tree → wait 30s → tree interactable without slow open; no Liveblocks mutate on open (verify via logs or temporary instrumentation).
2. **Instant modal:** Press E → question visible immediately; brief “Connecting...” then Submit enables.
3. **Warm prefetch:** Walk toward tree slowly → on E, Submit enabled with no connecting state.
4. **Cancel and retry:** Open quiz, cancel, re-open within 60s → same challenge/question.
5. **Wrong answer:** Submit wrong → retry without re-open; no double award on rapid correct double-click.
6. **Craft bench:** Same three flows at 10 wood.
7. **Concurrent players:** Two students chop different trees; no cross-player token bleed.

### Regression

- Run existing `english-craft-phase-2a`, `2b`, `2c` tests.
- `tsc` clean.

---

## Success metrics

| Metric | Target (pilot) |
| --- | --- |
| Time to modal visible after E | **< 50ms** (client-only) |
| Time to Submit enabled (cold, no prefetch) | **< 1.5s** p95 (down from ~2–4s) |
| Time to Submit enabled (warm prefetch) | **< 50ms** p95 |
| Liveblocks mutates per challenge open | **0** (down from 1) |
| Correct-answer award correctness | **100%** — no duplicate wood |

---

## Out of scope (Tier 2+)

- Collapse Supabase expire + select + insert into one RPC
- Fire-and-forget `markChallengeAwarded` after Liveblocks award
- Move challenge tokens into Liveblocks map (remove Supabase on hot path)
- Mastery evidence queue / session-end compile (Phase 6)
- API route cold-start warming
- Split question bank into client-safe vs server-only modules

---

## Approval checklist

- [ ] Product: acceptable to show question before server confirms (Submit still gated)
- [ ] Product: acceptable prefetch creating short-lived unused challenge rows
- [ ] Engineering: ship 1.1 as standalone PR or combined with 1.2/1.3
- [ ] QA: two-browser manual pass scheduled post-merge

---

## References

- `web/app/api/live-game/challenge/route.ts` — hot path mutate
- `web/lib/live-game/hooks/useLiveGameWoodChallenge.ts` — client gate on fetch
- `web/lib/live-game/server/read-storage.ts` — `isResourceNodeAvailable`
- `web/lib/live-game/modes/english-craft/questions-v1.ts` — deterministic `pickMcQuestionForNode`
- `web/docs/live-game/phase-2-plan.md` — original challenge design
- `web/docs/live-game/architecture.md` — security model (one-time tokens, server grade)
