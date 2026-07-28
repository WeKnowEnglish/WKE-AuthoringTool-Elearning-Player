# Resources drafts

Working drafts for the content hub. **Live articles ship from** `web/content/resources/articles/` with `published: true`.

| File | Intended route | Status |
|------|----------------|--------|
| `../articles/what-is-edtech.md` | `/resources/what-is-edtech` | **Live** |
| `../articles/how-is-technology-changing-education.md` | `/resources/how-is-technology-changing-education` | **Live** |
| `teach-english-online.pillar.md` | `/teach-english-online` | SEO PR 3 handoff draft (pillar route already live) |

## Status

- Hub: `/resources`
- Do not link `/resources/news` until that route ships.
- `reviewStatus` stays honest (`editor-reviewed` only after an editor pass).
- External links are intentional: UNESCO/OECD for sector evidence, British Council/Cambridge for classroom practice, EdSurge/ISTE for ongoing EdTech signal.

## Frontmatter contract

```yaml
slug, title, description, pathname, published, reviewStatus,
author, dateDrafted, datePublished, dateModified,
primaryIntent, relatedInternal
```
