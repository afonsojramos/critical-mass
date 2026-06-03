---
title: "Migrate from Sveltia CMS to Emdash CMS"
type: feat
status: completed
date: 2026-04-02
---

# Migrate from Sveltia CMS to Emdash CMS

## Overview

Replace the git-based Sveltia CMS (Decap CMS fork) with Emdash CMS, moving content storage from Markdown/JSON files in git to Cloudflare D1 (database) + R2 (media). This enables instant publishing, modern authentication (passkeys), structured content (Portable Text), and server-side full-text search.

The migration touches ~25 files across the codebase, requires an Astro 5 -> 6 upgrade, and includes a content migration script for existing blog posts, events, gallery items, authors, and locations.

## Problem Statement / Motivation

The current Sveltia CMS setup has friction at every level:

- **Publishing delay**: Content edits commit to `cms-updates` branch -> auto-PR -> manual merge -> deploy. Minutes to hours for a single text change.
- **Build coupling**: Every content change triggers a full site rebuild.
- **Git complexity**: Two GitHub Actions workflows maintain the branch sync, creating merge conflict risks.
- **Limited auth**: GitHub OAuth only — every editor needs a GitHub account.
- **No server-side search**: Current search loads all blog post bodies into memory and does `string.includes()`.

Emdash solves all of these with a database-first architecture that's native to Cloudflare (where the site already deploys).

## Proposed Solution

Full migration in 6 phases, with the Astro 6 upgrade separated as a prerequisite. Each phase is independently deployable and testable.

## Technical Approach

### Architecture

```
Before:
  Editor -> Sveltia CMS -> git commit (cms-updates) -> PR -> merge -> build -> deploy
  Reader -> Cloudflare Worker -> Astro SSR -> read Markdown files -> render HTML

After:
  Editor -> Emdash Admin -> write to D1 + R2 -> instant
  Reader -> Cloudflare Worker -> Astro SSR -> query D1 -> render Portable Text -> HTML
```

### Key Architecture Decisions

1. **Full SSR for content pages**. Currently most pages use `prerender = true` with `getStaticPaths()`. With content in D1, these switch to `prerender = false`. Cloudflare cache headers (`Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`) ensure performance parity — D1 read latency is <1ms with global read replication.

2. **Asset split**: Only CMS-managed content images move to R2. Static assets (city SVGs in `src/assets/cities/`, community logos, UI icons, hero image) remain in `src/assets/` as build-time optimized files.

3. **Cloudflare Image Resizing** replaces build-time sharp for content images. URL pattern: `/cdn-cgi/image/width=800,quality=75,format=auto/<r2-path>`.

4. **Slug preservation**: Migration script explicitly sets slugs to match current values (e.g., `2025-04-15-history-of-critical-mass`, `kidical-mass-7`). No URL changes.

5. **Phased rollback safety**: Git content files and CMS workflows are removed only in a cleanup phase after 1-2 weeks of stable operation. D1 Time Travel provides 30-day point-in-time recovery.

6. **Local development**: Emdash supports SQLite locally + local filesystem storage. `bun run dev` works without Cloudflare infrastructure. A seed script populates local DB from exported content.

### Implementation Phases

#### Phase 0: Astro 6 Upgrade (Prerequisite)

Upgrade Astro from 5.13.5 to 6.x in a separate PR. This isolates framework breaking changes from the CMS migration.

**Tasks:**

- [ ] Upgrade `astro` to `^6.0.0` in `package.json`
- [ ] Upgrade `@astrojs/cloudflare` to Astro 6-compatible version
- [ ] Upgrade `@astrojs/check` and `@astrojs/sitemap` to compatible versions
- [ ] Upgrade `@inlang/paraglide-astro` if needed for Astro 6 compatibility
- [ ] Review Astro 6 migration guide for breaking changes (content collections API, routing, middleware)
- [ ] Run `bun run build` and fix any compilation errors
- [ ] Run `bun run lint` and fix any new issues
- [ ] Verify all pages render correctly in dev
- [ ] Deploy and verify production

**Success criteria:** Site deploys on Astro 6 with identical behavior to Astro 5.

**Files:**

- `package.json`
- `astro.config.mjs` (if adapter/integration APIs changed)
- Potentially `src/content/config.ts` (if content collections API changed)

---

#### Phase 1: Emdash Integration Setup

