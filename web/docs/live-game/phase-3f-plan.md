# Live Game — Phase 3F Plan (Multi-Resource Craft & Victory)

**Status:** Implemented ✅  
**Prepared:** 2026-07-12  
**Branch:** `codex/english-craft-stabilization`  
**Depends on:** Phase 3E (four-resource HUD + storage fill visuals)  
**Delivers:** All-resource craft gate, pool deduction on craft, updated victory/lobby stats — **completes Phase 3 pilot loop**

---

## Approval summary

Phase 3F completes the **English Craft Phase 3 pilot**. Crafting the bridge requires the team to bank all four resource types at their goals, not just wood. The server deducts each cost atomically, victory stats reflect the full session, and teacher/student copy describes the real loop.

| | |
| --- | --- |
| **Effort estimate** | 1 focused implementation session |
| **Risk** | Medium — changes win-path gate; must stay idempotent with craft receipts |
| **Blocks** | Classroom pilot of full multi-resource loop |
| **Regression guard** | Flag touch + bridge unlock unchanged; only craft **eligibility** and **cost** expand |

---

## 1. Baseline after Phase 3E

| Area | State |
| --- | --- |
| HUD | Four resources with goals displayed |
| Storages | Fill sprites reflect pool |
| Craft gate (client) | `wood >= 10 && !bridgeCrafted` |
| Craft gate (server) | `canStartCraftChallenge` — wood ≥ 10 only |
| Craft cost | `awardCraftBridge` deducts **10 wood** only |
| Victory overlay | *Trees chopped* total only |
| Lobby copy | Wood-only instructions |
| Constants | `ENGLISH_CRAFT_RESOURCE_GOALS`: wood 10, stone/wheat/cotton 5 |
| Deprecated | `award-wood.ts` still in repo unused |

---

## 2. Goals

1. **Craft eligibility** — bench available only when **all four** pool counts meet `ENGLISH_CRAFT_RESOURCE_GOALS`.
2. **Craft cost** — successful bridge craft deducts all four costs in one `mutateStorage` transaction.
3. **Server + client parity** — `canStartCraftChallenge`, craft challenge route, and `LiveGameCanvas` use the same helper.
4. **Victory stats** — overlay shows per-resource team totals (deposited pool snapshot + harvest activity).
5. **Copy pass** — lobby, subtitles, craft error messages, and craft modal context reflect four-resource recipe.
6. **Cleanup** — remove or formally deprecate `award-wood.ts`; extend craft API responses with full `poolTotal`.

---

## 3. Explicitly out of scope (Phase 3F)

| Item | Phase |
| --- | --- |
| New craft recipes beyond bridge | Future content |
| Per-resource craft stations | Not in pilot |
| Coins on craft | Phase 4 |
| Mastery evidence / analytics export | Phase 6 |
| Change flag touch or timer rules | Out of scope |
| Change harvest/deposit mechanics | Done in 3C/3D |
| Teacher resource editor | Not in pilot |

---

## 4. Locked rules (craft & victory)

### 4.1 Craft requirements

| Resource | Goal (= cost) |
| --- | --- |
| Wood | 10 |
| Stone | 5 |
| Wheat | 5 |
| Cotton | 5 |

```ts
export const ENGLISH_CRAFT_CRAFT_COSTS = ENGLISH_CRAFT_RESOURCE_GOALS;
// wood: 10, stone: 5, wheat: 5, cotton: 5
```

| Rule | Value |
| --- | --- |
| Eligibility | `pool[type] >= CRAFT_COSTS[type]` for **every** type |
| Deduction | Subtract all four costs on successful craft (atomic) |
| Order in mutate | Verify all → deduct all → set bridge + unlock river |
| Idempotency | Existing `craftReceipts` pattern unchanged |
| Carry + craft | Still blocked while carrying (3C rule) |
| Below-cost retry | Craft challenge route returns `409` with specific missing resource |

