# Live Game — MVP Scope

**Status:** Revised (2026-07-11) — English Craft first mode; coins deferred to Phase 4  
**Prepared:** 2026-07-11  
**Target:** One complete vertical slice for classroom pilot (teacher + up to 5 students)  
**First mode:** English Craft (`english-craft-v1` map)

---

## 1. Product goal

Deliver a playable cooperative classroom session where students:

1. Move freely in a shared map
2. Collect resources by answering vocabulary questions
3. Earn personal coins (Gimkit-style)
4. Buy power-ups from an in-session shop
5. Craft a team item to unlock a blocked area
6. Complete a team objective together

The teacher hosts via join code and controls session start/pause/end.

---

## 2. Hybrid model (locked)

| Layer | Included in MVP |
| --- | --- |
| Cooperative world | Yes — shared pool, crafting, gate unlock |
| Gimkit economy | Yes — coins, shop, 3 power-ups |
| Competitive PvP | No |
| Turn-based board game | No — separate prototype |

---

## 3. MVP includes

### World

| Item | Spec |
| --- | --- |
| Maps | 1 (`english-craft-v1`) |
| Movement | Keyboard + on-screen D-pad (reuse explore pattern) |
| Collision | Rect-based (`explore-scene-engine.ts`) |
| Remote players | Presence sync + interpolation |
| Spawn | Fixed spawn points per joining student |

### Resources

| Item | Spec |
| --- | --- |
| Resource types in pool | 1 for Phase 2 (`wood`); schema supports 3 |
| Resource nodes | 6–12 wood trees |
| Question type | Multiple choice only |
| Question bank | 6–12 static MC questions (hardcoded; one per node) |
| Cooldown | Configurable per node (e.g. 30s) |
| Shared pool | Visible to all players in HUD |

### Economy (Gimkit layer)

| Item | Spec |
| --- | --- |
| Coins | Awarded on correct answer (e.g. 5 coins) |
| Shop | Overlay accessible during play |
| Power-ups | 3: speed boost, hint, team boost |
| Wallet | Per-student, server-mutated only |

### Crafting

| Item | Spec |
| --- | --- |
| Stations | 1 |
| Recipes | 1 (`basic_axe`: 5 wood) |
| Challenge | Sentence word ordering (`DragSentenceView` pattern) |
| Unlock | 1 blocked path (fallen tree gate) |
| Objective | 1 team win condition (reach unlocked area or repair machine) |

### Session

| Item | Spec |
| --- | --- |
| Players | 2–10 for initial testing (Liveblocks Free limit) |
| Roles | Teacher (host), students (players) |
| Join | 6-char code |
| Auth | Supabase student login required |
| Teacher controls | Start, pause, end (dashboard in Phase 5; minimal host controls in lobby for earlier phases) |
| Reconnect | Preserve world state; rejoin with same student ID |

### Learning

| Item | Spec |
| --- | --- |
| Attempt logging | Server records each answer with timing |
| Mastery evidence | Emit `live_game` evidence on correct answers (Phase 2+) |
| Teacher summary | Accuracy + coins earned per student (Phase 5) |

---

## 4. MVP excludes (explicitly deferred)

| Item | Deferred to |
| --- | --- |
| Individual inventories | Post-MVP |
| Character customization | Post-MVP |
| Tool upgrades | Post-MVP |
| Multiple maps | Phase 7 |
| Player-to-player trading | Post-MVP |
| Enemies / combat | Post-MVP |
| Stone and fiber resource types (gameplay) | Phase 4+ (schema only in MVP) |
| Fill-blank questions | Post-MVP |
| Adaptive question selection | Phase 6 |
| Class roster join restriction | Phase 6 |
| Matchmaking / public rooms | Never for classroom product |
| Voice / text chat | Post-MVP |
| Procedural map generation | Post-MVP |
| Sophisticated anti-cheat (server-side position verify) | Post-pilot |
| Mobile-optimized touch UX polish | Phase 7 |
| Supabase session results table | Phase 5–6 |

---

## 5. Phase-by-phase acceptance

### Phase 1 — Movement foundation ✅