Install Emdash and configure infrastructure. The old CMS continues to work — this is additive only.

**Tasks:**

- [ ] Install dependencies: `bun add emdash @emdash-cms/cloudflare astro-portabletext`
- [ ] Remove `astro-decap-cms-oauth` from dependencies
- [ ] Configure Emdash integration in `astro.config.mjs`:

```js
// astro.config.mjs
import emdash, { r2 } from "emdash/astro";
import { d1 } from "emdash/db";
import { sqlite } from "emdash/db";
import { local } from "emdash/storage";

const isDev = import.meta.env.DEV;

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  integrations: [
    emdash({
      database: isDev ? sqlite({ url: "file:./data.db" }) : d1({ binding: "DB" }),
      storage: isDev ? local({ directory: "./uploads" }) : r2({ binding: "MEDIA" }),
    }),
    // ... existing integrations (paraglide, sitemap)
  ],
  i18n: {
    defaultLocale: "pt",
    locales: ["pt", "en"],
    fallback: { en: "pt" },
    routing: { prefixDefaultLocale: true },
  },
  image: {
    domains: ["media.massacritica.pt"], // R2 custom domain
  },
});
```

- [ ] Create `wrangler.jsonc` with D1 + R2 bindings:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "massacritica",
  "compatibility_date": "2026-01-15",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "massacritica-db",
      "database_id": "<to-be-created>",
    },
  ],
  "r2_buckets": [
    {
      "binding": "MEDIA",
      "bucket_name": "massacritica-media",
    },
  ],
}
```

- [ ] Create Cloudflare D1 database: `wrangler d1 create massacritica-db`
- [ ] Create Cloudflare R2 bucket: `wrangler r2 bucket create massacritica-media`
- [ ] Set secrets: `wrangler secret put EMDASH_AUTH_SECRET` and `wrangler secret put EMDASH_PREVIEW_SECRET`
- [ ] Configure GitHub OAuth in Emdash (retain GitHub as auth provider for editor continuity):

```js
emdash({
  auth: {
    oauth: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      },
    },
  },
});
```

- [ ] Create `src/live.config.ts` with Emdash loader:

```ts
import { defineLiveCollection } from "astro:content";
import { emdashLoader } from "emdash/runtime";