### 4.2 Victory stats (end of round)

Display on `LiveGameVictoryOverlay`:

| Stat | Source |
| --- | --- |
| Flag touched by | `session.completedByPlayerId` (existing) |
| Team wood / stone / wheat / cotton | Final `resourcePool` at victory **or** peak deposited — use **final pool** + **total harvests** |

Proposed stats block:

```
Team resources (in storage):  wood 0  stone 0  wheat 0  cotton 0
Resources gathered (total):   wood 12  stone 6  wheat 5  cotton 5
```

| Metric | Calculation |
| --- | --- |
| **In storage** | `readResourcePool(storage)` at victory (after craft deduction) |
| **Gathered** | Sum `collectedCount` on `resourceNodes` grouped by `resourceType` |

Gathered ≥ in storage because craft consumes resources.

### 4.3 Optional polish

| Item | Default |
| --- | --- |
| Workbench → rubble after craft | **Yes** — use `ENGLISH_CRAFT_ART.workbenchRubble` when `bridgeCrafted` |
| HUD “craft ready” highlight | All four goals met (green check or pulse on bench subtitle) |

---

## 5. Server changes

### 5.1 New helper — `canAffordCraftCosts`

Add to `gameplay-v1.ts` or `resource-pool.ts`:

```ts
export function canAffordCraftCosts(
  pool: LiveGameResourcePool,
  costs = ENGLISH_CRAFT_CRAFT_COSTS,
): boolean {
  return (Object.keys(costs) as LiveGameResourceType[]).every(
    (type) => pool[type] >= costs[type],
  );
}

export function missingCraftResources(
  pool: LiveGameResourcePool,
  costs = ENGLISH_CRAFT_CRAFT_COSTS,
): LiveGameResourceType[] {
  return (Object.keys(costs) as LiveGameResourceType[]).filter(
    (type) => pool[type] < costs[type],
  );
}
```

### 5.2 `read-storage.ts`

Replace wood-only check:

```ts
export function canStartCraftChallenge(storage: LiveGameStorageSnapshot | null | undefined): boolean {
  if (!storage?.session || storage.session.phase !== "playing") return false;
  if (isBridgeCrafted(storage)) return false;
  return canAffordCraftCosts(readResourcePool(storage));
}
```

### 5.3 `award-craft-bridge.ts`

- Rename cost import: `ENGLISH_CRAFT_CRAFT_COSTS` (alias `ENGLISH_CRAFT_CRAFT_WOOD_COST` deprecated).
- Before deduct: verify all four `pool[type] >= costs[type]`.
- Deduct each key: `resourcePool.set(type, pool[type] - costs[type])`.
- Extend `LiveGameCraftReceipt` (optional) with deducted snapshot or keep wood-only field + add `poolSnapshot` — **minimal diff:** add `poolTotal` to result type only.

```ts
export type AwardCraftBridgeResult = {
  poolTotal: LiveGameResourcePool;
  bridgeCrafted: boolean;
  riverCrossingUnlocked: boolean;
  alreadyCrafted: boolean;
};
```

Deprecate top-level `wood` field in result (update craft answer route + client hook).

### 5.4 `craft/challenge/route.ts`

| Error | Message |
| --- | --- |
| Missing resources | `"Team needs more resources for the bridge."` + optional `missing: ["stone"]` in JSON for client debug |
| Specific (preferred) | `"Need more stone and cotton for the bridge."` from `missingCraftResources()` |

### 5.5 `craft/answer/route.ts`

- Return full `poolTotal` (four keys) on all response paths.
- Remove wood-only `poolTotal: { wood }` shorthand.

---

## 6. Client changes

### 6.1 `LiveGameCanvas.tsx`

```ts
const pool = useLiveGameResourcePool();
const canCraft = !isCarrying && canAffordCraftCosts(pool) && !bridgeCrafted;
```

**Subtitles:**

