# Live Game — Phase 4B Plan (Build Bench + Recipe Engine)

**Status:** Implemented  
**Prepared:** 2026-07-12  
**Implemented:** 2026-07-12  
**Branch:** `codex/english-craft-stabilization` (or follow-on)  
**Depends on:** Phase 4A ✅ (map, schema, hammer/boat art)  
**Delivers:** `build_bench` milestone (10 wood + 5 stone), generalized craft API with `recipeId` — **replaces legacy bridge craft at the bench**

---

## Approval summary

Phase 4B is **step 2 of 7** in the Phase 4 milestone loop. Students deposit wood and stone, then craft the **workbench itself** before any tool recipes unlock. This phase introduces the **recipe-driven craft engine** that 4C–4D will extend.

| | |
| --- | --- |
| **Effort estimate** | 1 focused implementation session |
| **Risk** | Medium — replaces working Phase 3 bridge craft; win path paused until 4E |
| **Blocks** | 4C hammer/boat recipes, 4D bread craft |
| **Regression guard** | Harvest → carry → deposit unchanged; craft receipts stay idempotent |

> **Pilot note:** After 4B, the old bridge/flag win path is **unreachable** until 4E (boat escape). That is intentional on the milestone branch — smoke test is bench activation only.

---

## 1. Baseline after Phase 4A

| Area | State |
| --- | --- |
| Bench visual | `workbenchRubble` when `benchBuilt: false` |
| Craft interact | Phase 3 gate: all four resources → **bridge craft** (sentence order) |
| `canStartCraftChallenge` | `canAffordCraftCosts` (wood 10 + stone/wheat/cotton 5) + `!bridge` |
| `award-craft-bridge.ts` | Deducts all four resources; sets `bridge` + `river_crossing` |
| Craft API | `POST /craft/challenge` + `/craft/answer` — no `recipeId` |
| Client `canCraft` | Same four-resource gate; opens `LiveGameCraftModal` |
| Hammer HUD chip | Hidden until `benchBuilt` (wired in 4A, never true yet) |
| Win | Bridge + flag (still in code, will be disconnected in 4B) |

---

## 2. Goals (Phase 4B only)

1. **`craft-recipes-v1.ts`** — recipe config with **`build_bench`** as the only recipe.
2. **`award-craft-recipe.ts`** — generalized atomic craft mutate (replaces bridge-only award for new path).
3. **Craft API** — accept `recipeId` on challenge + answer; return `craftedItems` + `poolTotal`.
4. **Gate replacement** — bench interact offers **Build workbench** when `!benchBuilt`; **no** legacy bridge craft.
5. **Client** — recipe-aware interact, subtitle, craft hook, modal title/cost display.
6. **Tests** — recipe affordance, deduction, `benchBuilt` grant, idempotent receipts.

### Explicitly out of scope (4B)

| Item | Phase |
| --- | --- |
| `craft_hammer`, `craft_boat`, `craft_bread` | **4C / 4D** |
| Hammer/boat interact after bench built | **4C** (bench idle until then) |
| Hunger decay + consume | **4D** |
| Boat boarding win | **4E** |
| Remove bridge/flag map objects | **4F** |
| Deposit letter tiles + carry scale | **4G** (parallel OK) |
| Player inventory awards | **4D** (`build_bench` uses team pool only) |

---

## 3. Locked rules — `build_bench` recipe

| Field | Value |
| --- | --- |
| `recipeId` | `"build_bench"` |
| Label | Build workbench |
| Pool cost | **10 wood + 5 stone** (wheat/cotton 0) |
| Crafted cost | — |
| Grants | `benchBuilt: true` |
| Requires | `benchBuilt: false` |
| Question | Reuse `ENGLISH_CRAFT_CRAFT_BRIDGE_V1` sentence-order challenge (pilot) |
| Challenge node | `craft-bench-01` (unchanged) |
| Carry block | Cannot craft while carrying (existing rule) |
| Repeat | One-time; `benchBuilt` blocks re-craft |

### Interact states after 4B