export const collections = {
  _emdash: defineLiveCollection({
    loader: emdashLoader(),
  }),
};
```

- [ ] Remove `public/admin/config.yml`
- [ ] Deploy and verify Emdash admin is accessible at `/_emdash/admin`
- [ ] Run Setup Wizard: set site title, create first admin account

**Success criteria:** Emdash admin panel loads. Collections can be created via CLI/admin. Old content files still exist but are no longer served by a CMS.

**Files:**

- `package.json`
- `astro.config.mjs`
- `wrangler.jsonc` (new)
- `src/live.config.ts` (new)
- `public/admin/config.yml` (delete)

---

#### Phase 2: Schema Creation & Content Migration

Define Emdash collections matching the current schema, then migrate all existing content.

**Tasks:**

**2a. Create collection schemas via CLI:**

- [ ] Create `authors` collection:

  ```bash
  npx emdash schema create authors --label "Authors" --labelSingular "Author"
  npx emdash schema add-field authors --slug name --type string --required
  npx emdash schema add-field authors --slug image --type image --required
  npx emdash schema add-field authors --slug bio --type text
  npx emdash schema add-field authors --slug socialMediaLink --type string
  ```

- [ ] Create `blog` collection (with drafts, revisions, scheduling):

  ```bash
  npx emdash schema create blog --label "Blog" --labelSingular "Post" --supports drafts,revisions
  npx emdash schema add-field blog --slug title --type string --required
  npx emdash schema add-field blog --slug body --type portableText --required
  npx emdash schema add-field blog --slug pubDate --type datetime --required
  npx emdash schema add-field blog --slug author --type reference --options '{"collection":"authors"}' --required
  npx emdash schema add-field blog --slug image --type image --required
  npx emdash schema add-field blog --slug tags --type multiSelect --options '{"choices":["cycling","activism","urbanism","events","community","sustainability","safety","infrastructure","politics","history","tutorial","beginner"]}'
  npx emdash schema add-field blog --slug summary --type text --required
  npx emdash schema add-field blog --slug type --type select --options '{"choices":["Article","Tutorial"]}'
  ```

- [ ] Create `events` collection:

  ```bash
  npx emdash schema create events --label "Events" --labelSingular "Event" --supports drafts
  npx emdash schema add-field events --slug title --type string --required
  npx emdash schema add-field events --slug body --type portableText
  npx emdash schema add-field events --slug description --type text --required
  npx emdash schema add-field events --slug featured --type boolean
  npx emdash schema add-field events --slug images --type json
  ```

- [ ] Create `gallery` collection:

  ```bash
  npx emdash schema create gallery --label "Gallery" --labelSingular "Gallery Item"
  npx emdash schema add-field gallery --slug title --type string --required
  npx emdash schema add-field gallery --slug image --type image --required
  npx emdash schema add-field gallery --slug description --type text
  npx emdash schema add-field gallery --slug category --type string
  npx emdash schema add-field gallery --slug date --type datetime
  npx emdash schema add-field gallery --slug author --type reference --options '{"collection":"authors"}'
  ```

- [ ] Create `locations` collection:

  ```bash
  npx emdash schema create locations --label "Locations" --labelSingular "Location"
  npx emdash schema add-field locations --slug city --type string --required
  npx emdash schema add-field locations --slug exactLocation --type string --required
  npx emdash schema add-field locations --slug image --type image --required
  npx emdash schema add-field locations --slug link --type string --required
  npx emdash schema add-field locations --slug index --type integer --required
  npx emdash schema add-field locations --slug dateFrequency --type select --options '{"choices":["first","second","third","fourth","last"]}'
  npx emdash schema add-field locations --slug dayOfWeek --type select --options '{"choices":["friday","saturday","sunday"]}'
  npx emdash schema add-field locations --slug customDate --type string
  ```

- [ ] Generate TypeScript types: `npx emdash types --output src/types/emdash.ts`

**2b. Write migration script** (`scripts/migrate-content.ts`):

```ts
// Pipeline overview (pseudocode):
// 1. Read all content files from src/content/
// 2. Parse frontmatter with gray-matter
// 3. For Markdown bodies: remark -> HTML -> @sanity/block-tools -> Portable Text
// 4. Upload images from src/assets/images/ to R2
// 5. Resolve author references (slug -> Emdash ID)
// 6. Insert entries via Emdash REST API with explicit slugs + locale
// 7. Link translations via translation_group
```

- [ ] Install migration deps: `bun add -D gray-matter @sanity/block-tools unified remark-parse remark-html`
- [ ] Migrate `authors` first (simplest: JSON, no i18n, no Markdown)
- [ ] Migrate `locations` (JSON, no i18n, no Markdown)
- [ ] Migrate `gallery` (JSON, i18n, no Markdown — link translation pairs)
- [ ] Migrate `events` (Markdown, i18n — convert body to Portable Text)
- [ ] Migrate `blog` (Markdown, i18n, author references — most complex)
- [ ] Upload content images to R2, rewrite references in migrated entries
- [ ] Verify slug preservation: every migrated entry must have its original slug
- [ ] Verify i18n translation groups: pt/en pairs must share a `translation_group`
- [ ] Export seed file for local development: `npx emdash export-seed > seed.json`

**Success criteria:** All 5 collections populated in D1. Every content entry accessible via `getEmDashEntry()` with correct locale, slug, and data.

**Files:**

- `scripts/migrate-content.ts` (new)
- `src/types/emdash.ts` (new, generated)

---

#### Phase 3: Content Querying & Rendering Migration

Update all 14+ files that query content collections to use Emdash's API. Replace Markdown rendering with Portable Text.

**Tasks:**

**3a. Create shared utilities:**

- [ ] Create `src/utils/cfImage.ts` — Cloudflare Image Resizing URL helper:

```ts
// src/utils/cfImage.ts
export function cfImage(src: string, opts: { width: number; height?: number; quality?: number }) {
  const params = [
    `width=${opts.width}`,
    opts.height ? `height=${opts.height}` : null,
    `quality=${opts.quality ?? 75}`,
    "format=auto",
  ]
    .filter(Boolean)
    .join(",");
  return `/cdn-cgi/image/${params}${src}`;
}
```

- [ ] Create `src/components/PortableTextRenderer.astro` — shared Portable Text component with custom blocks (image, link handlers):

```astro
---
import { PortableText } from "astro-portabletext";
import ImageBlock from "./blocks/ImageBlock.astro";
// ... custom mark/block components

