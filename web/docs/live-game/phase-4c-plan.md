# Live Game — Phase 4C Plan (Hammers & Boat Recipes)

**Status:** Implemented  
**Prepared:** 2026-07-12  
**Implemented:** 2026-07-12  
**Branch:** `codex/english-craft-stabilization` (or follow-on)  
**Depends on:** Phase 4B ✅ (build bench + recipe engine)  
**Delivers:** `craft_hammer` + `craft_boat` recipes, bench recipe menu, hammer stack HUD, boat at dock — **still no win path until 4E**

---

## Approval summary

Phase 4C is **step 3 of 7** in the Phase 4 milestone loop. After the workbench is active, students craft **hammers** (repeatable) and eventually the **escape boat** (one-time, consumes 5 hammers + pool resources). The boat sprite appears at the dock; boarding win waits for 4E.

| | |
| --- | --- |
| **Effort estimate** | 1 focused implementation session |
| **Risk** | Low–medium — extends existing recipe engine; new recipe-picker UX |
| **Blocks** | 4D bread craft, 4E boat boarding win |
| **Regression guard** | `build_bench` unchanged; harvest → carry → deposit unchanged |

> **Pilot note:** After 4C, the team can build the boat but **cannot win** until 4E (all players board for 2s). Smoke test is hammer stacking + boat craft only.

---

## 1. Baseline after Phase 4B

| Area | State |
| --- | --- |
| Recipes | `build_bench` only in `craft-recipes-v1.ts` |
| Bench interact | Build workbench when `!benchBuilt`; **idle** when `benchBuilt` |
| Craft API | `recipeId` required on challenge + answer; `awardCraftRecipe` handles grants |
| `craftedItems` | `benchBuilt`, `hammers`, `boat`, legacy `bridge` |
| Hammer HUD | Shows `n/5` after `benchBuilt` (already wired in 4A) |
| Boat render | `EnglishCraftObjectsLayer` shows boat at dock when `boat: true` (4A) |
| Dock / boarding zone | `ENGLISH_CRAFT_DOCK_V1`, `ENGLISH_CRAFT_BOAT_BOARDING_ZONE_V1` exist; no detection yet |
| `unlockedObjects` | `{ river_crossing }` only — legacy |
| Win path | Flag touch disabled; no boat boarding |
| Subtitle (bench built) | "Workbench ready — more crafts coming soon" (placeholder) |
| `award-craft-bridge.ts` | Unused; kept for reference until 4F |

---

## 2. Goals (Phase 4C only)

1. **`craft_hammer`** — 2 wood + 2 stone → team `hammers +1` (repeatable until boat built).
2. **`craft_boat`** — 5 hammers + 20 wood + 10 cotton → `boat: true`, hammers −5, unlock `boat_boarding`.
3. **Recipe picker** — bench interact opens menu (Hammer / Boat) when workbench is active.
4. **Client milestone UX** — subtitles, interact labels, HUD highlights for hammer/boat costs.
5. **Tests** — hammer increment, boat deducts hammers + pool, gates, idempotent awards.

### Explicitly out of scope (4C)

| Item | Phase |
| --- | --- |
| `craft_bread`, hunger, consume API | **4D** |
| Boat boarding win, `useLiveGameBoatBoarding` | **4E** |
| Victory overlay escape stats | **4E** |
| Remove bridge/flag map objects + dead code | **4F** |
| Deposit letter tiles + carry scale | **4G** (parallel OK) |
| New question types per recipe | Reuse sentence-order craft question for pilot |
| Dock interact / "Board the boat" prompt | **4E** (boat visible at dock after 4C craft) |

---

## 3. Locked rules

### 3.1 `craft_hammer`

| Field | Value |
| --- | --- |
| `recipeId` | `"craft_hammer"` |
| Label | Craft hammer |
| Pool cost | **2 wood + 2 stone** |
| Crafted cost | — |
| Grants | `hammers: +1` |
| Requires | `benchBuilt: true`, `boatNotBuilt: true` |
| Question | Reuse `ENGLISH_CRAFT_CRAFT_QUESTION_ID` (sentence order) |
| Repeat | Yes — until boat is built |

