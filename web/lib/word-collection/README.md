# Word collection (`wke-word-collection-v1`)

Persistent loot words for the student Collection Book **Words** page.

## Granting loot

```ts
import { grantWordLoot } from "@/lib/word-collection";

// Explore activity (future): end of battle / chest
grantWordLoot("apple", 2);
```

`wordId` should match `VocabularyEntry.id` in [`master-vocabulary.ts`](../curated-sentences/master-vocabulary.ts). Use `lookupWordIdFromLemma` when you only have surface text.

## Upgrades

- Each word has a **count** (total copies collected) and **tier** (1–5).
- Upgrading to the next tier requires `count >= nextTier.minCount` and spending `nextTier.goldCost` gold.
- Count is never consumed on upgrade.

## Explore activity

End-of-run **random encounter** (75% good / 20% better / 5% best) calls `grantWordLoot` for 1–3 words from the **area encounter pool** (see [`lib/explore/areas/`](../explore/areas/)). Gate words are a subset; students replay runs to collect every **discovery word** for an area.

Area unlock: complete all discovery words in the previous area (e.g. bedroom → school → supermarket). Progress % on Home is **words found / total discovery words** in Simple World.
