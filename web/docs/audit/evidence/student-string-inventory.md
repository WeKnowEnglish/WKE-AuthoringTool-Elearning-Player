# Student String Inventory (Evidence Sample)

Audit date: 2026-07-20  
Sample of visible / instructional strings. Not exhaustive; used to ground language findings.

## Primary dashboard

| String | File |
|--------|------|
| Learning dashboard | `components/primary/StudentHomeLanding.tsx` |
| Start Learning / Continue Learning | same |
| Earn Rewards / Get gold and unlock prizes! | same |
| Keep learning — gold and XP unlock new topics! | `lib/primary/ssr-primary-placeholders.ts` |
| Words mastered / Word finds | `components/primary/PrimaryProgressTab.tsx` |
| You're caught up | `components/primary/PrimaryReviewTab.tsx` |
| Pet Care / Language Garden | `components/primary/PrimaryGamesTab.tsx` |
| Plant letters, harvest words, and clear weeds. | same |
| Open world hub | same |
| Secondary vocabulary practice is for the Secondary path… | `PrimaryDashboardClient.tsx` |
| Sound on / Sound off | `StudentHomeLanding.tsx` |
| Log out | `SignOutForm` + primary chrome |

## Secondary

| String | File |
|--------|------|
| Pair each word with the best definition. | `SecondaryHome.tsx` |
| Fill each blank in today's paragraph. | same |
| Type the correct spelling from meaning prompts. | same |
| Write a sentence with 5 vocabulary words… | same |
| No words ready today | same |
| Today's path is complete | same |
| Master 10 words today to hit your goal. | `SecondaryVocabProgressCard.tsx` |
| Not yet. Try again. / Not quite. Try again. | practice cards |
| Show Vietnamese / Hide Vietnamese | `SecondaryWordMeaningCard.tsx` |
| Waiting for teacher review / Send to teacher | `SentenceActivity.tsx` |
| Loading today's practice... | activity pages |

## Shared kid-ui / hub

| String | File |
|--------|------|
| Learn / Achievements / Log out | `kid-ui/StudentShell.tsx` |
| Pet Care / Collection | `student-hub/RoomSwitcher.tsx` |
| Claim gold! | `PetRoom.tsx` |
| No stickers yet. Buy a pack above! | stickers collection |
| Daily quests | quests UI |
| How you earned coins | `VocabActivityRewardScreen.tsx` |

## Observations (evidence-backed)

1. **Primary** language mixes instructional goals (“I can name…”) with meta-game (gold, XP, pet, garden, stickers).
2. **Secondary** instructional copy is clearer and task-specific; Vietnamese toggles are Secondary-specific.
3. **Kid design tokens** (`kid-ink`, `kid-panel`) appear on Secondary components — visual age cue, not string leak.
4. Many strings are **hardcoded in components**; no shared i18n / glossary module found in this audit.
5. Inconsistent try-again phrasing: “Not yet” vs “Not quite” vs “Try again”.