### 3.2 `craft_boat`

| Field | Value |
| --- | --- |
| `recipeId` | `"craft_boat"` |
| Label | Craft boat |
| Pool cost | **20 wood + 10 cotton** |
| Crafted cost | **5 hammers** |
| Grants | `boat: true` |
| Requires | `benchBuilt: true`, `boatNotBuilt: true` |
| Side effect | `unlockedObjects.boat_boarding = true` |
| Question | Reuse sentence-order craft question (pilot) |
| Repeat | One-time |

### 3.3 Cost constants (`gameplay-v1.ts`)

```ts
export const ENGLISH_CRAFT_HAMMER_COSTS = { wood: 2, stone: 2 } as const;
export const ENGLISH_CRAFT_BOAT_POOL_COSTS = { wood: 20, cotton: 10 } as const;
// ENGLISH_CRAFT_BOAT_HAMMER_GOAL = 5 already exists
```

### 3.4 Interact states after 4C

| State | Near bench | Action |
| --- | --- | --- |
| `!benchBuilt` + affordable | Yes | **Build workbench** → craft modal (unchanged 4B) |
| `benchBuilt && !boat` | Yes | **Craft at workbench** → recipe picker |
| Picker: hammer affordable | — | Tap **Craft hammer** → sentence craft modal |
| Picker: boat affordable | — | Tap **Craft boat** → sentence craft modal |
| Picker: boat short hammers/resources | — | Boat row disabled with reason |
| `boat` built | Yes | No bench craft; subtitle points to dock (boarding in 4E) |
| Carrying | Yes | Deposit priority; craft blocked (existing rule) |

### 3.5 Subtitle copy (4C)

| State | Copy |
| --- | --- |
| `!benchBuilt`, can afford | Build the workbench at the stump — E or Interact |
| `!benchBuilt`, short | Deposit wood and stone to build the workbench |
| `benchBuilt && !boat`, near bench | Craft hammers or the boat at the workbench |
| `benchBuilt && !boat`, hammers < 5 | Craft hammers — need {5 − n} more for the boat |
| `benchBuilt && !boat`, hammers ≥ 5, short pool | Deposit wood and cotton to craft the boat |
| `boat` built | Boat ready at the dock — boarding coming soon *(4E replaces)* |
| Carrying | *(unchanged from 3D)* |

### 3.6 Interact button labels

| State | Label |
| --- | --- |
| Build bench (4B) | Build workbench |
| Bench active, recipes available | Craft at workbench |
| Boat built | Go to the dock |
| Default | Gather resource |

---

## 4. Recipe engine extensions

### 4.1 Types (`craft-recipes-v1.ts`)

```ts
export type CraftRecipeId = "build_bench" | "craft_hammer" | "craft_boat";

export type CraftRecipeRequires = {
  benchBuilt?: true;
  benchNotBuilt?: true;
  boatNotBuilt?: true;   // NEW — blocks crafts after boat built
  maxHammers?: number;   // unused in 4C pilot
};
```

### 4.2 New helpers

| Helper | Purpose |
| --- | --- |
| `formatRecipeFullCostSummary(recipe)` | Pool costs + crafted costs, e.g. `"5 hammers · 20 wood · 10 cotton"` |
| `missingRecipeCraftedResources(crafted, recipe)` | Returns `["hammers"]` when hammer stack too low |
| `canAffordRecipeCraftedCost(crafted, recipe)` | `crafted.hammers >= recipe.craftedCost?.hammers` |
| `listBenchCraftRecipes(storage)` | `benchBuilt && !boat` → filter `craft_hammer`, `craft_boat` by gates |
| `getDefaultBenchRecipe(storage)` | First affordable recipe for prefetch / quick interact (hammer before boat) |

Update `canStartRecipeCraft` to check `boatNotBuilt` and crafted-cost affordability (partially exists).

Update `formatMissingRecipeResources` or add combined missing message when hammers are short:

> `"Need 2 more hammers to craft the boat."`

### 4.3 Award (`award-craft-recipe.ts`)

