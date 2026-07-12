# Live Game — Phase 4A Plan (Map, Schema & Art Foundation)

**Status:** Implemented ✅  
**Prepared:** 2026-07-12  
**Branch:** `codex/english-craft-stabilization` (or follow-on)  
**Depends on:** Phase 3 complete ✅ · Phase 4 overview — [phase-4-plan.md](./phase-4-plan.md)  
**Delivers:** Water-bordered island map, dock scaffold, expanded Liveblocks schema, hammer/boat art registry — **no new craft recipes or win condition yet**

---

## Approval summary

Phase 4A is **step 1 of 7** in the Phase 4 milestone loop. It lays the foundation so 4B–4E can ship recipes, hunger, and boat escape without rework.

New art is on disk:

| Asset | Path | Used in 4A |
| --- | --- | --- |
| `hammer.png` | `public/assets/Live Games Art Assets/` | Registry + HUD icon stub |
| `boat.png` | same | Registry + dock render when `boat: true` (dev toggle only) |
| `backpack.png` | same | Registry only — **inventory HUD in 4D** |

| | |
| --- | --- |
| **Effort estimate** | 1 focused implementation session |
| **Risk** | Low–medium — schema migration + map collision; gameplay loop unchanged |
| **Blocks** | 4B bench milestone, 4C hammer/boat crafts |
| **Regression guard** | Phase 3 harvest → deposit → bridge craft → flag **still works** until 4B+ deliberately changes gates |

---

## 1. Baseline after Phase 3

| Area | State |
| --- | --- |
| Map | 20×11 grass grid; grass half-tile border collision |
| River | Internal 2-row water band (rows 5–6); sky-gradient overlay |
| Structures | Storages row 10, bench row 8, bridge row 5, flag row 2 |
| `craftedItems` | `{ bridge: boolean }` |
| `unlockedObjects` | `{ river_crossing: boolean }` |
| Personal maps | `playerCarry` only |
| Bench sprite | Always `workbench.png` (rubble only after bridge craft today) |
| Win | Flag touch |

---

## 2. Goals (Phase 4A only)

1. **Water-bordered island** — perimeter water tiles (visual + collision) on N/E/W; south beach row stays playable for storages/spawns.
2. **Dock structure** — south-shore anchor for future boat sprite + boarding zone.
3. **Schema expansion** — `craftedItems` gains `benchBuilt`, `hammers`, `boat`; add `playerInventory` + `playerHunger` LiveMaps.
4. **Art registry** — register `hammer`, `boat`, `backpack`; wire boat render at dock (visible only when `boat: true`).
5. **Read helpers + hooks** — client/server can read new fields with legacy fallbacks.
6. **Reset** — round start clears all new fields to defaults.
7. **Tests** — perimeter collision, schema init/reset, art paths, legacy snapshot compatibility.

### Explicitly out of scope (4A)

| Item | Phase |
| --- | --- |
| `build_bench` / hammer / boat recipes | **4B / 4C** |
| Craft API `recipeId` | **4B** |
| Hunger decay + bread | **4D** |
| Boat boarding win | **4E** |
| Deposit letter tiles + carry scale | **4G** (can parallel) |
| Remove bridge/flag win | **4E / 4F** |
| `backpack.png` in UI | **4D** |

---

## 3. Locked map rules (4A)

### 3.1 Perimeter water ring

```
 cols:  0  1  2 ... 17 18 19
row 0:  W  W  W ...  W  W  W   ← north edge (all water)
row 1:  W  .  . ...  .  .  W
  ...
row 9:  W  .  . ...  .  .  W
row 10: W  .  S  .  S  .  W   ← south beach: storages cols 2–18, edge cols water
        ↑              ↑
     west           east
```