| `benchBuilt` | Near bench | Action |
| --- | --- | --- |
| `false` | Yes + 10 wood + 5 stone in pool | **Build workbench** → craft modal |
| `false` | Yes + short on resources | Footer shows missing wood/stone; no modal |
| `true` | Yes | **No craft** until 4C (subtitle: gather tools / stay tuned copy) |
| Either | No | Normal harvest/deposit priority |

### Subtitle copy (4B)

| State | Copy |
| --- | --- |
| `!benchBuilt`, can afford | Build the workbench at the stump — E or Interact |
| `!benchBuilt`, short | Deposit wood and stone to build the workbench |
| `benchBuilt` | Workbench ready — more crafts coming soon *(4C replaces)* |
| Carrying | *(unchanged from 3D)* |

---

## 4. Recipe engine design

### 4.1 Types (`craft-recipes-v1.ts`)

```ts
export type CraftRecipeId = "build_bench"; // 4C adds hammer, boat; 4D adds bread

export type CraftRecipePoolCost = Partial<LiveGameResourcePool>;

export type CraftRecipeGrants = {
  benchBuilt?: true;
  hammers?: number;      // 4C
  boat?: true;             // 4C
  breadToCrafter?: number; // 4D
};

export type CraftRecipeRequires = {
  benchBuilt?: true;
  benchNotBuilt?: true;
  maxHammers?: number;   // 4C
};

export type CraftRecipe = {
  id: CraftRecipeId;
  label: string;
  poolCost: CraftRecipePoolCost;
  craftedCost?: { hammers?: number };
  grants: CraftRecipeGrants;
  requires: CraftRecipeRequires;
  questionId: string; // maps to question set craft question
};

export const ENGLISH_CRAFT_BUILD_BENCH_COSTS = { wood: 10, stone: 5 } as const;
```

### 4.2 Helpers (same file)

| Helper | Purpose |
| --- | --- |
| `getCraftRecipe(id)` | Lookup recipe |
| `canAffordRecipePoolCost(pool, recipe)` | Pool has enough for `poolCost` keys |
| `missingRecipePoolResources(pool, recipe)` | Returns short resource types |
| `formatMissingRecipeResources(types, recipe)` | Human-readable 409 message |
| `canStartRecipeCraft(storage, recipeId)` | Phase + requires + afford |
| `listAvailableCraftRecipes(storage)` | For 4C menu; 4B returns `[build_bench]` or `[]` |

### 4.3 Award (`award-craft-recipe.ts`)

```ts
export type AwardCraftRecipeResult = {
  recipeId: CraftRecipeId;
  poolTotal: LiveGameResourcePool;
  craftedItems: LiveGameCraftedItems;
  alreadyAwarded: boolean;
};
```

**Mutate steps (atomic):**

1. Verify `phase === "playing"`.
2. Check `craftReceipts` for idempotency (key = `challengeId`).
3. Verify recipe requirements + pool/crafted costs.
4. Deduct `poolCost` keys from `resourcePool`.
5. Apply `grants` to `craftedItems` (4B: `benchBuilt = true`).
6. Write receipt with `recipeId`, post-craft pool snapshot, `benchBuilt`.
7. Return result.

**4B does not** set `bridge` or `river_crossing`. Legacy `award-craft-bridge.ts` stays in repo but is **no longer called** from craft answer route.

### 4.4 Receipt shape (extend `LiveGameCraftReceipt`)

```ts
export type LiveGameCraftReceipt = {
  recipeId?: CraftRecipeId;
  wood: number;
  stone?: number;
  wheat?: number;
  cotton?: number;
  benchBuilt?: boolean;
  bridgeCrafted?: boolean; // legacy receipts
};
```

---

## 5. API changes

### 5.1 `POST /api/live-game/craft/challenge`

**Request:**

```ts
{ roomId: string; recipeId: CraftRecipeId }
```

| Check | 4B behavior |
| --- | --- |
| `recipeId` required | 400 if missing/unknown |
| `canStartRecipeCraft(storage, recipeId)` | 409 with `missing` array if short |
| `isBridgeCrafted` guard | **Remove** — replaced by recipe requires |
| Proximity | Unchanged (craft bench) |
| Response | Unchanged shape + optional `recipeId` echo |

