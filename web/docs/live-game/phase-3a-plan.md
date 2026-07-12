# Live Game — Phase 3A Plan (Content, Assets & Map Scaffold)

**Status:** Implemented (2026-07-12)  
**Prepared:** 2026-07-12  
**Branch:** `codex/english-craft-stabilization`  
**Parent plan:** Phase 3 — Harvest → Carry → Spell → Store loop  
**Delivers:** Question bank ingestion, full art wiring, map object placements, static render — **no gameplay logic**

---

## Approval summary

Phase 3A lays the **content and visual foundation** for the multi-resource English Craft loop. It does not change harvest, carry, deposit, or pool mechanics. After 3A, a teacher can host a session, see all four resource types and four storage buildings on the map, and select the Grade 5–6 Adjectives question set — but the existing v0.1 wood-only gameplay remains until Phase 3B–3D.

| | |
| --- | --- |
| **Effort estimate** | 1 focused implementation session |
| **Risk** | Low — mostly additive files and render-only changes |
| **Blocks** | Phase 3B (schema), 3C (harvest), 3D (deposit spell) |
| **Does not block** | Current v0.1 pilot (wood → bridge → flag still works) |

---

## 1. Goals

1. Convert `Grade 56 adjectives 60 question bank.docx` into a typed, server-held question set usable by existing challenge APIs (harvest MC unchanged for now).
2. Register **Grade 5–6 Adjectives** as a host-selectable question set (and set as default for new sessions).
3. Wire all 29 Live Games art assets through a single art registry.
4. Place wood, stone, wheat, and cotton harvest nodes plus four storage buildings on the map.
5. Render every object on the playfield and in the lobby — static visuals only.

---

## 2. Explicitly out of scope (Phase 3A)

| Item | Phase |
| --- | --- |
| `playerCarry` Storage / carry sprite on avatar | 3B |
| Harvest → carry (no instant pool change) | 3C |
| Deposit + spell modal at storage | 3D |
| Four-resource team HUD / craft thresholds | 3E |
| Asset rename / move to `english-craft-v1/` subfolder | Optional follow-up |
| Docx import script in CI | One-time conversion only |
| Mastery evidence logging | Phase 6 |

---

## 3. Question bank conversion

### 3.1 Source

| Property | Value |
| --- | --- |
| File | `Grade 56 adjectives 60 question bank.docx` (repo root) |
| Items | 60 multiple-choice questions |
| Answer key | Appended at end of docx (60 letters, all validated) |
| Level | Grade 5–6 / A2 adjectives |

### 3.2 Target schema

Extend the server-only MC question type for adjective sets:

```ts
/** Server-only fields beyond existing EnglishCraftMcQuestion */
type EnglishCraftAdjectiveQuestion = EnglishCraftMcQuestion & {
  targetWord: string;       // adjective to spell at storage (Phase 3D)
  spellHint: string;        // short definition shown at deposit ("very big")
};
```

`targetWord` and `spellHint` are **stored in 3A** but **not sent to the client** until Phase 3D. Harvest MC in 3A uses `prompt` + `options` only (same as today).

### 3.3 Extraction rules

Each docx item follows one of two patterns:

**Pattern A — explicit meaning question**
```
We went to an enormous science museum. The word enormous means:
a) small  b) exciting  c) very big  d) colorful
```
- `targetWord` = `enormous`
- `spellHint` = text of correct option (`very big`)

**Pattern B — blank in sentence**
```
The chair has a soft seat and supports my back. It is very ______.
a) crowded  b) comfortable  c) ancient  d) nervous
```
- `targetWord` = correct option (`comfortable`)
- `spellHint` = derived from prompt context or correct option label

**Pattern C — pronoun referent**
```
Mia found a tiny insect on the leaf. The word tiny means:
```
Same as Pattern A.

### 3.4 Output files

| File | Purpose |
| --- | --- |
| `web/lib/live-game/modes/english-craft/grade56-adjectives-v1.ts` | 60 questions + craft sentence (server-only) |
| `web/scripts/convert-grade56-adjectives-docx.mjs` | One-time conversion script (reads docx, writes TS) |

