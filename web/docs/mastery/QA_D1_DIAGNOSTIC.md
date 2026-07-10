# QA: D1 Mastery sync diagnostic panel

**Track:** D1a (read-only) · **Proposal:** [PROPOSAL_D1_SYNC_DIAGNOSTIC.md](./PROPOSAL_D1_SYNC_DIAGNOSTIC.md)

## Enable

Add to any student route URL:

```
?masterySyncDebug=1
```

Examples:

- `/secondary?masterySyncDebug=1`
- `/home?masterySyncDebug=1`

Panel: fixed bottom-right · collapsible · auto-refresh every 2s.

---

## D1a smoke (read-only)

| # | Step | Expected |
| --- | --- | --- |
| 1 | Guest `/secondary?masterySyncDebug=1` | Mode `guest`; server fetch disabled |
| 2 | Sign in | `authUserId` populated; hydration memo matches |
| 3 | Practice one word (authenticated) | Local record count increases; event log shows `evidence_push` |
| 4 | Click **Fetch server** | Record count matches Supabase (or diff explains gap) |
| 5 | DevTools → Offline → practice | `offline` pill; queue depth > 0; `queue_enqueue` in log |
| 6 | Go online | Queue drains; `queue_flush` in log |
| 7 | Rapid 5-word burst | Debounce `pending` > 0 briefly; fewer `debounce_flush` than words |

---

## Maps to P1 E2E (partial — D1a)

| QA_P1_SYNC_E2E row | D1a panel |
| --- | --- |
| 3–4 Pull / account switch | Fetch server + diff; watch `authUserId` / queue |
| 5–6 Write-through / cross-device | Event log + server fetch on device B |
| 8–9 Offline / online | Queue section + online pill |
| 10 Debounce | Debounce section |
| 11 Sign-out | **D1b** — manual reset/flush buttons |

---

## D1b (pending approval)

Manual actions: Flush queue · Flush debounce · Pull & merge · Reset hydration memo.
