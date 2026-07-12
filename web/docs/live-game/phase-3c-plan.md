# Live Game — Phase 3C Plan (Harvest → Carry)

**Status:** Implemented ✅  
**Prepared:** 2026-07-12  
**Implemented:** 2026-07-12  
**Branch:** `codex/english-craft-stabilization`  
**Depends on:** Phase 3B ✅ (carry schema, pool schema, carry overlay)  
**Delivers:** Harvest MC → carry (not pool); all four node types interactable; block harvest while carrying — **no deposit / pool increment yet**

---

## Approval summary

Phase 3C flips the **harvest half** of the carry loop. A correct MC answer at any resource node grants **one carry unit** on the player (visible on avatar) instead of incrementing the team pool. Players cannot start a new harvest while already carrying.

| | |
| --- | --- |
| **Effort estimate** | 1 focused implementation session |
| **Risk** | Medium — changes core harvest path; breaks v0.1 win loop until 3D |
| **Blocks** | Phase 3D (deposit + spell → pool) |
| **Must ship with** | **3D before classroom pilot** — after 3C alone, pool never grows and bridge craft is impossible |

---

## 1. Baseline after Phase 3B

| Area | State |
| --- | --- |
| Map | 20 spread nodes + 4 south storages + workbench / bridge / flag |
| `playerCarry` | Schema + helpers exist; never set in production |
| `resourcePool` | Four keys; only `wood` increments today (via `awardWoodForNode`) |
| Harvest API | Wood trees only; `challenge/route.ts` validates `ENGLISH_CRAFT_WOOD_TREE_BY_ID` |
| Answer API | Correct MC → `awardWoodForNode` → `resourcePool.wood + 1` |
| Client | `LiveGameCanvas` wood-only interact; `useLiveGameWoodChallenge` hook |
| Carry overlay | Wired; invisible until carry is granted |
| Bridge / flag | Still gated on `resourcePool.wood >= 10` |

---

## 2. Goals

1. Replace **`awardWoodForNode`** with **`awardCarryForNode`** — correct harvest grants carry, applies node cooldown, **does not** touch pool.
2. Generalize **`/api/live-game/challenge`** to accept any `ENGLISH_CRAFT_RESOURCE_NODE_BY_ID` node (wood, stone, wheat, cotton).
3. **Block harvest** server-side when `isPlayerCarrying(storage, playerId)` is true.
4. Generalize client interact: nearest interactable node of any type; dynamic prompt labels.
5. Update answer response shape to return **`carryGranted`** (and full `poolTotal` unchanged).
6. Extend **`LiveGameAwardReceipt`** for carry idempotency (retry-safe answer submissions).
7. Carry overlay becomes visible in normal play after correct harvest.

---

## 3. Explicitly out of scope (Phase 3C)

| Item | Phase |
| --- | --- |
| Deposit at storage / spell modal | **3D** |
| Pool increment on any action | **3D** |
| Storage fill sprites from pool | **3E** |
| Four-resource team HUD | **3E** |
| Multi-resource craft thresholds | **3F** |
| Coins on harvest | Phase 4 |
| Change bridge craft recipe or flag logic | 3F (wood goal may stay 10 for now) |
| Harvest speed / movement penalty while carrying | Not in pilot |

---

## 4. Locked rules (harvest)

| Rule | Value |
| --- | --- |
| Correct MC outcome | `setPlayerCarry` with `resourceType`, `sourceNodeId`, `questionId`, `harvestedAt` |
| Wrong MC outcome | No carry; node stays available; player may retry (new challenge) |
| Max carry | 1 unit — API returns `409` if already carrying when starting harvest |
| Node cooldown | Same as today: `ENGLISH_CRAFT_TREE_COOLDOWN_MS` (30s) after successful harvest |
| Question pick | Unchanged seed: `${playerId}:${nodeId}:${collectedCount}` |
| `questionId` on carry | Stored for deposit spell in 3D — must match harvest challenge question |
| Pool on harvest | **No change** — all four keys stay as-is |
| Presence | `carriedResourceType` updates when carry granted (existing 3B hook) |
| Craft bench while carrying | **Blocked** on client (deposit first in 3D); server craft routes unchanged |
| Host / student parity | Same rules |