- [x] Two logged-in students join the same room
- [x] Each moves independently with keyboard/D-pad
- [x] Each sees the other's avatar with smooth interpolation
- [x] Positions are in Presence only (not Storage)
- [x] Disconnect shows warning; reconnect restores world view
- [ ] Room-full state has usable UI
- [x] TypeScript check passes

### Phase 2 — English Craft v0.1 (see [phase-2-plan.md](./phase-2-plan.md))

**2A — Wood:** MC at trees → team pool  
**2B — Craft:** 10 wood → sentence → bridge → river unlock  
**2C — Victory:** Touch flag → completed phase

- [ ] Student approaches tree → interaction prompt
- [ ] MC question opens; movement paused
- [ ] Correct answer → +1 wood in shared pool (server mutation)
- [ ] Incorrect answer → no reward
- [ ] Node enters cooldown; no double-award
- [ ] 10 wood → craft bench → sentence → bridge
- [ ] River passable for all; flag touch wins
- [ ] Correct answer not visible in client network payload

### Phase 3 — Shop (deferred)

- [ ] Correct answer awards coins to personal wallet
- [ ] Shop overlay shows 3 power-ups with prices
- [ ] Purchase deducts coins server-side
- [ ] Insufficient coins rejected
- [ ] Speed boost increases move speed for 10s
- [ ] Hint removes 2 wrong MC options on next question
- [ ] Team boost adds +1 wood to shared pool
- [ ] Purchase animation/event visible to room

### Phase 4 — Crafting and unlock

- [ ] Crafting station shows recipe (5 wood → Basic Axe)
- [ ] Team cannot craft without enough wood
- [ ] Sentence-order challenge opens
- [ ] Wrong order does not deduct resources
- [ ] Correct craft deducts wood, adds axe, unlocks gate
- [ ] All players see gate open
- [ ] Team objective completion message shown

### Phase 5 — Teacher dashboard

- [ ] Teacher creates session without entering the map
- [ ] Join code displayed
- [ ] Connected student roster visible
- [ ] Start / pause / end controls work
- [ ] Pause blocks new challenges
- [ ] End session shows per-student accuracy and coins

---

## 6. End-to-end success script (classroom pilot — Phase 4)

Run with 1 teacher + 4–6 students on `english-craft-v1`. Target **20–25 minutes**.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Teacher creates game at `/live-game/host` | Join code displayed; island map in lobby |
| 2 | Students join with code | All appear in lobby roster |
| 3 | Teacher starts game | All spawn on south shore; hunger at 100 |
| 4 | Students harvest wood/stone/wheat/cotton | Correct answers grant carry; deposit at storages grows pool |
| 5 | Team deposits 10 wood + 5 stone | Build workbench prompt at bench stump |
| 6 | Build workbench (sentence craft) | Bench sprite active; recipe menu opens |
| 7 | Craft 2 hammers | Pool −4 wood −4 stone; HUD shows hammers 2/5 |
| 8 | Play while hunger decays | Bar drops; movement slows at 0; craft bread + eat to restore |
| 9 | Craft 3 more hammers + boat | Hammers consumed; boat appears at dock; boarding unlocked |
| 10 | All connected players stand on boat 2s | Victory overlay — team escaped |
| 11 | Teacher ends or play again | Session resets milestones on new round |

**Smoke checks:** deposit letter tiles lock correctly; carry sprite 48px above avatar; 24px chip in HUD.

---

## 7. Legacy pilot script (Phase 2 v0.1 — superseded)

Run with 1 teacher + 5 students on the pilot map.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Teacher creates game at `/live-game/host` | Join code displayed |
| 2 | 5 students join with code | All appear in lobby roster |
| 3 | Teacher starts game | All spawn on map |
| 4 | Students explore | Movement responsive; all see each other |
| 5 | Student A collects from tree (correct) | Pool +1 wood; A gets coins |
| 6 | Student B tries same tree immediately | Blocked (cooldown or already collected) |
| 7 | Students collect until pool ≥ 5 wood | Pool counter updates live for all |
| 8 | Student C buys speed boost | Coins deducted; C moves faster |
| 9 | Student D crafts Basic Axe (correct sentence) | Wood deducted; axe crafted |
| 10 | Gate opens | All players can enter new area |
| 11 | Team reaches objective | Objective complete message |
| 12 | Teacher ends session | Summary shows attempts and coins per student |