### 5.2 `POST /api/live-game/craft/answer`

**Request:**

```ts
{ roomId: string; challengeId: string; order: string[]; recipeId: CraftRecipeId }
```

| Change | Detail |
| --- | --- |
| Award | `awardCraftRecipe({ roomId, challengeId, recipeId })` |
| Response | `{ correct, poolTotal, craftedItems, alreadyAwarded }` |
| Legacy fields | Drop `bridgeCrafted` / `riverCrossingUnlocked` from new responses (client reads `craftedItems`) |

### 5.3 `read-storage.ts`

| Function | 4B change |
| --- | --- |
| `canStartCraftChallenge` | **Deprecate** → delegate to `canStartRecipeCraft(storage, "build_bench")` or remove |
| New | `canBuildBench(storage)` alias for client/server parity |

---

## 6. Client changes

### 6.1 `LiveGameCanvas.tsx`

Replace `canCraft` / four-resource gate:

```ts
const buildBenchRecipe = getCraftRecipe("build_bench");
const canBuildBench =
  !isCarrying &&
  !craftedItems.benchBuilt &&
  canAffordRecipePoolCost(pool, buildBenchRecipe);
```

| Priority | Interact |
| --- | --- |
| 1 | Deposit (carrying) |
| 2 | **Build workbench** (`canBuildBench` + near bench) |
| 3 | Harvest |

Remove bridge craft prefetch, `useLiveGameFlagTouch` enablement tied to `bridgeCrafted` — **disable flag touch** until 4E (or leave enabled but unreachable).

### 6.2 `useLiveGameCraftChallenge.ts`

| Change | Detail |
| --- | --- |
| `beginChallenge(recipeId)` | Pass `recipeId` in challenge request |
| `submitAnswer` | Include `recipeId` in answer body |
| Response parse | Read `craftedItems` from answer payload |
| Prefetch cache | Key by `recipeId` + node id |

### 6.3 `LiveGameCraftModal.tsx`

| Change | Detail |
| --- | --- |
| Props | `recipeLabel`, `costSummary` (e.g. "10 wood · 5 stone") |
| Title | "Build workbench — sentence craft" when `build_bench` |

### 6.4 HUD

| Element | 4B behavior |
| --- | --- |
| Team resources | Unchanged |
| Hammer chip | Still hidden until `benchBuilt` — **shows 0/5 after bench built** (validates 4A wiring) |
| Craft-ready highlight on resources | **Remove** four-resource craft-ready (obsolete); optional highlight when build-bench affordable |

---

## 7. File change list

### New files

| File | Purpose |
| --- | --- |
| `web/lib/live-game/modes/english-craft/craft-recipes-v1.ts` | Recipe table + afford helpers |
| `web/lib/live-game/server/award-craft-recipe.ts` | Generalized craft award |
| `web/lib/live-game/english-craft-phase-4b.test.ts` | 4B tests |
| `web/docs/live-game/phase-4b-plan.md` | This document |

### Modified files

| File | Change |
| --- | --- |
| `liveblocks/config.ts` | `CraftRecipeId` on receipt (optional) |
| `craft/challenge/route.ts` | `recipeId` param; recipe gates |
| `craft/answer/route.ts` | `awardCraftRecipe`; return `craftedItems` |
| `read-storage.ts` | Recipe-based gates; deprecate bridge craft gate |
| `LiveGameCanvas.tsx` | `canBuildBench`; interact priority; subtitles |
| `useLiveGameCraftChallenge.ts` | `recipeId` threading |
| `LiveGameCraftModal.tsx` | Recipe label + cost chips |
| `gameplay-v1.ts` | `ENGLISH_CRAFT_BUILD_BENCH_COSTS` constant |
| `english-craft-phase-2b.test.ts` | Update craft gate tests for recipe model |
| `english-craft-phase-3f.test.ts` | Replace `canStartCraftChallenge` bridge fixtures |

### Deprecated (not deleted until 4F)

| File | Action |
| --- | --- |
| `award-craft-bridge.ts` | Stop calling from craft answer; keep for reference |

