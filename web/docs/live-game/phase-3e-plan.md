# Live Game — Phase 3E Plan (HUD & Storage Fill Visuals)

**Status:** Implemented ✅  
**Prepared:** 2026-07-12  
**Branch:** `codex/english-craft-stabilization`  
**Depends on:** Phase 3D ✅ (deposit → pool loop complete)  
**Delivers:** Four-resource team HUD, live storage fill sprites, carry status chip — **no craft-gate or victory logic change**

---

## Approval summary

Phase 3E is the **display layer** for the multi-resource economy. Students and teachers see all four team pool counts, storage buildings fill up as resources are deposited, and a small carry indicator confirms who is hauling what. Gameplay rules (craft still requires 10 wood only until 3F) stay unchanged.

| | |
| --- | --- |
| **Effort estimate** | 1 focused implementation session |
| **Risk** | Low — mostly client render; pool data already in Storage |
| **Blocks** | Phase 3F (multi-resource craft gate uses same goal constants) |
| **Regression guard** | Bridge craft + flag win loop must still work with wood-only gate |

---

## 1. Baseline after Phase 3D

| Area | State |
| --- | --- |
| Pool | All four keys increment via deposit; wood HUD shows wood only |
| Storages | Always render **empty** sprite in `EnglishCraftObjectsLayer` |
| HUD | `LiveGameTeamHud` — single wood bar (`wood / 10`) |
| Hooks | `useLiveGameFullResourcePool()` exists; `useLiveGameResourcePool()` wood shorthand |
| Helpers | `resolveStorageFillLevel()` + `resolveStorageArt()` implemented and tested |
| Goals | `ENGLISH_CRAFT_RESOURCE_GOALS` defined (wood 10, others 5) — display only in 3E |
| Craft gate | `canStartCraftChallenge` + client `canCraft` — **wood ≥ 10 only** |
| Carry | Avatar overlay works; no HUD chip |
| Interact hint | Footer still says *"Press E near a tree"* |

---

## 2. Goals

1. Replace wood-only HUD with a **four-resource team panel** (icon + count + goal per type).
2. Pass live **pool counts** into `EnglishCraftObjectsLayer` so storages show empty / half / full sprites.
3. Add a **carry status chip** when the local player is carrying (resource icon + label).
4. Update **`useLiveGameResourcePool()`** to return full pool (breaking change acceptable — update all call sites in same PR).
5. Refresh copy in interact footer and play subtitle to reflect multi-resource loop (craft gate wording stays wood-only until 3F).

---

## 3. Explicitly out of scope (Phase 3E)

| Item | Phase |
| --- | --- |
| Multi-resource craft requirements | **3F** |
| Deduct stone/wheat/cotton on craft | **3F** |
| Victory overlay stats beyond trees | **3F** |
| Lobby “how to play” full rewrite | **3F** (minor 3E copy tweak OK) |
| Workbench rubble after craft | **3F** (optional) |
| Coins / shop | Phase 4 |
| Host-side resource dashboard | Not in pilot |
| Per-player deposit counts | Team pool only |

---

## 4. Locked rules (visuals)

| Rule | Value |
| --- | --- |
| HUD data source | Liveblocks `resourcePool` via `useLiveGameFullResourcePool()` |
| Goal display | `ENGLISH_CRAFT_RESOURCE_GOALS` — wood 10, stone/wheat/cotton 5 each |
| Storage fill | `resolveStorageFillLevel(pool[type], ENGLISH_CRAFT_STORAGE_FILL_THRESHOLDS)` |
| Fill thresholds | empty = 0, half = 1–4, full = ≥ 5 |
| Storage sprite | `resolveStorageArt(resourceType, level)` per structure `resourceType` |
| Lobby storages | Stay **empty** (no pool in lobby phase — unchanged) |
| Carry chip | Visible only when `useLiveGameSelfCarry()` non-null |
| Craft prompt | Still appears at wood ≥ 10 (3F changes requirement) |
| HUD placement | Top-right play header (replaces current `LiveGameTeamHud` slot) |

---

## 5. UI design

### 5.1 Four-resource team HUD

Replace `LiveGameTeamHud` wood card with **`LiveGameTeamResourceHud`**:

