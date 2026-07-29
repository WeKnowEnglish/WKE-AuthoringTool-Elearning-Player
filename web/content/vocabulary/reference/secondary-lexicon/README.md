# Secondary → Primary lexicon map

Phase 1 bridge: Secondary `wordItemId` → Primary candidate `pv_*`.

| Artifact | Path |
|----------|------|
| Dataset (SoT) | `secondary-to-primary-lexicon-map.v1.json` |
| Human summary | `docs/mastery/SECONDARY_TO_PRIMARY_LEXICON_MAP.md` |
| Runtime API | `lib/secondary/secondary-lexicon-map.ts` |

Regenerate after Secondary pack or Primary search-index changes:

```bash
npm run generate:secondary-primary-lexicon-map
```

To add Secondary gaps into the Primary candidate bank (then regenerate the map):

```bash
npm run add:secondary-lexicon-gaps
```

Do not hand-edit mapped rows in bulk — change the matcher or approve review items, then regenerate.
