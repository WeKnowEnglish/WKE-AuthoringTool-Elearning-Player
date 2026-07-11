# Live Game — Liveblocks Limits & Capacity Planning

**Status:** Phase 0 (decision record)  
**Prepared:** 2026-07-11  
**Review by:** Before any classroom pilot beyond 10 students

---

## 1. Why this matters

Live classroom games connect **every student and the teacher** to a single Liveblocks room. Plan limits cap **simultaneous connections per room**. Exceeding the limit means students cannot join — there is no graceful queue in the MVP design.

This document records known limits, maps them to We Know English class sizes, and recommends a tier decision before pilot expansion.

---

## 2. Documented Liveblocks limits (July 2026)

Source: [Liveblocks Pricing — Limits](https://liveblocks.io/docs/pricing/limits)

| Plan | Simultaneous connections per room | Notes |
| --- | ---: | --- |
| **Free** | 10 | Suitable for dev and tiny pilots |
| **Pro** | 20 | Small class maximum |
| **Team** | 50 | Standard classroom size |
| **Enterprise** | 100 | Large class or multi-device |

### What counts as a connection

Each browser tab with an active `RoomProvider` counts as one connection. A teacher dashboard + 25 students = 26 connections in one room.

### What does not count

- Students who have not joined the room yet
- API auth calls without an active room connection
- Solo/local game modes without Liveblocks

---

## 3. WKE classroom mapping

| Scenario | Connections needed | Minimum plan |
| --- | ---: | --- |
| Dev test (2 agents) | 2 | Free |
| Pilot (teacher + 5 students) | 6 | Free |
| Pilot (teacher + 9 students) | 10 | Free (at limit) |
| Small class (teacher + 15 students) | 16 | **Team** (Pro caps at 20 total — tight) |
| Standard class (teacher + 24 students) | 25 | **Team** |
| Large class (teacher + 35 students) | 36 | **Team** |
| Very large (teacher + 50 students) | 51 | **Enterprise** or split rooms |

**Important:** Pro (20 connections) fits only **teacher + 19 students** maximum. Many WKE classes may exceed this.

---

## 4. Current project status

| Item | Status |
| --- | --- |
| Liveblocks SDK installed | Yes — `@liveblocks/client`, `@liveblocks/react`, `@liveblocks/node` ^3.22.0 |
| Secret key configured | Optional — `LIVEBLOCKS_SECRET_KEY` in `web/.env.example` |
| Existing usage | Board-game prototype only (`/board-game/multiplayer`) |
| Live-game usage | Not started |
| Billing tier in repo | **Not recorded** — check Liveblocks dashboard |

---

## 5. Recommendations

### Phase 1–4 (development and internal pilot)

| Decision | Recommendation |
| --- | --- |
| Plan tier | **Free** is sufficient |
| Max testers | 9 students + 1 teacher = 10 connections |
| Test protocol | Use 2–3 browser windows locally; reserve full 10-slot test for pre-pilot QA |

### Classroom pilot (first real class)

| Decision | Recommendation |
| --- | --- |
| Plan tier | **Pro minimum** if class ≤ 19 students; **Team** if class > 19 |
| Buffer | Leave 1–2 connection slots for teacher reconnection or co-teacher |
| Pre-flight | Count enrolled students before session; block join at capacity with clear UI |

### Production (regular classroom use)

| Decision | Recommendation |
| --- | --- |
| Plan tier | **Team** (50 connections) for standard deployment |
| Fallback | If a class exceeds 50, split into two rooms (two join codes) — requires Phase 7 design |
| Monitoring | Log connection count in teacher dashboard (Phase 5) |

---

## 6. MVP mitigations (built into design)

These are implemented across Phases 1–5 to reduce limit pain:

| Mitigation | Phase | Description |
| --- | --- | --- |
| Room-full UI | 1 | Show clear message when Liveblocks rejects join |
| Connection indicator | 1 | Dev panel + later teacher dashboard shows connected count |
| Teacher dashboard separate tab | 5 | Teacher connection is intentional; budget for it in capacity math |
| Require login before join | 1 | Prevents anonymous tabs consuming slots |
| Single room per session | 1 | No duplicate RoomProvider mounts on one page |
| Pause does not disconnect | 5 | Paused students stay connected — factor into limit planning |

---

## 7. Alternative strategies (if Team plan not available)

| Strategy | Complexity | Notes |
| --- | --- | --- |
| **Split class into two rooms** | Medium | Teacher runs two join codes; halves effective class size per game |
| **Spectator mode on projector** | Low | Only active players connect; others watch — poor pedagogy, not recommended |
| **Regional sharding** | High | Different rooms per group; teacher switches between dashboards |
| **Replace Liveblocks with Supabase Realtime** | Very high | Deferred; mastery stack already deferred Realtime per platform docs |

**Recommendation:** Budget for Team tier rather than engineering around Pro limits.

---

## 8. Presence and performance notes

Separate from connection limits but relevant at classroom scale:

| Topic | Guidance |
| --- | --- |
| Presence update throttle | Default ~100ms per Liveblocks docs; start here |
| Position in Presence only | Reduces Storage conflict load |
| Interpolation | Required before lowering throttle |
| Broadcast events | Use sparingly for FX; not for state |
| Server mutations | Serialize reward transactions; avoid burst writes from 20+ simultaneous answers |

---

## 9. Decision log

Record the team's tier decision here before expanding beyond internal testing.

| Date | Decision | Class size target | Plan tier | Approved by |
| --- | --- | --- | --- | --- |
| 2026-07-11 | Default to Free for Phase 1–4 dev | ≤10 | Free | Pending review |
| | Pilot tier TBD | | | |
| | Production tier TBD | ≤50 | Team (proposed) | |

---

## 10. Pre-pilot checklist

Before running with a real class:

- [ ] Confirm current Liveblocks plan in dashboard
- [ ] Count expected students + teacher + buffer ≤ plan limit
- [ ] Test room-full UI with max connections in staging
- [ ] Confirm `LIVEBLOCKS_SECRET_KEY` set in production environment
- [ ] Document join code distribution process for teacher
- [ ] Have fallback lesson plan if room is full (offline activity)

---

## 11. Action items

| Priority | Action | Owner | When |
| --- | --- | --- | --- |
| P0 | Verify Liveblocks dashboard plan tier | Team | Before Phase 1 merge |
| P1 | Stay within 10 connections during dev | Dev | Phase 1–4 |
| P2 | Upgrade to Pro or Team before classroom pilot | Team | Before first real class |
| P3 | Add connection count to teacher dashboard | Dev | Phase 5 |
| P4 | Evaluate split-room strategy if any class > 50 | Team | Phase 7 planning |