| Rule | Value |
| --- | --- |
| Water cells | `col === 0 \|\| col === 19` (all rows); `row === 0` (all cols); `row === 10 && (col === 0 \|\| col === 19)` |
| Playable shrink | Resources cannot spawn on perimeter cells (update `map-placement-v1`) |
| Spawns | Stay row 9 cols 2/4/6/8/10/12 — unchanged |
| Internal river | **Keep** rows 5–6; collision still tied to `river_crossing` until 4E |
| Water visual | `null` grass cells + sky-gradient overlay rects (same technique as river) |
| South storages | Remain on row 10 cols 2, 6, 14, 18 — not flooded |

### 3.2 Dock placement

| Property | Value |
| --- | --- |
| Kind | New `EnglishCraftStructureKind`: `"dock"` |
| Position | col **16**, row **10** (gap between wheat storage col 14 and cotton col 18) |
| `displayWidthPx` | **120** (tune to `boat.png` aspect) |
| Boarding zone (data only in 4A) | Rect ~120×80px centered on dock — used in **4E** |
| Boat sprite | Renders at dock when `craftedItems.boat === true`; hidden otherwise |

Export `ENGLISH_CRAFT_DOCK_V1` + `ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1` from `map-objects-v1.ts` (zone constants only; detection in 4E).

### 3.3 Bench visual default (preview new loop)

| `benchBuilt` | Sprite |
| --- | --- |
| `false` (default) | `workbenchRubble` — “unbuilt bench” stump |
| `true` | `workbench` |

4A changes lobby + play bench appearance immediately. **Interact/craft rules stay Phase 3** until 4B (bridge craft still available at rubble bench — acceptable 4A quirk, fixed in 4B).

---

## 4. Schema changes

### 4.1 `LiveGameCraftedItems`

```ts
export type LiveGameCraftedItems = {
  benchBuilt: boolean;
  hammers: number;
  boat: boolean;
  /** @deprecated Removed in 4F — keep for 4A–4E transition */
  bridge: boolean;
};
```

**Initial values:** `{ benchBuilt: false, hammers: 0, boat: false, bridge: false }`

**Legacy read** (`read-crafted-items.ts`):

```ts
export function readCraftedItems(snapshot): LiveGameCraftedItems {
  const raw = snapshot?.craftedItems;
  return {
    benchBuilt: raw?.benchBuilt === true,
    hammers: Math.max(0, raw?.hammers ?? 0),
    boat: raw?.boat === true,
    bridge: raw?.bridge === true,
  };
}
```

### 4.2 `playerInventory` LiveMap

```ts
export type LiveGamePlayerInventory = {
  bread: number;
};

// Keyed by connection id (same pattern as playerCarry)
```

**Initial:** empty map; on join/reset no entry until 4D awards bread.

**Read helper:** `readPlayerInventory(snapshot, playerId)` → `{ bread: 0 }` default.

### 4.3 `playerHunger` LiveMap

```ts
export type LiveGamePlayerHunger = {
  value: number;        // 0–100
  lastUpdatedAt: number;
};
```

**Initial on reset:** `{ value: 100, lastUpdatedAt: Date.now() }` per connected player (or lazy-init on first read in 4D).

4A only **stores shape + reset** — no decay logic.

### 4.4 `unlockedObjects` (no change in 4A)

Keep `{ river_crossing: boolean }`. Add `boat_boarding` in **4E**.

### 4.5 `LiveGameStorageRoot` + snapshot

Add to `config.ts`:

```ts
playerInventory: LiveMap<string, LiveObject<LiveGamePlayerInventory>>;
playerHunger: LiveMap<string, LiveObject<LiveGamePlayerHunger>>;
```

Update `LiveGameStorageSnapshot` plain-object mirror.

---

## 5. Art registry

### 5.1 New entries (`english-craft-art.ts`)

```ts
export const ENGLISH_CRAFT_ART = {
  // ...existing...
  hammer: assetSrc("hammer.png"),
  boat: assetSrc("boat.png"),
  backpack: assetSrc("backpack.png"),
} as const;
```

### 5.2 Render rules (`EnglishCraftObjectsLayer`)

