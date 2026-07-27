# Resources drafts (not live yet)

Draft copy for the content hub plan. **Do not register these in the sitemap until routes ship and `published: true`.**

| File | Intended route | Owner |
|------|----------------|--------|
| `what-is-edtech.md` | `/resources/what-is-edtech` | Content plan |
| `how-is-technology-changing-education.md` | `/resources/how-is-technology-changing-education` | Content plan |
| `teach-english-online.pillar.md` | `/teach-english-online` | SEO PR 3 (handoff draft) |

## Status

- Review after SEO homepage + pillars ship.
- Internal links use final paths (no trailing slash). Some targets may 404 until SEO PRs land — that is expected.
- `reviewStatus` stays `prototype` until an editor pass; never claim classroom-tested without evidence.
- External links are intentional: UNESCO/OECD for sector evidence, British Council/Cambridge for classroom practice, EdSurge/ISTE for ongoing EdTech signal. Prefer deep links over bare homepages.

## Frontmatter contract (for future MDX)

```yaml
slug, title, description, pathname, published, reviewStatus,
author, dateDrafted, datePublished, dateModified,
primaryIntent, relatedInternal
```