```
┌ Team resources ──────────────┐
│ 🪵 7/10  🪨 2/5              │
│ 🌾 4/5   ☁️ 0/5              │
└──────────────────────────────┘
```

| Element | Spec |
| --- | --- |
| Layout | 2×2 grid on narrow screens; single row of four on `sm+` if space allows |
| Each cell | Resource icon (24px), `{count} / {goal}` bold, thin progress bar |
| Progress | `min(100%, count / goal * 100)` — can exceed 100% visually capped |
| Wood emphasis | Optional subtle border when `wood >= ENGLISH_CRAFT_WOOD_GOAL` (craft-ready hint) |
| A11y | `aria-label` per resource: *"Team wood: 7 of 10"* |

Keep **`LiveGameInteractPrompt`** in same file (`LiveGameWoodHud.tsx` rename optional → `LiveGamePlayHud.tsx`).

### 5.2 Carry chip

Small pill below or beside resource HUD when carrying:

| `resourceType` | Label |
| --- | --- |
| `wood` | Carrying wood |
| `stone` | Carrying stone |
| `wheat` | Carrying wheat |
| `cotton` | Carrying cotton |

Uses `resolveCarryArt(resourceType)` icon (16px). Hidden when not carrying.

### 5.3 Storage fill on map

`EnglishCraftObjectsLayer` gains optional prop:

```ts
resourcePool?: LiveGameResourcePool; // defaults to all zeros
```

For each storage structure (`log_storage`, `stone_storage`, etc.):

```ts
const count = resourcePool[structure.resourceType] ?? 0;
const level = resolveStorageFillLevel(count);
const src = resolveStorageArt(structure.resourceType, level);
```

Non-storage structures (bridge, flag, workbench) unchanged.

### 5.4 Copy updates (3E only)

| Location | New copy |
| --- | --- |
| `LiveGameInteractPrompt` helper | *"Press E near a resource or storage"* |
| `LiveGameCanvas` subtitle (not carrying, pre-craft) | *"Gather and deposit resources — 10 wood to craft the bridge"* |
| Student lobby step 1 (optional minor) | *"Gather resources and deposit them at storage"* — full rewrite in 3F |

---

## 6. Client wiring

### 6.1 Data flow

```
useLiveGameFullResourcePool()
  ├─ LiveGameCanvas → LiveGameTeamResourceHud + carry chip
  └─ useLiveGameMapStaticProps(..., resourcePool)
        └─ EnglishCraftObjectsLayer → storage sprites
```

### 6.2 Hook change

**`useLiveGameResourcePool()`** — change return type from `number` to `LiveGameResourcePool`:

```ts
export function useLiveGameResourcePool() {
  return useStorage((root) => readResourcePool(readSnapshot(root)));
}
```

Remove separate `useLiveGameFullResourcePool` **or** make it an alias to avoid duplicate hooks. Prefer **one hook** `useLiveGameResourcePool()` returning full pool.

Update call sites:

| File | Change |
| --- | --- |
| `LiveGameCanvas.tsx` | `const pool = useLiveGameResourcePool()`; pass to HUD + map props |
| Any other wood shorthand consumers | Grep and update |

### 6.3 Map stage / static props

| File | Change |
| --- | --- |
| `useLiveGameMapStaticProps` | Add `resourcePool` param |
| `LiveGameMapStatic.tsx` | Pass `resourcePool` to `EnglishCraftObjectsLayer` |
| `useLiveGameMapStage` | Accept `resourcePool`; thread through `mapStaticProps` |
| `LiveGameMapStage` | No visual change (pool comes from parent `LiveGameCanvas`) |

Lobby map path (`LiveGameLobbyCanvas`) passes **zero pool** — storages stay empty.

---

## 7. File change list

### New files

| File | Purpose |
| --- | --- |
| `web/components/live-game/LiveGameTeamResourceHud.tsx` | Four-resource HUD + carry chip (or inline in renamed hud file) |
| `web/lib/live-game/english-craft-phase-3e.test.ts` | Fill wiring + HUD helper tests |
| `web/docs/live-game/phase-3e-plan.md` | This document |

### Modified files