| Object | Condition | Sprite |
| --- | --- | --- |
| Workbench | `!benchBuilt` | `workbenchRubble` |
| Workbench | `benchBuilt` | `workbench` |
| Dock | always | No sprite in 4A (empty tile) OR subtle dock marker if art added later |
| Boat | `boat === true` | `boat` at dock coords |
| Bridge / flag | unchanged | Still render (removed in 4F) |

Pass `craftedItems` snapshot into `EnglishCraftObjectsLayer` (new prop alongside `bridgeCrafted` — migrate to `craftedItems` object in 4A).

### 5.3 HUD stubs (optional in 4A)

Add read-only **Hammers: 0/5** chip in `LiveGameTeamResourceHud` when `benchBuilt` — greyed/disabled until 4C. **Optional:** skip HUD in 4A to minimize scope; registry + hooks sufficient.

**Recommendation:** Include minimal hammer chip (count only, no craft affordance) — validates schema wiring.

---

## 6. Files to change

### New files

| File | Purpose |
| --- | --- |
| `web/lib/live-game/server/read-crafted-items.ts` | Legacy-safe `readCraftedItems()` |
| `web/lib/live-game/server/read-player-inventory.ts` | `readPlayerInventory()` |
| `web/lib/live-game/server/read-player-hunger.ts` | `readPlayerHunger()` |
| `web/lib/live-game/hooks/useLiveGameCraftedItems.ts` | Client selector |
| `web/lib/live-game/hooks/useLiveGamePlayerInventory.ts` | Client selector |
| `web/lib/live-game/hooks/useLiveGamePlayerHunger.ts` | Client selector |
| `web/lib/live-game/english-craft-phase-4a.test.ts` | 4A tests |
| `web/docs/live-game/phase-4a-plan.md` | This document |

### Modified files

| File | Change |
| --- | --- |
| `tilemap-v1.ts` | `isPerimeterWaterCell()`; null perimeter cells in `buildCells()`; export `ENGLISH_CRAFT_PERIMETER_WATER_BOUNDS` |
| `map-v1.ts` | Perimeter water collision rects; export count constant |
| `map-placement-v1.ts` | Block perimeter water cells from resource spread |
| `map-objects-v1.ts` | `dock` kind; dock structure; boarding zone constants |
| `EnglishCraftMapLayer.tsx` | Perimeter water overlay(s) |
| `english-craft-art.ts` | hammer, boat, backpack |
| `english-craft-art.test.ts` | New asset paths resolve |
| `liveblocks/config.ts` | Types for craftedItems, inventory, hunger |
| `liveblocks/initial-storage.ts` | Initialize new fields + maps |
| `liveblocks/gameplay-reset.ts` | Reset benchBuilt/hammers/boat + clear inventory/hunger |
| `EnglishCraftObjectsLayer.tsx` | `craftedItems` prop; bench + boat sprites |
| `LiveGameMapStatic.tsx` / `LiveGameMapStage.tsx` | Thread `craftedItems` |
| `LiveGameCanvas.tsx` | `useLiveGameCraftedItems()` → map layer |
| `read-storage.ts` | Use `readCraftedItems` where needed |

### Unchanged (explicit)

| File | Reason |
| --- | --- |
| `award-craft-bridge.ts` | 4B generalizes |
| `craft/challenge/route.ts` | 4B |
| `LiveGameCanvas` interact / win logic | 4B–4E |
| `useLiveGameFlagTouch.ts` | 4E |

---

## 7. Implementation order

```
1. config.ts types + read-crafted-items.ts (+ inventory/hunger readers)
2. initial-storage.ts + gameplay-reset.ts
3. tilemap-v1.ts perimeter water + map-v1.ts collision
4. map-placement-v1.ts block perimeter cells
5. english-craft-art.ts + art test (hammer, boat, backpack)
6. map-objects-v1.ts dock + boarding zone constants
7. EnglishCraftMapLayer.tsx perimeter overlays
8. EnglishCraftObjectsLayer + map stage props (bench rubble default, boat at dock)
9. Hooks (useLiveGameCraftedItems, inventory, hunger)
10. LiveGameCanvas wiring
11. english-craft-phase-4a.test.ts + full lib/live-game suite
12. README link; mark phase-4a-plan implemented when done
```