---

## 5. Critical dependency: 3C without 3D

After 3C ships, the v0.1 loop **breaks**:

```
Chop → carry sprite ✓ → pool stays 0 → cannot craft bridge → cannot win
```

| Mitigation | Recommendation |
| --- | --- |
| Pilot between 3C and 3D | **Do not** — keep on dev branch |
| Feature flag to keep old pool award | **No** — adds dual-path debt |
| Ship 3C + 3D back-to-back | **Yes** — approve both now; implement 3C then 3D immediately |

---

## 6. Server changes

### 6.1 New `award-carry.ts`

Replace production use of `award-wood.ts` in the harvest answer path.

```ts
export type AwardCarryResult = {
  resourceType: LiveGameResourceType;
  sourceNodeId: string;
  nodeCooldownEndsAt: number;
  alreadyAwarded: boolean;
};

export async function awardCarryForNode(input: {
  roomId: string;
  playerId: string;
  nodeId: string;
  challengeId: string;
  questionId: string;
}): Promise<AwardCarryResult | null>;
```

**Mutate order (single `mutateStorage` transaction):**

1. Idempotency: if `awardReceipts[challengeId]` exists with `awardKind: "carry"`, return prior result.
2. Reject if `readPlayerCarry` already set for `playerId` (race guard).
3. Validate node exists, cooldown elapsed, `resourceNodes[nodeId].resourceType` matches map def.
4. `setPlayerCarry` on `playerCarry` map.
5. Set node cooldown + `collectedCount + 1` (same as `awardWoodForNode`).
6. Write receipt to `awardReceipts`.

`award-wood.ts` remains in repo for reference/tests but is **no longer called** from `answer/route.ts`. Optionally delete in 3C or mark `@deprecated` until 3F cleanup.

### 6.2 Extend `LiveGameAwardReceipt`

```ts
export type LiveGameAwardReceipt = {
  awardKind: "carry" | "pool";
  resourceType: LiveGameResourceType;
  nodeCooldownEndsAt: number;
  /** Pool count after award — only for awardKind "pool" (3D deposit) */
  poolCount?: number;
};
```

**Backward compatibility:** Readers treat legacy receipts with `wood` field as `{ awardKind: "pool", resourceType: "wood", poolCount: wood, nodeCooldownEndsAt }`.

### 6.3 `challenge/route.ts` generalization

| Check | Before (3B) | After (3C) |
| --- | --- | --- |
| Node lookup | `ENGLISH_CRAFT_WOOD_TREE_BY_ID[nodeId]` | `ENGLISH_CRAFT_RESOURCE_NODE_BY_ID[nodeId]` |
| Proximity target | Wood tree def | Any resource node def |
| Cooldown message | "This tree is on cooldown." | "This resource is on cooldown." |
| Carry gate | — | `409` + `"You are already carrying something. Deposit it first."` if `isPlayerCarrying` |

Keep `refreshExpiredNodeCooldowns` call before challenge issue (existing pattern).

### 6.4 `answer/route.ts` harvest path

| Step | Change |
| --- | --- |
| Correct answer | Call `awardCarryForNode` instead of `awardWoodForNode` |
| Response (new) | See §7.1 |
| `alreadyAwarded` retry | Return `carryGranted` from receipt, not `resourceAwarded` |
| Wrong answer | Return full `poolTotal` (four keys, unchanged) |

Pass `questionId` from challenge record into `awardCarryForNode` for carry payload.

### 6.5 `read-storage.ts`

No new exports required. Existing `isResourceNodeAvailable` unchanged.

### 6.6 API types — `lib/live-game/api-types.ts` (new)

Shared client/server types:

```ts
export type LiveGamePoolTotal = LiveGameResourcePool;

export type LiveGameHarvestAnswerResponse = {
  correct: boolean;
  carryGranted: { type: LiveGameResourceType; sourceNodeId: string } | null;
  resourceAwarded: null; // deprecated path — always null after 3C
  poolTotal: LiveGamePoolTotal;
  nodeCooldownEndsAt?: number;
  alreadyAwarded?: boolean;
};
```