Question IDs: `adj-001` … `adj-060` (stable, ordered as in docx).

### 3.5 Craft sentence (bridge)

Add one drag-sentence craft question for the adjective set (required by existing `question-sets.ts` contract):

```
Prompt:  Put the sentence in order to build the bridge:
Bank:    The / enormous / museum / was / very / interesting
Correct: The enormous museum was very interesting
```

Uses adjective vocabulary from the same bank; validated in unit tests.

### 3.6 Question set registration

| Field | Value |
| --- | --- |
| `id` | `grade56-adjectives` |
| `version` | `1` |
| `title` | Grade 5–6 Adjectives |
| `level` | `A2` |
| `topic` | Adjectives |
| `learningObjective` | Understand adjective meanings in context and spell target words. |
| `questionCount` | `61` (60 MC + 1 craft) |
| **Default** | **Yes** — `DEFAULT_LIVE_GAME_QUESTION_SET_ID` becomes `grade56-adjectives` |

Existing A1 sets (`daily-routines-a1`, `school-life-a1`, `describing-places-a1`) remain selectable; unchanged.

### 3.7 Conversion validation (automated)

New test file: `web/lib/live-game/grade56-adjectives.test.ts`

| Assertion | |
| --- | --- |
| Exactly 60 unique `targetWord` values | |
| Every `correctAnswer` is one of `options` | |
| No duplicate question `id` | |
| Answer key cross-check (all 60 match docx key) | |
| `spellHint` non-empty for every item | |
| `toClientMcQuestion()` omits `targetWord`, `spellHint`, `correctAnswer` | |
| Craft sentence validates via `isQuestionSetCraftAnswerCorrect` | |

---

## 4. Art asset registry

### 4.1 Approach

Keep assets at current path (`/assets/Live Games Art Assets/`) for 3A. Reference via `encodeURIComponent` in `english-craft-art.ts` (existing pattern). No file moves in this phase.

### 4.2 Full asset map

Extend `ENGLISH_CRAFT_ART` in `english-craft-art.ts`:

| Key | Source file | Used for |
| --- | --- | --- |
| `tree` | `tree.png` | Wood node (available) |
| `stump` | `stump.png` | Wood node (cooldown) |
| `logs` | `logs.png` | Carry overlay (wired in 3C; path defined in 3A) |
| `stoneFull` | `stone_full.png` | Stone node (available) |
| `stoneDepleted` | `stone_depleated.png` | Stone node (cooldown) |
| `stoneResource` | `stone_resource.png` | Carry overlay |
| `wheatGrown` | `wheat_grown.png` | Wheat node (available) |
| `wheatHarvested` | `wheat_harvested.png` | Wheat node (cooldown) |
| `wheatResource` | `wheat_resource.png` | Carry overlay |
| `cottonGrown` | `cotton_grown.png` | Cotton node (available) |
| `cottonHarvested` | `cotton_harvested.png` | Cotton node (cooldown) |
| `cottonResource` | `cotton_resource.png` | Carry overlay |
| `logStorageEmpty` | `log_storage_empty.png` | Wood storage |
| `logStorageHalf` | `log storage.png` | Wood storage |
| `logStorageFull` | `log storage full.png` | Wood storage |
| `stoneStorageEmpty` | `stone_storage_empty.png` | Stone storage |
| `stoneStorageHalf` | `stone_storage_half.png` | Stone storage |
| `stoneStorageFull` | `stone_storage_full.png` | Stone storage |
| `wheatStorageEmpty` | `wheat_storage_empty.png` | Wheat storage |
| `wheatStorageHalf` | `wheat_storage_half.png` | Wheat storage |
| `wheatStorageFull` | `wheat_storage_full.png` | Wheat storage |
| `cottonStorageEmpty` | `cotton_storage_empty.png` | Cotton storage |
| `cottonStorageHalf` | `cotton_storage_half.png` | Cotton storage |
| `cottonStorageFull` | `cotton_storage_full.png` | Cotton storage |
| `workbench` | `workbench.png` | Craft bench |
| `workbenchRubble` | `workbench rubble.png` | Post-craft visual (optional, 3F) |
| `bridgeBuilt` | `bridge built.png` | Bridge crafted |
| `bridgeUnbuilt` | `bridge unbuilt.png` | Bridge not crafted |
| `flag` | `flag.png` | Victory objective |