---

## 8. Tests (`english-craft-phase-4a.test.ts`)

| Test | Asserts |
| --- | --- |
| Perimeter water cells | cols 0/19 and row 0 are null in tilemap |
| Perimeter collision | `getEnglishCraftCollisionRects(false)` includes perimeter rects |
| Collision count | Perimeter adds expected rect count vs Phase 3 baseline |
| Resource placement | No node spawns on perimeter water cells |
| Initial storage | `benchBuilt: false`, `hammers: 0`, `boat: false`; empty inventory/hunger maps |
| Reset | After reset, hammers 0, boat false, inventory cleared |
| Legacy craftedItems | `{ bridge: true }` only snapshot → `benchBuilt: false`, `hammers: 0`, `boat: false`, `bridge: true` |
| Art registry | `hammer`, `boat`, `backpack` URLs under Live Games asset folder |
| Dock constants | `ENGLISH_CRAFT_DOCK_V1` at col 16 row 10 |

**Target:** all existing `lib/live-game` tests pass + new 4A tests.

---

## 9. Manual smoke (4A)

| Step | Expected |
| --- | --- |
| 1. Open lobby map | Island surrounded by water on N/E/W; south beach intact |
| 2. Start game | Bench shows **rubble** (unbuilt); no boat at dock |
| 3. Harvest + deposit | Unchanged Phase 3 loop |
| 4. Bridge craft + flag | Still wins (temporary until 4E) |
| 5. Dev: set `boat: true` in storage | Boat sprite appears at dock |
| 6. Play again | `benchBuilt`, hammers, boat reset; bench rubble returns |

---

## 10. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| South row 10 partially water breaks storages | Only cols 0 + 19 on row 10 are water |
| Resource count drops (smaller playable area) | Perimeter was never spawnable; verify spread still finds 20 cells |
| Bench rubble blocks bridge craft feel | 4B immediately follows; bridge gate removed there |
| Schema break on live rooms | Legacy readers default missing fields |
| No dock art | Dock is logic-only zone in 4A; boat sprite sufficient preview |
| `bridgeCrafted` prop duplication | 4A threads `craftedItems`; deprecate `bridgeCrafted` boolean prop in 4F |

---

## 11. What comes next

| Phase | Delivers |
| --- | --- |
| **4B** | `build_bench` recipe (10 wood + 5 stone); recipe engine; bench activates |
| **4C** | Hammer + boat crafts; hammer HUD; boat at dock via gameplay |
| **4D** | Hunger + bread + `backpack` HUD icon |
| **4E** | Boat boarding win; deprecate flag |
| **4G** | Spell tiles + bigger carry (can ship anytime) |

---

## 12. Approval checklist

| # | Decision | Proposed default | Approved? |
| --- | --- | --- | --- |
| 1 | Phase 4A scope: map + schema + art only | Yes | ☐ |
| 2 | Perimeter water on N/E/W + south corners | Yes | ☐ |
| 3 | Dock at col 16 row 10 | Yes | ☐ |
| 4 | `craftedItems`: benchBuilt, hammers, boat (+ bridge deprecated) | Yes | ☐ |
| 5 | Add playerInventory + playerHunger maps (shape only) | Yes | ☐ |
| 6 | Register hammer.png, boat.png, backpack.png | Yes | ☐ |
| 7 | Bench defaults to rubble until benchBuilt | Yes | ☐ |
| 8 | Phase 3 bridge/flag win still works in 4A | Yes | ☐ |
| 9 | Minimal hammer HUD chip in 4A | Optional — **include** | ☐ |

---

**Submitted for approval.** Reply with dock position or perimeter tweaks, or **approved** to begin Phase 4A implementation.