**4C additions:**

1. On `craft_boat` grant: set `unlockedObjects.boat_boarding = true`.
2. Extend craft receipt snapshot with optional `hammers` and `boatCrafted` for idempotent replay.
3. Ensure `applyRecipeGrants` test helper mirrors boat unlock in snapshot tests.

**Hammer award steps (existing path):**

- Deduct 2 wood + 2 stone from pool.
- `craftedItems.hammers += 1`.

**Boat award steps:**

- Verify `hammers >= 5`.
- Deduct 20 wood + 10 cotton from pool.
- `craftedItems.hammers -= 5`.
- `craftedItems.boat = true`.
- `unlockedObjects.boat_boarding = true`.

### 4.4 Schema (`liveblocks/config.ts`)

```ts
export type LiveGameUnlockedObjects = {
  river_crossing: boolean;  // deprecated — unchanged in 4C
  boat_boarding?: boolean;  // NEW — true after boat craft
};

export type LiveGameCraftReceipt = {
  // ...existing fields
  hammers?: number;
  boatCrafted?: boolean;
};
```

Reset (`gameplay-reset.ts`, `initial-storage.ts`): initialize `boat_boarding: false`.

---

## 5. API changes

Routes already accept `recipeId`. **4C is mostly config + gates** — no new endpoints.

### 5.1 `POST /craft/challenge`

| Check | 4C behavior |
| --- | --- |
| `recipeId` = `craft_hammer` / `craft_boat` | Validate via `canStartRecipeCraft` |
| Hammer short for boat | 409: `"Need more hammers to craft the boat."` + `missing: ["hammers"]` |
| Pool short | 409 with `missing` resource types (existing) |
| `boat` already built | 409 for hammer/boat recipes |

### 5.2 `POST /craft/answer`

| Change | Detail |
| --- | --- |
| Award | `awardCraftRecipe` handles new recipes (no route logic change) |
| Response | `{ correct, poolTotal, craftedItems, recipeId, alreadyAwarded }` (unchanged shape) |

### 5.3 `read-storage.ts`

| Function | 4C change |
| --- | --- |
| `isBoatBoardingUnlocked(storage)` | NEW — reads `unlockedObjects.boat_boarding` |
| `canCraftAtBench(storage)` | NEW — `benchBuilt && !boat` |
| `listAvailableCraftRecipes` | Used by picker; returns hammer/boat when gated |

---

## 6. Client changes

### 6.1 New component: `LiveGameCraftRecipePicker.tsx`

Lightweight modal/sheet opened before the sentence craft modal.

```
┌ Craft at workbench ─────────────────────┐
│ Choose a recipe                          │
│                                          │
│ [Craft hammer]     2 wood · 2 stone      │  ← enabled when affordable
│ [Craft boat]       5 hammers · 20 wood…  │  ← disabled + reason when short
│                                          │
│                              [Cancel]    │
└──────────────────────────────────────────┘
```

| Prop | Detail |
| --- | --- |
| `recipes` | `CraftRecipe[]` from `listBenchCraftRecipes` or static hammer/boat defs |
| `pool`, `hammers` | For afford/disable styling |
| `onSelect(recipeId)` | Closes picker → `craftChallenge.beginChallenge(recipeId, …)` |
| `onClose` | Cancel without crafting |

Disabled row shows first missing reason (pool resource or hammer count).

### 6.2 `LiveGameCanvas.tsx`

| Change | Detail |
| --- | --- |
| `canCraftAtBench` | `benchBuilt && !boat && !isCarrying` |
| `craftBenchTarget` | True when near bench AND (`canBuildBench` OR `canCraftAtBench`) |
| `handleInteract` | If `canBuildBench` → build bench (4B). If `canCraftAtBench` → open recipe picker. |
| Prefetch | Prefetch `getDefaultBenchRecipe` (hammer if affordable, else none) |
| Subtitle / interact | Milestone copy from §3.5–3.6 |
| Boat built | Subtitle mentions dock; no bench craft |

### 6.3 `useLiveGameCraftChallenge.ts`