| State | Copy |
| --- | --- |
| Pre-craft | *"Deposit all resources, then craft the bridge at the bench"* |
| `canCraft` | *"Craft the bridge — E or Interact"* |
| Carrying | (unchanged from 3D) |

### 6.2 `LiveGameCraftModal` / craft hook

- No question change — same sentence-order challenge.
- On success, client reads full `poolTotal` from craft answer response.

### 6.3 Victory overlay

Extend `LiveGameVictoryOverlay` props:

```ts
type VictoryResourceStats = {
  pool: LiveGameResourcePool;
  gathered: Record<LiveGameResourceType, number>;
};
```

Replace *Trees chopped* with a small table of four resources (icons + gathered count + final pool).

### 6.4 Victory stats helpers — `useLiveGameVictoryStats.ts`

```ts
export function sumHarvestedByType(
  resourceNodes: Record<string, LiveGameResourceNodeState>,
): Record<LiveGameResourceType, number>;

export function buildVictoryResourceStats(
  resourceNodes: Record<string, LiveGameResourceNodeState>,
  pool: LiveGameResourcePool,
): VictoryResourceStats;
```

Keep `sumTreesChopped` as deprecated wrapper or remove after migration.

### 6.5 Lobby copy

**`LiveGameStudentLobbyPanel.tsx`** — update how-to-play:

1. Gather wood, stone, wheat, and cotton — answer questions and spell words at storage  
2. Bank **10 wood, 5 stone, 5 wheat, and 5 cotton** for the team  
3. Craft the bridge at the workbench  
4. Cross the river and touch the flag  

Host lobby / mode description (if any wood-only text) — same pass.

### 6.6 `EnglishCraftObjectsLayer`

When `bridgeCrafted`, render `workbenchRubble` instead of `workbench` (optional polish listed in §4.3).

---

## 7. Constants migration

| Old | New |
| --- | --- |
| `ENGLISH_CRAFT_CRAFT_WOOD_COST = 10` | `ENGLISH_CRAFT_CRAFT_COSTS.wood` |
| `ENGLISH_CRAFT_WOOD_GOAL = 10` | `ENGLISH_CRAFT_RESOURCE_GOALS.wood` (unchanged alias) |

Keep `ENGLISH_CRAFT_WOOD_GOAL` export for backward-compatible imports; document as alias.

---

## 8. File change list

### New files

| File | Purpose |
| --- | --- |
| `web/lib/live-game/english-craft-phase-3f.test.ts` | Craft gate, deduction, victory stats tests |
| `web/docs/live-game/phase-3f-plan.md` | This document |

### Modified files

| File | Change |
| --- | --- |
| `web/lib/live-game/modes/english-craft/gameplay-v1.ts` | `ENGLISH_CRAFT_CRAFT_COSTS`, afford helpers |
| `web/lib/live-game/server/read-storage.ts` | Multi-resource `canStartCraftChallenge` |
| `web/lib/live-game/server/award-craft-bridge.ts` | Deduct all four resources |
| `web/app/api/live-game/craft/challenge/route.ts` | Multi-resource gate + error messages |
| `web/app/api/live-game/craft/answer/route.ts` | Full `poolTotal` responses |
| `web/components/live-game/LiveGameCanvas.tsx` | `canAffordCraftCosts` client gate |
| `web/components/live-game/LiveGameVictoryOverlay.tsx` | Four-resource stats |
| `web/lib/live-game/hooks/useLiveGameVictoryStats.ts` | Harvest-by-type aggregation |
| `web/components/live-game/LiveGameStudentLobbyPanel.tsx` | How-to-play copy |
| `web/components/live-game/EnglishCraftObjectsLayer.tsx` | Workbench rubble (optional) |
| `web/lib/live-game/english-craft-phase-2b.test.ts` | Update craft gate fixtures |
| `web/docs/live-game/README.md` | Phase 3 complete milestone |

### Cleanup (same PR)