| File | Change |
| --- | --- |
| `web/components/live-game/LiveGameWoodHud.tsx` | Interact copy; re-export or replace team HUD |
| `web/components/live-game/LiveGameCanvas.tsx` | Full pool HUD; pass pool to map stage |
| `web/components/live-game/EnglishCraftObjectsLayer.tsx` | Storage fill from pool |
| `web/components/live-game/LiveGameMapStatic.tsx` | `resourcePool` prop |
| `web/lib/live-game/hooks/useLiveGameGameplay.ts` | Unify resource pool hook |
| `web/docs/live-game/README.md` | Link Phase 3E plan |

### Unchanged (explicit)

| File | Reason |
| --- | --- |
| `read-storage.ts` `canStartCraftChallenge` | 3F |
| `award-craft-bridge.ts` | 3F |
| `LiveGameVictoryOverlay.tsx` | 3F |
| Deposit / harvest API routes | Done in 3C/3D |

---

## 8. Tests

### `english-craft-phase-3e.test.ts`

| Test | Asserts |
| --- | --- |
| Storage fill mapping | Pool `{ wood: 0 }` → empty; `{ wood: 3 }` → half; `{ wood: 5 }` → full |
| Per-type fill | Stone/wheat/cotton each map correctly |
| `structureArt` replacement | Helper picks level from pool count for storage kinds |
| Goals constants | `ENGLISH_CRAFT_RESOURCE_GOALS` matches HUD display expectations |

### `english-craft-art.test.ts`

- Existing `resolveStorageArt` tests remain passing.

### Regression

- Full `lib/live-game` suite passes.
- Manual: deposit wood → log storage goes half → full; HUD counts update live.

---

## 9. Manual smoke (3E)

| Step | Expected |
| --- | --- |
| 1. Start game | HUD shows four resources at 0 / goal |
| 2. Deposit 1 wood | Wood 1/10; log storage **half** sprite |
| 3. Deposit 4 more wood | Wood 5/10; log storage **full** sprite |
| 4. Deposit stone | Stone row updates; stone shed fill changes |
| 5. Harvest + carry | Carry chip appears; HUD unchanged until deposit |
| 6. Wood reaches 10 | Craft bench prompt still appears (3F not required yet) |
| 7. Lobby | Storages still empty on lobby map |

---

## 10. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| HUD clutter on small phones | 2×2 grid; compact typography |
| Stale storage sprites | Pool from Liveblocks Storage (same source as HUD) |
| Hook rename breaks callers | Grep all `useLiveGameResourcePool` / `useLiveGameFullResourcePool` in same PR |
| Students confused by stone goals before 3F craft | Subtitle clarifies *"10 wood to craft"*; 3F completes messaging |

---

## 11. Implementation order

```
1. Unify useLiveGameResourcePool → full pool; update call sites
2. EnglishCraftObjectsLayer + MapStatic + map stage props (storage fill)
3. LiveGameTeamResourceHud + carry chip
4. LiveGameCanvas wiring + copy tweaks
5. english-craft-phase-3e.test.ts + full suite
6. README; mark phase-3e-plan implemented when done
```

---

## 12. What comes next

| Phase | Delivers |
| --- | --- |
| **3F** | Craft requires all four resources; deduct on craft; victory + lobby copy |

---

## 13. Approval checklist

| # | Decision | Proposed default | Approved? |
| --- | --- | --- | --- |
| 1 | Phase 3E scope: visuals only; craft gate unchanged | Yes | ☐ |
| 2 | Four-resource HUD with goal progress bars | Yes | ☐ |
| 3 | Storage fill from live pool counts (empty/half/full) | Yes | ☐ |
| 4 | Carry status chip when local player is carrying | Yes | ☐ |
| 5 | Unify `useLiveGameResourcePool()` to return full pool | Yes | ☐ |
| 6 | Fill thresholds: half≥1, full≥5 (existing constants) | Yes | ☐ |
| 7 | Lobby storages stay empty (no pool in lobby) | Yes | ☐ |
| 8 | Update interact footer copy to multi-resource | Yes | ☐ |

---

**Submitted for approval.** Reply with changes or **approved** to begin Phase 3E implementation.