### 4.3 Storage fill helper (render-only)

```ts
type StorageFillLevel = "empty" | "half" | "full";

function resolveStorageArt(
  resourceType: "wood" | "stone" | "wheat" | "cotton",
  level: StorageFillLevel,
): string;
```

In 3A, all storages render at **`empty`**. Helper is implemented and unit-tested; gameplay passes real counts in 3E.

### 4.4 Art tests

`web/lib/live-game/english-craft-art.test.ts`:

- Every `ENGLISH_CRAFT_ART` value is a non-empty string starting with `/assets/`
- `resolveStorageArt` returns distinct URLs per level per resource type
- Node sprite resolver returns available vs depleted art per resource type

---

## 5. Map object placements

### 5.1 Map constraints

| Property | Value |
| --- | --- |
| Grid | 20 cols × 11 rows |
| Tile size | 80 px |
| Map size | 1600 × 880 px |
| River | Rows 5–6, cols 4–15 (collision until bridge crafted) |
| Spawns | Row 9, cols 2/4/6/8/10/12 (unchanged) |

### 5.2 Resource nodes (20 total)

Reuse `treeAt()` pattern; generalize to `resourceNodeAt()`:

| Type | ID prefix | Count | Placement |
| --- | --- | --- | --- |
| Wood | `tree-` | 8 | Rows 7–9, cols 3–15 (existing positions kept) |
| Stone | `stone-` | 4 | Rows 5–7, cols 2–4 (west bank) |
| Wheat | `wheat-` | 4 | Rows 7–8, cols 14–17 (east fields) |
| Cotton | `cotton-` | 4 | Rows 8–9, cols 2–5 (south-west) |

**Proposed coordinates (col, row):**

```
Wood (unchanged):     (3,7) (6,7) (9,7) (14,7) (3,8) (7,8) (11,8) (15,9)
Stone:                (2,5) (3,6) (2,7) (4,7)
Wheat:                (14,7) (16,7) (15,8) (17,8)
Cotton:               (2,8) (4,8) (3,9) (5,9)
```

Interact radius: **64 px** (unchanged from `gameplay-v1.ts`).

### 5.3 Storage buildings (4 total)

North shore row 3, spaced across cols 6–14:

| ID | Kind | Label | Col | Display width |
| --- | --- | --- | --- | --- |
| `log-storage-01` | `log_storage` | Wood pile | 6 | 84 px |
| `stone-storage-01` | `stone_storage` | Stone shed | 8 | 84 px |
| `wheat-storage-01` | `wheat_storage` | Wheat barn | 12 | 84 px |
| `cotton-storage-01` | `cotton_storage` | Cotton barn | 14 | 84 px |

**Moved from current layout:** `log-storage-01` moves from col 9 → col 6 to make room for four storages. Workbench shifts from col 11 → col 10.

### 5.4 Structures (unchanged IDs)

| ID | Kind | Col | Notes |
| --- | --- | --- | --- |
| `craft-bench-01` | `workbench` | 10 | Sentence craft (existing) |
| `bridge-01` | `bridge` | 10–11 | River crossing |
| `flag-01` | `flag` | 16 | Victory zone |

### 5.5 Type extensions in `map-objects-v1.ts`

```ts
type EnglishCraftResourceType = "wood" | "stone" | "wheat" | "cotton";

type EnglishCraftResourceNodeDef = {
  id: string;
  resourceType: EnglishCraftResourceType;
  label: string;
  col: number;
  row: number;
  x: number;
  y: number;
  interactRadius: number;
};

type EnglishCraftStructureKind =
  | "workbench" | "bridge" | "flag"
  | "log_storage" | "stone_storage" | "wheat_storage" | "cotton_storage";
```