const { value } = Astro.props;
const components = {
  type: { image: ImageBlock },
};
---
<div class="prose prose-lg max-w-none">
  <PortableText value={value} components={components} />
</div>
```

- [ ] Create `src/components/blocks/ImageBlock.astro` — renders embedded images via Cloudflare Image Resizing

**3b. Migrate page files (remove `prerender = true`, replace queries):**

Each file follows this pattern:

- Remove `export const prerender = true` and `getStaticPaths()`
- Replace `getCollection("x")` with `getEmDashCollection("x", { locale, status: "published" })`
- Replace `getEntry(ref)` with `getEmDashEntry("authors", id)`
- Replace `<Content />` with `<PortableTextRenderer value={entry.data.body} />`
- Replace `ImageMetadata` image sources with `cfImage(entry.data.image.url, { width })`
- Add cache headers: `Astro.response.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400")`

- [ ] `src/pages/[locale]/articles/index.astro` — blog listing
- [ ] `src/pages/[locale]/articles/[slug].astro` — article detail (Portable Text body)
- [ ] `src/pages/[locale]/articles/search.astro` — replace in-memory search with `searchCollection("blog", query, { locale })`
- [ ] `src/pages/[locale]/articles/tag/[tag].astro` — tag filtering via `getEmDashCollection("blog", { where: { tags: tag }, locale })`
- [ ] `src/pages/[locale]/events/index.astro` — event listing
- [ ] `src/pages/[locale]/events/[slug].astro` — event detail (Portable Text body)
- [ ] `src/pages/[locale]/gallery/[category].astro` — gallery with category filter
- [ ] `src/pages/articles/api/search.json.ts` — replace with FTS5 query, add locale parameter

**3c. Migrate section components:**

- [ ] `src/components/sections/FeaturedEvents.astro` — query featured events
- [ ] `src/components/sections/LastBlogArticle.astro` — query latest article
- [ ] `src/components/sections/Locations.astro` — query locations (no i18n)
- [ ] `src/components/sections/GalleryView.astro` — query gallery items

**3d. Migrate UI components (type annotations + image sources):**

- [ ] `src/components/ui/ArticleCard.astro` — update types and author resolution
- [ ] `src/components/ui/EventCard.astro` — update `CollectionEntry` type
- [ ] `src/components/ui/GalleryCard.astro` — update types and author resolution

**3e. Migrate SEO/utilities:**

- [ ] `src/components/seo/Seo.astro` — update type from `CollectionEntry<"blog">` to Emdash type
- [ ] `src/utils/jsonLD.js` — update field name references for Emdash data shape
- [ ] `src/utils/getOptimizedImage.ts` — rewrite for R2 URLs + cfImage(), keep fallback for static assets

**3f. Update sitemap for SSR:**

- [ ] Create dynamic sitemap endpoint or configure `@astrojs/sitemap` with `customPages` that queries D1 for all published content URLs

**3g. Remove old content schema:**

- [ ] Remove or replace `src/content/config.ts` (Zod schemas no longer needed for Emdash collections)

**Success criteria:** All pages render content from D1. Portable Text renders with correct formatting. Images load from R2 via Cloudflare Image Resizing. Search works with FTS5. All URLs return 200.

**Files:** (22 files modified/created)

- `src/utils/cfImage.ts` (new)
- `src/components/PortableTextRenderer.astro` (new)
- `src/components/blocks/ImageBlock.astro` (new)
- All 14 page/component files listed above
- `src/components/seo/Seo.astro`
- `src/utils/jsonLD.js`
- `src/utils/getOptimizedImage.ts`
- `src/content/config.ts` (remove or replace)

---

#### Phase 4: Testing & URL Verification

Comprehensive testing before declaring the migration complete.

**Tasks:**

- [ ] Create URL smoke test script that verifies all existing URLs return 200:
  - All blog article URLs (both locales)
  - All event URLs (both locales)
  - All gallery category URLs (both locales)
  - Homepage (both locales)
  - Search page
  - Search API endpoint
