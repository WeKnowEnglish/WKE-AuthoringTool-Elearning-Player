# WKE AI Asset Library Plan

**Status:** Starter collection imported; operating model proposed  
**Primary stakeholder:** Teachers and content creators  
**Downstream stakeholders:** Students, curriculum leaders, administrators, and parents

## 1. Learning purpose

The Asset Library exists to help a teacher find a suitable, trustworthy visual in seconds and use it consistently across lessons, stories, vocabulary practice, games, and assessment. It is not simply an image archive.

For students, the library should improve comprehension, reduce irrelevant visual load, support vocabulary recall, and make characters and settings feel consistent across the platform. Administrators need clear provenance and review status. Parents benefit indirectly through coherent, age-appropriate learning materials.

## 2. Baseline completed on 2026-08-02

- Reused the existing shared Supabase `media_assets` catalog and public `lesson_media` delivery bucket.
- Imported the WKE Image Library starter batch into the established library owner account.
- Scanned 156 source files: 153 valid PNGs, two empty PNGs, and one partial download.
- Stored 148 unique WebP assets representing all 153 valid source files; five exact visual duplicates were reused and their alternative names were merged for search.
- Reduced the stored batch from 339.01 MB to 35.18 MB (90%) while retaining original dimensions and transparency.
- Added searchable labels for AI provenance, collection, visual role, topic, characters, scenes, backgrounds, and transparent cutouts.
- Corrected common filename spelling errors in display/search metadata without renaming or altering the source collection.
- Added Asset Library quick filters for AI-generated items, the starter collection, vocabulary objects, characters, and scenes.
- Added an idempotent command-line intake process with validation, exact deduplication, optimization, metadata generation, rollback on catalog failure, and dry-run/apply modes.

### Live starter collection

| Measure | Result |
| --- | ---: |
| Total catalog after import | 581 |
| Unique starter assets | 148 |
| Valid source files represented | 153 |
| Vocabulary objects | 49 |
| Character assets | 37 |
| Scenes | 54 |
| Background-ready scenes | 48 |
| Transparent cutouts | 100 |
| Missing display names or hashes | 0 |

## 3. Library standard

### 3.1 Required metadata

Every production asset should eventually have:

- A stable asset ID, clear display name, accessible description, and useful alternative search names.
- A collection, topic categories, and visual role: `vocabulary-object`, `character`, `scene`, `background`, `diagram`, `interface`, or `audio`.
- Production provenance: source type, generator/model, creation date, prompt or prompt reference, source file, and version lineage.
- Governance status: `draft`, `needs-review`, `approved`, `revision-needed`, or `archived`.
- Rights/safety record: allowed use, real-person/brand check, cultural sensitivity check, and reviewer.
- Curriculum links only when reviewed: lexicon entry, learning objective, age band, grade band, or grammar concept.

Do not assign a CEFR level solely from an image filename. An image is often reusable across levels; CEFR belongs on the linked learning use unless a reviewer intentionally limits the asset.

### 3.2 Visual production specifications

- Vocabulary cutouts: transparent background, generous safe margin, one unambiguous focal item, no decorative clutter.
- Characters/actions: readable pose and facial expression at small card size; avoid relying on tiny props to convey the meaning.
- Scenes/backgrounds: landscape composition with clear negative space for instructional overlays and no baked-in text unless text is the learning target.
- Use consistent WKE character, line, lighting, and color conventions within a collection.
- Avoid real student likenesses, recognizable trademarks, unsafe actions, stereotypes, and culturally confusing visual details.
- Verify factual visuals (science tools, maps, food, school equipment, body parts) with a subject reviewer.
- Keep downloadable masters outside the delivery bucket; publish optimized WebP derivatives for the lesson player.

## 4. Intake and approval workflow