No structural change — already threads `recipeId`. Picker calls `beginChallenge("craft_hammer", …)` etc.

Prefetch cache already keys by `recipeId` — ensure picker selection invalidates stale cache when switching recipes.

### 6.4 `LiveGameCraftModal.tsx`

Unchanged structurally — receives `recipeLabel` + `costSummary` from hook (use `formatRecipeFullCostSummary` for boat).

### 6.5 `LiveGameWoodHud.tsx`

| Element | 4C behavior |
| --- | --- |
| Hammer chip | Live-updates as `craftedItems.hammers` changes (already wired) |
| Resource highlight | When `benchBuilt && !boat`: highlight wood/stone at hammer cost if hammer affordable; highlight wood/cotton at boat costs when `hammers >= 5` and boat affordable |
| Wheat/cotton | No craft-ready highlight for bench build (4B behavior retained for `!benchBuilt`) |

### 6.6 Lobby copy (light touch)

Update student lobby bullet 2–3 in `LiveGameStudentLobbyPanel.tsx`:

- Build workbench (10 wood + 5 stone)
- Craft hammers, then craft the boat at the workbench

Full hunger/bread copy waits for 4D.

---

## 7. File change list

### New files

| File | Purpose |
| --- | --- |
| `web/components/live-game/LiveGameCraftRecipePicker.tsx` | Bench recipe menu |
| `web/lib/live-game/english-craft-phase-4c.test.ts` | 4C tests |
| `web/docs/live-game/phase-4c-plan.md` | This document |

### Modified files

| File | Change |
| --- | --- |
| `craft-recipes-v1.ts` | `craft_hammer`, `craft_boat`, `boatNotBuilt`, cost helpers |
| `gameplay-v1.ts` | `ENGLISH_CRAFT_HAMMER_COSTS`, `ENGLISH_CRAFT_BOAT_POOL_COSTS` |
| `award-craft-recipe.ts` | Boat unlock + receipt fields |
| `liveblocks/config.ts` | `boat_boarding` on unlocked objects; receipt fields |
| `initial-storage.ts`, `gameplay-reset.ts` | `boat_boarding: false` |
| `read-storage.ts` | `isBoatBoardingUnlocked`, `canCraftAtBench` |
| `craft/challenge/route.ts` | Hammer-missing 409 message for boat |
| `LiveGameCanvas.tsx` | Picker flow, subtitles, interact, prefetch |
| `LiveGameWoodHud.tsx` | Hammer/boat cost highlights |
| `LiveGameStudentLobbyPanel.tsx` | Hammer/boat how-to-play lines |
| `english-craft-phase-4b.test.ts` | Ensure `build_bench` still passes after recipe table grows |
| `docs/live-game/README.md` | Link 4C plan |

### Unchanged (already correct)

| File | Why |
| --- | --- |
| `EnglishCraftObjectsLayer.tsx` | Boat at dock when `boat: true` |
| `craft/answer/route.ts` | Delegates to `awardCraftRecipe` |
| `LiveGameCraftModal.tsx` | Recipe-aware from 4B |

### Still deprecated (4F)

| File | Action |
| --- | --- |
| `award-craft-bridge.ts` | No calls; delete in 4F |
| Bridge / flag win paths | Remain dead until 4F cleanup |

---

## 8. Tests (`english-craft-phase-4c.test.ts`)

| Test | Asserts |
| --- | --- |
| `craft_hammer` costs | 2 wood, 2 stone |
| `craft_boat` costs | 20 wood, 10 cotton + 5 hammers crafted cost |
| Hammer afford | true at 2/2; false at 1 wood |
| Boat afford | false at 4 hammers; true at 5 hammers + pool |
| `canStartRecipeCraft("craft_hammer")` | false when `!benchBuilt`; false when `boat` built |
| `canStartRecipeCraft("craft_boat")` | false when hammers < 5; false when pool short |
| Hammer award | Pool −2 wood −2 stone; `hammers` 0 → 1 |
| Repeat hammer | Two awards → `hammers` 2 |
| Boat award | Pool −20 wood −10 cotton; `hammers` 5 → 0; `boat` true |
| Boat blocks further hammer | After boat, `craft_hammer` gate false |
| `listBenchCraftRecipes` | Returns hammer when affordable; boat when fully gated |
| `formatRecipeFullCostSummary` | Boat string includes hammers |
| Legacy bridge snapshot | `{ bridge: true }` does not block hammer craft read |