- [ ] Verify content parity: visually compare old vs new rendering for each content type
- [ ] Verify i18n: language switcher works, locale filtering returns correct content, partial translations handled gracefully
- [ ] Verify search: FTS5 returns relevant results, locale-scoped
- [ ] Verify images: R2 media loads, Cloudflare Image Resizing transforms correctly, OG images work
- [ ] Verify SEO: canonical URLs, JSON-LD, Open Graph meta, sitemap
- [ ] Verify auth: login to Emdash admin via GitHub OAuth, create/edit/publish content
- [ ] Verify local dev: `bun run dev` works with local SQLite + filesystem storage
- [ ] Run `bun run build` and `bun run lint`
- [ ] Deploy to staging/preview and test end-to-end

**Success criteria:** Zero regressions. All URLs return 200. Content renders correctly. Editors can manage content.

---

#### Phase 5: Deploy & Monitor

- [ ] Deploy to production
- [ ] Monitor Cloudflare analytics for errors, latency spikes
- [ ] Verify D1 query performance (should be <5ms per page)
- [ ] Confirm Emdash admin works in production with passkeys + OAuth
- [ ] Have editors test content creation workflow
- [ ] Monitor for 1-2 weeks before cleanup

**Success criteria:** Production stable for 1-2 weeks with no content management issues.

---

#### Phase 6: Cleanup

Only after Phase 5 is confirmed stable.

- [ ] Remove `.github/workflows/cms-pr.yml`
- [ ] Remove `.github/workflows/sync-cms-branch.yml`
- [ ] Remove `CMS_SETUP.md`
- [ ] Remove `src/content/` directory (blog, events, gallery, authors, locations files)
- [ ] Remove `src/assets/images/` content that was migrated to R2 (keep static assets)
- [ ] Delete `cms-updates` branch
- [ ] Remove migration script and dev dependencies (`gray-matter`, `@sanity/block-tools`, etc.)
- [ ] Remove `sharp` from dependencies (no longer needed for build-time optimization)
- [ ] Tag the pre-cleanup commit: `git tag pre-emdash-cleanup`
- [ ] Update CLAUDE.md with new CMS documentation

**Success criteria:** Repository is clean. No legacy CMS artifacts remain. CLAUDE.md reflects the new architecture.

**Files:**

- `.github/workflows/cms-pr.yml` (delete)
- `.github/workflows/sync-cms-branch.yml` (delete)
- `CMS_SETUP.md` (delete)
- `src/content/` (delete directory)
- `scripts/migrate-content.ts` (delete)
- `CLAUDE.md` (update)

## Alternative Approaches Considered

1. **Incremental migration (Approach B)**: Keep Sveltia for old content, use Emdash for new content only. Rejected because dual-system maintenance creates editor confusion and doubles complexity.

2. **Emdash for editing, git for storage (Approach C)**: Use Emdash admin but export content back to files. Rejected because it fights the framework, loses instant publishing, and requires custom sync code.

3. **Keep Astro content collections alongside Emdash**: Use Emdash for editing but query via Astro's built-in content collections. Rejected because Emdash's LiveLoader is the intended query path and content lives in D1, not files.

## System-Wide Impact

### Interaction Graph

```
Content edit in Emdash Admin
  -> D1 INSERT/UPDATE (immediate)
  -> FTS5 index update (automatic)
  -> Next page request queries D1
  -> Cloudflare cache miss -> Worker renders page -> cache stores response
  -> Subsequent requests served from Cloudflare cache until TTL expires

Media upload in Emdash Admin
  -> R2 PUT (direct upload)
  -> D1 media metadata record
  -> Page renders <img> with R2 URL
  -> Cloudflare Image Resizing transforms on first request, caches result
```

### Error & Failure Propagation

- **D1 unavailable**: Pages fail to render. Cloudflare cache serves stale responses (`stale-while-revalidate`). Admin panel shows error.
- **R2 unavailable**: Images fail to load. Content text still renders. Cloudflare Image Resizing returns error for new images; cached transformations still serve.
- **Emdash bug**: Admin panel may break. Published content still queryable from D1 directly. Rollback: redeploy pre-migration commit + restore git content.

### State Lifecycle Risks

- **Partial migration**: If the migration script fails midway, some content is in D1, some only in git. Mitigation: migration script is idempotent (checks for existing slugs before inserting).
- **Translation group integrity**: If pt entry migrates but en fails, the translation link is broken. Mitigation: migrate both locales in a single transaction per content pair.
- **Orphaned R2 objects**: If content is deleted from D1 but media remains in R2. Low risk for a small site; Emdash's media library tracks references.