---

## 8. Tests (`english-craft-phase-4b.test.ts`)

| Test | Asserts |
| --- | --- |
| `build_bench` costs | wood 10, stone 5 |
| `canAffordRecipePoolCost` | true at 10/5; false at 9 wood or 4 stone |
| `canStartRecipeCraft` | false when `benchBuilt`; false when short; true when affordable |
| `missingRecipePoolResources` | Returns `["wood"]` or `["stone"]` correctly |
| Award simulation | Pool deducts 10 wood + 5 stone; `benchBuilt` true |
| Idempotency | Second award with same `challengeId` returns `alreadyAwarded` |
| Legacy storage | `{ bridge: true }` only snapshot does not block `build_bench` read |

**Update existing tests:**

| File | Change |
| --- | --- |
| `english-craft-phase-2b.test.ts` | Replace four-resource `canStartCraftChallenge` with `canStartRecipeCraft("build_bench")` |
| `english-craft-phase-3f.test.ts` | Remove or rewrite bridge-all-resources craft gate tests |

**Target:** all `lib/live-game` tests pass.

---

## 9. Manual smoke (4B)

| Step | Expected |
| --- | --- |
| 1. Start game | Bench shows rubble; subtitle mentions building workbench |
| 2. Deposit 9 wood + 5 stone | No build prompt at bench |
| 3. Deposit 1 more wood | Build prompt appears |
| 4. Complete sentence craft | Pool −10 wood −5 stone; bench sprite → **active workbench** |
| 5. Hammer chip | Shows **Hammers 0/5** |
| 6. Near bench again | No hammer/boat craft yet (4C) |
| 7. Harvest + deposit | Still works normally |
| 8. Play again | Bench returns to rubble |

---

## 10. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| No win path until 4E | Document on milestone branch; 4B smoke is bench only |
| Breaking craft hook prefetch | Key cache by `recipeId` |
| Old clients without `recipeId` | Server requires field; single PR deploy |
| Teachers confused by no flag win | Subtitle + lobby tweak in 4C/4E |
| `award-craft-bridge` drift | Stop calling; delete in 4F |

---

## 11. Implementation order

```
1. craft-recipes-v1.ts + ENGLISH_CRAFT_BUILD_BENCH_COSTS
2. award-craft-recipe.ts (build_bench only)
3. Extend LiveGameCraftReceipt type
4. craft/challenge + craft/answer routes (recipeId)
5. read-storage recipe gates
6. useLiveGameCraftChallenge recipeId threading
7. LiveGameCanvas canBuildBench + interact + subtitles
8. LiveGameCraftModal cost/label props
9. english-craft-phase-4b.test.ts + update phase-2b/3f tests
10. Full lib/live-game suite; mark phase-4b-plan implemented
```

---

## 12. What comes next

| Phase | Delivers |
| --- | --- |
| **4C** | `craft_hammer` + `craft_boat`; remove dead bridge code paths from interact |
| **4D** | Hunger + `craft_bread` → player inventory |
| **4E** | Boat boarding win |
| **4G** | Spell tiles + bigger carry (can ship anytime) |

---

## 13. Approval checklist

| # | Decision | Proposed default | Approved? |
| --- | --- | --- | --- |
| 1 | Phase 4B scope: build_bench + recipe engine only | Yes | ☐ |
| 2 | Cost: 10 wood + 5 stone | Yes | ☐ |
| 3 | Remove legacy four-resource bridge craft at bench | Yes | ☐ |
| 4 | Reuse bridge sentence-order question for build_bench | Yes | ☐ |
| 5 | No win path until 4E (acceptable on branch) | Yes | ☐ |
| 6 | Craft API requires `recipeId` | Yes | ☐ |
| 7 | `award-craft-recipe` replaces bridge award call | Yes | ☐ |
| 8 | Hammer chip visible after bench built (0/5) | Yes | ☐ |
| 9 | Flag touch disabled until 4E | Yes | ☐ |

---

**Submitted for approval.** Reply with cost or copy tweaks, or **approved** to begin Phase 4B implementation.
