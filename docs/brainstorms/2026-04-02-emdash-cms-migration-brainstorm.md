# Migrate from Sveltia CMS to Emdash CMS

**Date:** 2026-04-02
**Status:** Brainstorm complete

## What We're Building

A full migration from the current Sveltia CMS (Decap CMS fork) to Emdash CMS, moving from a git-based content management system to a database-first architecture on Cloudflare infrastructure.

### Current State

- **CMS:** Sveltia CMS loaded via `astro-decap-cms-oauth` integration
- **Content storage:** Markdown/YAML/JSON files in `src/content/` committed to git
- **i18n:** `multiple_folders` strategy with `pt/` and `en/` subdirectories per collection
- **Auth:** GitHub OAuth via server-side endpoint
- **Media:** Images in `src/assets/images`, processed by Astro's build pipeline
- **Publishing:** CMS edits pushed to `cms-updates` branch, auto-PR to `main`, deploy on merge
- **Collections:** authors, blog, events, gallery, locations (5 total)

### Target State

- **CMS:** Emdash CMS as Astro integration
- **Content storage:** Cloudflare D1 (SQLite-compatible serverless database)
- **i18n:** Emdash's native row-per-locale model with `translation_group` linking
- **Auth:** Passkeys (primary) + GitHub OAuth + Magic Links
- **Media:** Cloudflare R2 (S3-compatible object storage)
- **Publishing:** Instant — no git commits, no builds for content changes
- **Collections:** Same 5 collections, modeled in Emdash's schema system

## Why This Approach

**Full migration (Approach A)** chosen over incremental or hybrid approaches because:

1. **Clean break** — no dual-system maintenance or editor confusion
2. **Content volume is manageable** — migration script is feasible
3. **Already on Cloudflare** — D1 + R2 are natural additions to the existing deployment
4. **Full upgrade desired** — better editor experience, instant publishing, modern auth, and structured content (Portable Text) are all goals

## Key Decisions

1. **Database:** Cloudflare D1 (production) + SQLite (local development)
2. **Media storage:** Cloudflare R2 with Emdash's built-in media library
3. **Content format:** Portable Text (structured JSON) replaces Markdown
4. **i18n strategy:** Emdash's native row-per-locale model, reading from Astro's i18n config (`pt` default, `en` secondary, fallback `en` → `pt`)
5. **Auth:** Passkeys as primary, GitHub OAuth as fallback
6. **Existing content:** Migrated via script (Markdown → Portable Text, JSON fields preserved)
7. **Git workflows:** Remove `cms-pr.yml` and `sync-cms-branch.yml` GitHub Actions
8. **Formatting tolerance:** Minor formatting differences acceptable during Markdown → Portable Text conversion

## Migration Scope

### Remove

- `astro-decap-cms-oauth` integration and its config in `astro.config.mjs`
- `public/admin/config.yml` (Decap CMS configuration)
- `.github/workflows/cms-pr.yml` and `.github/workflows/sync-cms-branch.yml`
- `cms-updates` branch (after migration is complete)
- `CMS_SETUP.md` (replaced with Emdash-specific docs)

### Add

- `emdash` Astro integration with D1 + R2 adapters
- `src/live.config.ts` for Emdash content configuration
- Emdash collection schemas (5 collections: authors, blog, events, gallery, locations)
- Migration script to import existing content into D1
- Portable Text rendering components (replacing Markdown rendering)
- Environment variables: `EMDASH_AUTH_SECRET`, `EMDASH_PREVIEW_SECRET`
- Cloudflare D1 database and R2 bucket configuration (wrangler.toml)

### Modify

- `astro.config.mjs` — swap integration, add Astro i18n config
- Content querying — `getCollection()` → `getEmDashCollection()` across 13+ files
- Image handling — `getOptimizedImage.ts` may need updates for R2 media URLs
- Tag system — `tagMapper.ts` may need adaptation for new content structure

## Resolved Questions

1. **Emdash maturity:** Fine with beta — site is low-traffic/community-driven. No need for extra stability testing.
2. **Image optimization:** Use Cloudflare Image Resizing (runtime) instead of build-time sharp. Since content changes don't trigger builds, runtime optimization is the only option that handles new CMS uploads immediately.
3. **Cloudflare costs:** D1 + R2 free tiers are sufficient. Sandboxed plugins ($5/month paid tier) only needed if plugins are used — acceptable if needed.
4. **Portable Text rendering:** Emdash uses `astro-portabletext` (v0.11.0) as a dependency. No custom renderer needed — pass Portable Text fields directly to the `astro-portabletext` component.
5. **Content references:** Emdash has a `reference` field type that stores IDs linking to other collections (single or multiple). References are not auto-populated — query referenced entries separately via `getEmDashEntry()`. Maps well to the current `reference("authors")` pattern.
6. **Search:** Emdash provides FTS5 full-text search with Porter stemming, exposed via both JavaScript API (`search()`, `searchCollection()`, `getSuggestions()`) and REST endpoints (`/_emdash/api/search`). This can replace the current client-side search entirely, with server-side search and relevance scoring.