### API Surface Parity

| Interface          | Current                                               | After Migration                                            |
| ------------------ | ----------------------------------------------------- | ---------------------------------------------------------- |
| Content query      | `getCollection()` / `getEntry()` from `astro:content` | `getEmDashCollection()` / `getEmDashEntry()` from `emdash` |
| Content types      | `CollectionEntry<"blog">`                             | Generated types from `npx emdash types`                    |
| Rich text render   | `<Content />` from `astro:content`                    | `<PortableText />` from `astro-portabletext`               |
| Image optimization | `<Image>` with `ImageMetadata`                        | `<img>` with `cfImage()` URL helper                        |
| Search             | In-memory `body.includes(query)`                      | `searchCollection("blog", query, { locale })`              |
| CMS admin          | `/admin/` (Sveltia)                                   | `/_emdash/admin` (Emdash)                                  |

### Integration Test Scenarios

1. **Create blog post in PT, translate to EN, verify both appear on correct locale listing pages and share a translation group**
2. **Upload image via Emdash admin, verify it appears in blog post via Cloudflare Image Resizing with correct dimensions**
3. **Search for a Portuguese term, verify only PT results returned; search same term in EN context, verify no false cross-locale results**
4. **Edit a published post, verify the change appears on the site within seconds (no build needed)**
5. **Delete an event, verify it disappears from featured events on homepage and event listing**

## Acceptance Criteria

### Functional Requirements

- [ ] All 5 collections (authors, blog, events, gallery, locations) queryable from Emdash
- [ ] All existing content migrated with correct data, slugs, and locale assignments
- [ ] Blog articles and events render Portable Text bodies with correct formatting
- [ ] Images load from R2 via Cloudflare Image Resizing
- [ ] Search returns relevant, locale-scoped results via FTS5
- [ ] CMS editors can log in, create, edit, and publish content via Emdash admin
- [ ] i18n works: locale filtering, translation linking, language switching
- [ ] All existing URLs return 200 (no broken links)

### Non-Functional Requirements

- [ ] Page load time <= 200ms (D1 query + Worker render, before Cloudflare cache)
- [ ] Cloudflare cache hit ratio > 90% for content pages after warm-up
- [ ] Local development works with `bun run dev` (SQLite + local filesystem)
- [ ] `bun run build` and `bun run lint` pass

### Quality Gates

- [ ] URL smoke test: 100% of existing URLs return 200
- [ ] Visual comparison: content renders identically (minor Portable Text formatting differences acceptable)
- [ ] SEO: canonical URLs, JSON-LD, OG meta, sitemap all functional
- [ ] Auth: at least 2 editors can log in and manage content

## Success Metrics

- **Time to publish**: < 5 seconds (vs current minutes-to-hours via git workflow)
- **Content management UX**: Editors can create, translate, and publish without GitHub knowledge
- **Zero broken URLs**: All existing links continue to work

## Dependencies & Prerequisites

1. **Astro 6.0** — required for Emdash's LiveLoader. Must be upgraded first (Phase 0).
2. **Cloudflare account** — D1 and R2 access (free tier sufficient).
3. **Cloudflare Image Resizing** — requires Pro plan ($20/month) or an existing zone with this feature enabled. **Verify this is available on the current account before starting Phase 3.**
4. **GitHub OAuth App** — existing app can be reconfigured for Emdash, or a new one created.
5. **Domain DNS** — R2 custom domain (e.g., `media.massacritica.pt`) if public URLs are desired.

## Risk Analysis & Mitigation

| Risk                                    | Likelihood | Impact | Mitigation                                                                                   |
| --------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------- |
| Emdash beta instability                 | Medium     | High   | Pin version, keep git content as rollback, D1 Time Travel for data recovery                  |
| Astro 6 breaking changes                | Medium     | Medium | Upgrade in separate PR, verify before CMS migration                                          |
| Portable Text conversion loss           | Low        | Medium | Manual review of each converted article, visual comparison                                   |
| Cloudflare Image Resizing not available | Low        | High   | Verify account capabilities before Phase 3. Fallback: use Astro `<Image>` with remote images |
| Editor lockout during transition        | Low        | High   | Retain GitHub OAuth in Emdash, test auth before cutover                                      |
| D1 query performance                    | Low        | Medium | D1 read replication, Cloudflare cache headers, monitor latency                               |