**MVP is successful when steps 1–11 pass in a single session without manual state fixes.**

---

## 7. English Craft map (`english-craft-v1`)

Single outdoor island scene (960×540 px), adapted from explore roam format.

```
┌─────────────────────────────────────────┐
│  SPAWN AREA (south beach)               │
│                                         │
│    🌳  🌳      🌳                       │
│         🌳  🌳                          │
│                                         │
│    ═══ FALLEN TREE (locked gate) ═══    │
│                                         │
│    🔨 CRAFTING STATION                  │
│                                         │
│         🏆 OBJECTIVE (north clearing)   │
└─────────────────────────────────────────┘
```

| Element | Count | Notes |
| --- | --- | --- |
| Wood nodes | 8 | Scattered in south/mid area |
| Crafting station | 1 | Near fallen tree |
| Blocked gate | 1 | Requires `basic_axe` crafted |
| Objective | 1 | North clearing — reachable only after gate opens |
| Spawn points | 6 | South beach strip |

Content: MC questions from a static A2 vocabulary set (e.g. words from secondary pack subset).

Crafting sentence (MVP):

```
Word bank: usually / after school / I / play football
Correct:   I usually play football after school.
```

---

## 8. Testing checklist

### Multiplayer

- [ ] 2 users in one session
- [ ] 10 users on Free plan (max capacity test)
- [ ] Each user sees all others
- [ ] Local movement feels immediate
- [ ] Remote avatars do not teleport excessively
- [ ] Leave removes avatar from others' view
- [ ] Reconnect restores pool/nodes/unlocks
- [ ] Full room shows clear error

### Resources

- [ ] Only nearby player can open node challenge
- [ ] Wrong answer awards nothing
- [ ] Right answer awards exactly once
- [ ] Simultaneous claims do not duplicate
- [ ] Pool consistent on all clients
- [ ] Cooldown restores node

### Shop

- [ ] Cannot buy without enough coins
- [ ] Cannot double-purchase same power-up if single-use (TBD per power-up)
- [ ] Effects visible to purchaser (and team boost to all)

### Crafting

- [ ] Cannot craft without resources
- [ ] Wrong sentence does not deduct
- [ ] Correct craft deducts once
- [ ] Gate unlocks for everyone
- [ ] Objective fires once

### Learning

- [ ] Attempt has correct student ID (Supabase)
- [ ] Attempt has question ID
- [ ] Correctness saved
- [ ] Response time recorded
- [ ] Evidence event emitted on correct answer

### Reliability

- [ ] Refresh does not duplicate player in roster
- [ ] Double-click submit does not duplicate reward
- [ ] Slow connection shows warning
- [ ] Pause blocks new interactions
- [ ] End blocks new rewards
- [ ] `npm run build` passes

---

## 9. Open decisions (resolve before Phase 1 code)

| # | Decision | Value | Status |
| --- | --- | --- | --- |
| 1 | Product name | Live Game | **Locked** |
| 2 | First mode | English Craft | **Locked** |
| 3 | Map ID | `english-craft-v1` | **Locked** |
| 4 | Room prefix | `wke-live-game-` | **Locked** |
| 5 | Student auth | Required for join | **Locked** |
| 6 | Teacher in-world | No — lobby only (Phase 1) | **Locked** |
| 7 | Pilot bench goal | 10 wood + 5 stone to build workbench | **Locked** |
| 8 | Max pilot class size | ≤10 (Free plan) | **Locked** |
| 9 | Coins in v0.1 | No — Phase 4 / v0.3 | **Locked** |

---

## 10. Exit criteria for Phase 0

- [x] `existing-system-audit.md` written
- [x] `architecture.md` written
- [x] `mvp-scope.md` written
- [x] `liveblocks-limits.md` written
- [ ] Team reviews and agrees on hybrid model + pilot map
- [ ] Liveblocks plan tier decision recorded (see `liveblocks-limits.md`)

Once team sign-off is complete, proceed to **Phase 1: room foundation + multiplayer movement**.