**Update existing tests:** spot-check `english-craft-phase-4b.test.ts` still green.

**Target:** all `lib/live-game` tests pass.

---

## 9. Manual smoke (4C)

| Step | Expected |
| --- | --- |
| 1. Start with bench built (or build it) | Hammer chip shows **0/5** |
| 2. Deposit 2 wood + 2 stone | Craft at workbench prompt appears |
| 3. Open picker → Craft hammer | Sentence craft → pool −2/−2; hammers **1/5** |
| 4. Repeat hammer craft 4 more times | Hammers **5/5** |
| 5. Deposit 20 wood + 10 cotton | Boat row enabled in picker |
| 6. Craft boat | Pool −20 wood −10 cotton; hammers **0/5**; **boat sprite at dock** |
| 7. Near bench again | No craft; subtitle mentions dock |
| 8. Harvest + deposit | Still works |
| 9. Play again | Bench rubble, hammers 0, no boat |

---

## 10. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Recipe picker adds UI friction | Two clear rows; default prefetch hammer; costs visible |
| Students craft boat before 5 hammers | Boat row disabled until `hammers >= 5`; server 409 |
| Extra hammers wasted after boat | Allowed in pilot; boat blocks further hammer crafts |
| No win after boat built | Subtitle + lobby say boarding coming in 4E |
| `boat_boarding` unused until 4E | Set on craft now so 4E only adds detection |
| Prefetch wrong recipe | Key cache by `recipeId`; clear on picker open |

---

## 11. Implementation order

```
1. gameplay-v1.ts constants (hammer/boat costs)
2. craft-recipes-v1.ts — craft_hammer, craft_boat, boatNotBuilt, helpers
3. config.ts + initial-storage + gameplay-reset — boat_boarding
4. award-craft-recipe.ts — boat unlock + receipt fields
5. read-storage.ts — isBoatBoardingUnlocked, canCraftAtBench
6. craft/challenge/route.ts — hammer missing 409 for boat
7. LiveGameCraftRecipePicker.tsx
8. LiveGameCanvas.tsx — picker flow, subtitles, interact, prefetch
9. LiveGameWoodHud.tsx — hammer/boat highlights
10. LiveGameStudentLobbyPanel.tsx — copy tweak
11. english-craft-phase-4c.test.ts + full lib/live-game suite
12. README link; mark phase-4c-plan implemented when done
```

---

## 12. What comes next

| Phase | Delivers |
| --- | --- |
| **4D** | Hunger decay + `craft_bread` + consume API + bread HUD |
| **4E** | `useLiveGameBoatBoarding` + boat escape win |
| **4F** | Remove bridge/flag dead code |
| **4G** | Spell tiles + bigger carry icons (can ship anytime) |

---

## 13. Approval checklist

| # | Decision | Proposed default | Approved? |
| --- | --- | --- | --- |
| 1 | Phase 4C scope: hammer + boat recipes only | Yes | ☐ |
| 2 | Hammer: 2 wood + 2 stone; repeatable until boat | Yes | ☐ |
| 3 | Boat: 5 hammers + 20 wood + 10 cotton; one-time | Yes | ☐ |
| 4 | Recipe picker at bench (not auto-craft) | Yes | ☐ |
| 5 | Reuse sentence-order question for hammer/boat | Yes | ☐ |
| 6 | Set `boat_boarding` on boat craft (prep 4E) | Yes | ☐ |
| 7 | No win path until 4E | Yes | ☐ |
| 8 | Boat visible at dock after craft; no boarding interact yet | Yes | ☐ |
| 9 | Lobby copy mentions hammers + boat | Yes | ☐ |

---

**Submitted for approval.** Reply with cost or UX tweaks, or **approved** to begin Phase 4C implementation.