---

## 7. Client changes

### 7.1 Rename / generalize harvest hook

| Option | Choice |
| --- | --- |
| Rename `useLiveGameWoodChallenge` → `useLiveGameHarvestChallenge` | **Yes** — update import sites |
| Keep wood-specific alias export | Optional thin wrapper for tests |

Hook updates:

- `beginChallenge(node: EnglishCraftResourceNodeDef, …)` — any resource type
- `submitAnswer` parses `carryGranted` + full `poolTotal`
- `onAnswered` callback: `{ correct, carryGranted, poolTotal }`
- Prefetch / token flow unchanged (still `POST /api/live-game/challenge`)

### 7.2 `LiveGameCanvas.tsx` interact logic

**Interactable nodes:**

```ts
const interactableNodes = ENGLISH_CRAFT_RESOURCE_NODES_V1.filter(
  (node) => isEnglishCraftResourceNodeInteractable(resourceNodes[node.id], now),
);
```

**Priority when `useLiveGameSelfCarry()` is null (not carrying):**

1. Craft bench (if `canCraft`) — unchanged
2. Nearest harvest node

**When carrying (3C client gate only — server also enforces on challenge):**

1. No harvest prompt / no harvest prefetch
2. Craft bench hidden (cannot craft while carrying)
3. Subtitle: `"Carry to the matching storage — deposit in Phase 3D"` → after 3D approval, 3C subtitle can say `"Carry to storage and deposit"` as placeholder

**Interact labels (not carrying):**

| `resourceType` | Prompt |
| --- | --- |
| `wood` | `Chop ${label}` |
| `stone` | `Mine ${label}` |
| `wheat` | `Harvest ${label}` |
| `cotton` | `Pick ${label}` |

**Subtitle (not carrying):** `"Gather resources for the team — E or Interact"` (bridge subtitle logic unchanged but unreachable until 3D fills pool).

### 7.3 `LiveGameMcChallengeModal.tsx`

- Replace hard-coded title `"Chop tree — vocab check"` with prop `title` or derive from `resourceType`:
  - `"Gather wood — vocab check"`, `"Gather stone — vocab check"`, etc.
- Pass `resourceType` from active challenge context.

### 7.4 `EnglishCraftObjectsLayer.tsx`

No change required — cooldown / depleted sprites already keyed on `resourceNodes` state.

### 7.5 HUD

`LiveGameTeamHud` still shows wood count only (unchanged until 3E). Wood count stays **0** during 3C-only play — acceptable on dev branch.

---

## 8. File change list

### New files

| File | Purpose |
| --- | --- |
| `web/lib/live-game/server/award-carry.ts` | Harvest → carry mutation |
| `web/lib/live-game/api-types.ts` | Shared API response types |
| `web/lib/live-game/english-craft-phase-3c.test.ts` | Harvest → carry integration tests |
| `web/docs/live-game/phase-3c-plan.md` | This document |

### Modified files

| File | Change |
| --- | --- |
| `web/app/api/live-game/challenge/route.ts` | All node types + carry gate |
| `web/app/api/live-game/answer/route.ts` | `awardCarryForNode`; new response shape |
| `web/lib/live-game/liveblocks/config.ts` | Extended `LiveGameAwardReceipt` |
| `web/lib/live-game/hooks/useLiveGameWoodChallenge.ts` | Rename → `useLiveGameHarvestChallenge.ts` |
| `web/components/live-game/LiveGameCanvas.tsx` | All-node interact; block harvest when carrying |
| `web/components/live-game/LiveGameMcChallengeModal.tsx` | Dynamic title |
| `web/lib/live-game/english-craft-phase-2a.test.ts` | Update fixtures for carry responses |
| `web/docs/live-game/README.md` | Link Phase 3C plan |

### Unchanged (explicit)

| File | Reason |
| --- | --- |
| `award-wood.ts` | Deprecated; not called |
| `craft/*` routes | Bridge still wood-only; unreachable until 3D |
| `player-carry.ts` | Already has `setPlayerCarry` |
| Deposit routes | 3D |