| File | Action |
| --- | --- |
| `web/lib/live-game/server/award-wood.ts` | Delete or add `@deprecated` + remove if no test imports |

---

## 9. Tests

### `english-craft-phase-3f.test.ts`

| Test | Asserts |
| --- | --- |
| `canAffordCraftCosts` | true only when all four meet goals |
| `missingCraftResources` | Returns correct types when short |
| `canStartCraftChallenge` | false when wood 10 but stone 4 |
| `sumHarvestedByType` | Groups `collectedCount` by node `resourceType` |
| Craft cost constants | `CRAFT_COSTS` equals `RESOURCE_GOALS` |

### Updates

| File | Change |
| --- | --- |
| `english-craft-phase-2b.test.ts` | Pool fixtures need four keys for craft-allowed cases |
| `english-craft-phase-3e.test.ts` | Unaffected if 3E shipped first |

**Target:** all `lib/live-game` tests pass.

---

## 10. Manual smoke (full Phase 3 loop)

| Step | Expected |
| --- | --- |
| 1. Start game | HUD 0/goal on all four |
| 2. Harvest + deposit each type | Storages fill; HUD climbs |
| 3. Wood 10, others below 5 | **No** craft prompt |
| 4. All goals met | Craft bench prompt appears |
| 5. Complete craft challenge | Bridge built; all four pool counts drop by cost; river unlocks |
| 6. Touch flag | Victory overlay shows four-resource gathered + final pool |
| 7. Play again | Reset zeros pool, nodes, carry |

---

## 11. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Craft feels grindy (25 total deposits) | Pilot tuning later; goals locked for 3F |
| Partial deduct on failed mutate | Single transaction; verify all before any deduct |
| Client shows craft ready but server rejects | Shared `canAffordCraftCosts` logic in test |
| Wood-only tests break | Update phase-2b fixtures in same PR |
| Students don't know cotton goal | Lobby + subtitle copy in 3F |

---

## 12. Implementation order

```
1. gameplay-v1.ts — CRAFT_COSTS + canAffordCraftCosts + missingCraftResources
2. read-storage.ts + award-craft-bridge.ts + tests
3. craft/challenge + craft/answer routes (full poolTotal)
4. LiveGameCanvas canCraft + subtitles
5. useLiveGameVictoryStats + VictoryOverlay
6. Lobby copy + workbench rubble (optional)
7. award-wood.ts cleanup
8. english-craft-phase-3f.test.ts + full suite
9. README — mark Phase 3 complete
```

**Recommended:** implement after 3E on the same branch.

---

## 13. Phase 3 completion criteria

After 3F, the pilot delivers:

| Loop step | Status |
| --- | --- |
| Spread-map harvest (4 types) | ✅ 3C |
| Carry + spell deposit | ✅ 3D |
| HUD + storage visuals | 3E |
| Four-resource craft + flag win | 3F |
| Grade 5–6 adjectives question set | ✅ 3A |

---

## 14. Approval checklist

| # | Decision | Proposed default | Approved? |
| --- | --- | --- | --- |
| 1 | Phase 3F scope: craft gate + cost + stats + copy | Yes | ☐ |
| 2 | Craft requires wood 10 + stone/wheat/cotton 5 each | Yes | ☐ |
| 3 | Deduct all four costs on successful craft | Yes | ☐ |
| 4 | Implement after 3E on same branch | Yes | ☐ |
| 5 | Victory overlay: gathered per type + final pool | Yes | ☐ |
| 6 | Update student lobby how-to-play | Yes | ☐ |
| 7 | Workbench rubble sprite after craft | Yes | ☐ |
| 8 | Deprecate/remove `award-wood.ts` | Yes | ☐ |
| 9 | Craft API returns full four-key `poolTotal` | Yes | ☐ |
| 10 | Bridge + flag mechanics unchanged | Yes | ☐ |

---

**Submitted for approval.** Reply with changes or **approved** to begin Phase 3E → 3F implementation.