Export lookup maps: `ENGLISH_CRAFT_RESOURCE_NODE_BY_ID`, `ENGLISH_CRAFT_STORAGE_BY_TYPE`.

### 5.6 Map placement tests

`web/lib/live-game/english-craft-map-objects.test.ts`:

- 20 resource nodes, 4 unique types, no duplicate IDs
- No node center inside river collision rects
- All storages north of river (row ≤ 4)
- All harvest nodes south of river or on south bank (row ≥ 5, excluding river cells)
- Workbench within interact distance of at least one storage

---

## 6. Rendering changes

### 6.1 `EnglishCraftObjectsLayer.tsx`

| Object | 3A render rule |
| --- | --- |
| Wood trees | Available → `tree.png`; cooldown → `stump.png` (existing logic) |
| Stone nodes | Available → `stoneFull`; cooldown → `stoneDepleted` |
| Wheat nodes | Available → `wheatGrown`; cooldown → `wheatHarvested` |
| Cotton nodes | Available → `cottonGrown`; cooldown → `cottonHarvested` |
| 4 storages | Always `*StorageEmpty` in 3A |
| Workbench / bridge / flag | Unchanged |

### 6.2 Lobby visuals

`lobby-map-v1.ts` — extend `createEnglishCraftLobbyResourceNodes()` to seed all 20 nodes (all available, no cooldown). Lobby shows full map with all resources and empty storages.

### 6.3 `initial-storage.ts` (minimal)

Add stone/wheat/cotton nodes to `createInitialResourceNodes()` so Liveblocks Storage matches map (nodes exist but only wood is harvestable via API until 3C). Node state: `available: true`, `resourceType` set per node.

> **Note:** This is schema-adjacent but required so the render layer has node state for all 20 objects. No API behavior change.

---

## 7. Host UI change

`LiveGameHostPage.tsx` — question set dropdown gains:

```
Grade 5–6 Adjectives (default)
Daily Routines (A1)
School Life (A1)
Describing Places (A1)
```

Subtitle under select shows learning objective. No other host UI changes in 3A.

---

## 8. File change list

### New files

| File | Purpose |
| --- | --- |
| `web/lib/live-game/modes/english-craft/grade56-adjectives-v1.ts` | 60 questions + craft |
| `web/scripts/convert-grade56-adjectives-docx.mjs` | Docx → TS converter |
| `web/lib/live-game/grade56-adjectives.test.ts` | Question bank validation |
| `web/lib/live-game/english-craft-art.test.ts` | Art registry validation |
| `web/lib/live-game/english-craft-map-objects.test.ts` | Placement validation |
| `web/docs/live-game/phase-3a-plan.md` | This document |

### Modified files

| File | Change |
| --- | --- |
| `question-sets-client.ts` | Add `grade56-adjectives`, new default |
| `question-sets.ts` | Import adjective deck + craft sentence |
| `english-craft-art.ts` | Full 29-asset registry + `resolveStorageArt` |
| `map-objects-v1.ts` | 20 nodes, 4 storages, generalized types |
| `EnglishCraftObjectsLayer.tsx` | Render all node types + storages |
| `lobby-map-v1.ts` | Lobby nodes for all 20 resources |
| `initial-storage.ts` | Seed all 20 resource nodes |
| `gameplay-reset.ts` | Reset all 20 nodes (uses shared factory) |
| `question-sets.test.ts` | Include new set in existing assertions |
| `web/docs/live-game/README.md` | Link Phase 3A plan |

### Unchanged (verified still works)

| File | Why |
| --- | --- |
| `challenge/route.ts` | Still validates wood tree IDs only until 3C |
| `answer/route.ts` | Still awards wood to pool until 3C |
| `LiveGameCanvas.tsx` | Still wood-only interact prompts until 3C |
| `award-wood.ts` | Unchanged until 3C |

---

## 9. Acceptance criteria

### Question bank