---

## 9. Tests

### `english-craft-phase-3c.test.ts`

| Test | Asserts |
| --- | --- |
| `awardCarryForNode` sets carry + cooldown | `playerCarry[playerId]` populated; node cooldown set |
| `awardCarryForNode` does not increment pool | All pool keys unchanged |
| Idempotent retry | Second call with same `challengeId` returns `alreadyAwarded: true` |
| Carry gate | `isPlayerCarrying` → challenge route returns 409 (mocked storage) |
| Receipt backward compat | Legacy `{ wood: 3, nodeCooldownEndsAt }` parses correctly |
| Node type coverage | Stone node id accepted by `ENGLISH_CRAFT_RESOURCE_NODE_BY_ID` |

### Updates to existing tests

| File | Change |
| --- | --- |
| `english-craft-phase-2a.test.ts` | Interact tests use spread node positions (already fixed) |
| `english-craft-phase-2b.test.ts` | Pool fixtures include four keys where needed |

**Target:** all `lib/live-game` tests pass (86+).

---

## 10. Manual smoke (3C — dev branch only)

| Step | Expected |
| --- | --- |
| 1. Start game | Pool all zeros; no carry sprites |
| 2. Approach stone node | Interact prompt shows mine/harvest label |
| 3. Correct MC at stone | Carry sprite (stone) on avatar; pool still 0 |
| 4. Approach another node while carrying | No harvest prompt; challenge API 409 if forced |
| 5. Remote player view | Sees peer carry overlay via Presence |
| 6. Node cooldown | Depleted sprite ~30s; then node interactable again |
| 7. Round reset | Carry cleared; nodes refreshed |

**Not testable until 3D:** deposit, pool growth, bridge craft.

---

## 11. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Broken win loop between 3C and 3D | Do not pilot; implement 3D immediately after |
| Race: two simultaneous harvest awards | Single `mutateStorage`; carry gate inside mutation |
| Stale `awardWoodForNode` imports | Grep + CI test that answer route does not import award-wood |
| MC modal still says "Chop tree" | Dynamic title in scope |
| Legacy rooms mid-session | Receipt backward compat; pool `?? 0` readers |

---

## 12. Implementation order

```
1. api-types.ts + config.ts receipt extension
2. server/award-carry.ts + unit tests
3. challenge/route.ts — all nodes + carry gate
4. answer/route.ts — swap award path + response
5. useLiveGameHarvestChallenge (rename hook) + modal title
6. LiveGameCanvas — all-node interact + carrying gates
7. english-craft-phase-3c.test.ts + full suite
8. README; mark phase-3c-plan implemented when done
```

---

## 13. What comes next

| Phase | Delivers |
| --- | --- |
| **3D** | Walk to storage → spell `targetWord` → pool +1 → clear carry |
| **3E** | Four-resource HUD; storage fill sprites |
| **3F** | Multi-resource craft; victory stats |

---

## 14. Approval checklist

| # | Decision | Proposed default | Approved? |
| --- | --- | --- | --- |
| 1 | Phase 3C scope: harvest → carry only; no pool increment | Yes | ☐ |
| 2 | All four node types harvestable in 3C | Yes | ☐ |
| 3 | Block harvest (API + client) while carrying | Yes | ☐ |
| 4 | Do not pilot until 3D is also shipped | Yes | ☐ |
| 5 | Replace `awardWoodForNode` in answer route (deprecate old helper) | Yes | ☐ |
| 6 | Extend `LiveGameAwardReceipt` with `awardKind` + `resourceType` | Yes | ☐ |
| 7 | Rename hook to `useLiveGameHarvestChallenge` | Yes | ☐ |
| 8 | Dynamic MC modal title per resource type | Yes | ☐ |
| 9 | Block craft bench interact while carrying (client only until 3D) | Yes | ☐ |
| 10 | Same 30s node cooldown after successful harvest | Yes | ☐ |

---

**Submitted for approval.** Reply with changes or **approved** to begin Phase 3C implementation.