1. **Brief:** define the learning objective, target concept, age/grade, visual role, and required variations before generation.
2. **Generate:** create coherent batches, retaining prompt/model/source information.
3. **Preflight:** run the importer in dry-run mode to validate files, optimize derivatives, identify duplicates, and preview inferred metadata.
4. **Editorial review:** confirm visual meaning, spelling, inclusivity, transparency/cropping, and age appropriateness.
5. **Curriculum review:** link vocabulary/concepts and add level restrictions only when pedagogically justified.
6. **Approve and publish:** expose approved assets to default teacher search; keep drafts in a review shelf.
7. **Use and measure:** track search-to-selection, reuse, broken delivery, and assets that teachers repeatedly skip.
8. **Revise or archive:** create a new version when a used asset changes; archive rather than silently replacing a published visual.

### Current intake command

Run from `web/`. Omitting `--apply` is a dry run.

```powershell
npm run assets:import -- --source "C:\path\to\image-library" --owner-id <teacher-uuid> --collection <collection-slug>
npm run assets:import -- --source "C:\path\to\image-library" --owner-id <teacher-uuid> --collection <collection-slug> --apply
```

The command is safe to rerun: exact matches reuse the catalog item and merge alternative names instead of creating new storage objects.

## 5. Build priorities

### Phase 1 — Governance and review shelves

Add first-class columns for provenance, review status, accessible description, visual role, collection, version lineage, and reviewer. Default legacy assets to `approved-legacy`; route new AI generation to `needs-review`. Add Draft, Review, Approved, and Archived shelves to the teacher/admin interface.

**Exit criteria:** no new AI asset becomes generally discoverable without provenance and review state; teachers can still use approved assets without extra steps.

### Phase 2 — Curriculum coverage

Measure asset coverage against the primary and secondary lexicons and curriculum concepts. Prioritize gaps by lesson frequency and learning impact:

1. Core high-frequency nouns and classroom language.
2. Daily routines and high-value action verbs with consistent characters.
3. Home, family, food/drink, places, transport, weather, and jobs.
4. Preposition and `there is/there are` scenes with controlled contrasts.
5. Emotion, social communication, classroom routines, and safety language.
6. Subject-support visuals for science, geography, maths, arts, and digital literacy.

Generate contrast sets together (singular/plural, clean/dirty, before/after, near/far, one/many) so assessment items remain visually fair.

**Exit criteria:** report image coverage by curriculum/lexicon, with reviewed alternatives for the most frequently taught concepts.

### Phase 3 — AI generation workspace

Create an admin/content-creator queue that starts from a curriculum gap, saves the brief and prompt, generates variations, and sends candidates into review. Provide batch-level style references and character identity controls rather than independent one-off prompts.

**Exit criteria:** a creator can go from a documented curriculum gap to an approved, linked asset without moving files manually between products.

### Phase 4 — Retrieval and recommendation

Add structured collection/topic/role filters, accessible-description search, visual similarity, and recommendations inside each authoring tool. Rank approved curriculum-linked assets above generic matches. Never let an AI search result silently override teacher choice.

**Exit criteria:** a teacher can find and insert an appropriate asset in under 15 seconds for common lesson-building tasks.

### Phase 5 — Analytics and lifecycle

Track searches with no useful result, selection rate, asset reuse, load failures, rejected generations, review turnaround time, and curriculum coverage. Add version-aware replacement so published lessons remain stable.

**Exit criteria:** quarterly creation priorities are driven by learning coverage and teacher behavior, not raw asset count.

## 6. Next implementation slice

1. Add the governance/provenance migration and review-state policies.
2. Add an admin review queue with approve, request revision, and archive actions.
3. Add a collection summary view with coverage counts and missing required metadata.
4. Link the 49 starter vocabulary objects to reviewed lexicon entries; send ambiguous matches to the existing match queue.
5. Review the 48 background-tagged scenes for text-overlay safe zones.
6. Remove or repair the two empty PNGs and the `.part` file in the source folder.
7. Write the WKE visual style guide and generation brief template before producing the next batch.

## 7. Success measures

- At least 95% of common teacher searches return one or more approved, relevant assets.
- Median search-to-selection time is under 15 seconds.
- 100% of new AI assets have provenance and review status.
- 100% of curriculum-critical diagrams and factual scenes receive human review.
- Public asset load success stays above 99.9% with no lesson-blocking files above the delivery budget.
- Duplicate storage remains below 1% of new intake.
- Asset creation is prioritized by documented curriculum gaps and measured teacher demand.