- [ ] Host can select **Grade 5–6 Adjectives** when creating a session
- [ ] New sessions default to `grade56-adjectives`
- [ ] Harvesting a wood tree with the new set shows an adjective MC question (via existing `/challenge` API)
- [ ] Correct answer still awards +1 wood (v0.1 behavior preserved)
- [ ] All 60 docx answers match converted `correctAnswer` fields (automated test)

### Visual / map

- [ ] Play map shows 8 trees, 4 stone, 4 wheat, 4 cotton nodes
- [ ] Play map shows 4 storage buildings (empty state) + workbench + bridge + flag
- [ ] Lobby map shows all nodes in full/available state
- [ ] Tree cooldown still shows stump; other node types show depleted sprite
- [ ] No object sprites overlap river collision in a blocking way (visual QA)
- [ ] Bridge still toggles built/unbuilt from storage state

### Regression

- [ ] All existing `lib/live-game` tests pass (64+)
- [ ] New 3A tests pass
- [ ] v0.1 manual path still works: chop wood → craft bridge → flag

### Manual smoke test (3A)

| Step | Action | Expected |
| --- | --- | --- |
| 1 | Host creates session, default question set | Shows "Grade 5–6 Adjectives" |
| 2 | Start game | Map shows all 4 resource types + 4 empty storages |
| 3 | Chop a tree (correct adjective MC) | Pool +1 wood (same as today) |
| 4 | Approach stone/wheat/cotton | No interact prompt yet (3C) |
| 5 | Craft bridge + flag | Unchanged v0.1 win path |

---

## 10. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Docx parsing errors (60 items) | Automated answer-key cross-check test; manual spot-check 5 items |
| Map clutter with 20 nodes + 4 storages | North-shore storage row; nodes grouped by biome region |
| Filenames with spaces break URLs | `encodeURIComponent` (already used) |
| Moving log storage breaks muscle memory | Only visual; interact point IDs unchanged where possible |
| `initial-storage` adds nodes but API ignores them | Documented; stone/wheat/cotton are inert until 3C |

---

## 11. Implementation order (within 3A)

```
1. convert-grade56-adjectives-docx.mjs → grade56-adjectives-v1.ts
2. grade56-adjectives.test.ts (validate before wiring)
3. question-sets-client.ts + question-sets.ts (register set)
4. english-craft-art.ts + art test
5. map-objects-v1.ts + placement test
6. initial-storage.ts + lobby-map-v1.ts + gameplay-reset.ts
7. EnglishCraftObjectsLayer.tsx (render pass)
8. LiveGameHostPage default + README link
9. Full test suite + manual smoke
```

---

## 12. Approval checklist

| # | Decision | Proposed default | Approved? |
| --- | --- | --- | --- |
| 1 | Phase 3A scope: content + static render only | Yes | ☐ |
| 2 | Default question set → `grade56-adjectives` | Yes | ☐ |
| 3 | Keep existing A1 question sets selectable | Yes | ☐ |
| 4 | Asset paths: keep `Live Games Art Assets/` (no rename) | Yes | ☐ |
| 5 | Node counts: 8 wood / 4 stone / 4 wheat / 4 cotton | Yes | ☐ |
| 6 | Storages render empty until 3E pool visuals | Yes | ☐ |
| 7 | Move log storage to col 6; workbench to col 10 | Yes | ☐ |
| 8 | Seed all 20 nodes in Liveblocks Storage (inert non-wood) | Yes | ☐ |
| 9 | `targetWord` + `spellHint` stored now, used in 3D | Yes | ☐ |

---

## 13. What comes next (after approval)

| Phase | Delivers |
| --- | --- |
| **3B** | `playerCarry`, four-resource `resourcePool`, carry Presence mirror |
| **3C** | Harvest → carry (generalized API), block non-wood harvest UI |
| **3D** | Deposit + spell modal at storage |
| **3E** | Storage fill visuals from pool counts, four-resource HUD |
| **3F** | Multi-resource craft thresholds, updated win stats |

---

**Submitted for approval.** Reply with any changes to defaults (node counts, placements, default question set, or scope boundaries) before implementation begins.