## Future Considerations

- **Locations i18n**: Location entries contain Portuguese text (`exactLocation`, `customDate`) but are not translated. Emdash's row-per-locale model makes adding translations straightforward as a follow-up.
- **RSS feed**: Emdash + SSR makes it trivial to add an RSS feed endpoint.
- **Draft previews**: Emdash supports signed preview URLs for draft content — useful for editor review workflows.
- **Taxonomies**: Emdash has native taxonomy support. The current `tagMapper.ts` workaround could be replaced with Emdash taxonomies + built-in translation.
- **MCP integration**: Emdash has a built-in MCP server for AI-assisted content management.

## Documentation Plan

- [ ] Update `CLAUDE.md` — replace Decap CMS references with Emdash architecture
- [ ] Replace `CMS_SETUP.md` with Emdash setup guide (D1, R2, auth configuration)
- [ ] Document local development setup (SQLite + seed script)
- [ ] Document content migration process for future reference in `docs/solutions/`

## References & Research

### Internal References

- Brainstorm: `docs/brainstorms/2026-04-02-emdash-cms-migration-brainstorm.md`
- Current CMS config: `public/admin/config.yml`
- Content schema: `src/content/config.ts`
- Image utility: `src/utils/getOptimizedImage.ts`
- Tag mapper: `src/lib/tagMapper.ts`

### External References

- [Emdash CMS GitHub](https://github.com/emdash-cms/emdash)
- [astro-portabletext](https://github.com/theisel/astro-portabletext)
- [@sanity/block-tools (HTML -> Portable Text)](https://www.sanity.io/docs/developer-guides/presenting-block-text)
- [Cloudflare D1 docs](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 docs](https://developers.cloudflare.com/r2/)
- [Cloudflare Image Resizing](https://developers.cloudflare.com/images/image-resizing/)
- [Astro 6 migration guide](https://docs.astro.build/en/guides/upgrade-to/v6/)

### Complete File Change Manifest

**DELETE (4 files):**

1. `public/admin/config.yml`
2. `.github/workflows/cms-pr.yml`
3. `.github/workflows/sync-cms-branch.yml`
4. `CMS_SETUP.md`

**CREATE (6+ files):** 5. `wrangler.jsonc` 6. `src/live.config.ts` 7. `src/types/emdash.ts` (generated) 8. `src/utils/cfImage.ts` 9. `src/components/PortableTextRenderer.astro` 10. `src/components/blocks/ImageBlock.astro` 11. `scripts/migrate-content.ts`

**MODIFY (19 files):** 12. `package.json` 13. `astro.config.mjs` 14. `src/content/config.ts` (remove or replace) 15. `src/utils/getOptimizedImage.ts` 16. `src/utils/jsonLD.js` 17. `src/components/seo/Seo.astro` 18. `src/pages/[locale]/articles/index.astro` 19. `src/pages/[locale]/articles/[slug].astro` 20. `src/pages/[locale]/articles/search.astro` 21. `src/pages/[locale]/articles/tag/[tag].astro` 22. `src/pages/[locale]/events/index.astro` 23. `src/pages/[locale]/events/[slug].astro` 24. `src/pages/[locale]/gallery/[category].astro` 25. `src/pages/articles/api/search.json.ts` 26. `src/components/sections/FeaturedEvents.astro` 27. `src/components/sections/LastBlogArticle.astro` 28. `src/components/sections/Locations.astro` 29. `src/components/sections/GalleryView.astro` 30. `src/components/ui/ArticleCard.astro` 31. `src/components/ui/GalleryCard.astro` 32. `src/components/ui/EventCard.astro` (type annotation only)

**DELETE IN CLEANUP (Phase 6):** 33. `src/content/` directory (all content files) 34. `src/assets/images/` content migrated to R2 35. `scripts/migrate-content.ts`

**UNCHANGED:**

- `src/lib/tagMapper.ts` (CMS-agnostic)
- `src/middleware.ts` (Paraglide, CMS-agnostic)
- `src/i18n/utils.ts`
- `src/utils.ts`
- `src/components/ui/Tags.astro`
- `src/components/ui/LocationCard.astro` (static SVGs, not CMS media)
- `src/components/ui/EventCarousel.astro` (pure UI)
- `messages/pt.json`, `messages/en.json` (Paraglide, untouched)
