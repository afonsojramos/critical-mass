# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Astro-based multilingual website for Critical Mass Portugal. The site features:

- Multilingual support (Portuguese/English) via Astro i18n and Emdash
- Content management via Emdash CMS (database-first, Portable Text)
- Server-side rendering with Cloudflare adapter
- TailwindCSS for styling
- Cloudflare D1 for content storage, R2 for media

## Development Commands

```bash
# Development
nub install                 # Install dependencies
nub run dev                 # Start dev server at localhost:4321
nub run build               # Build production site (includes astro check)
nub run preview             # Preview build locally

# Code Quality
nub run lint                # Lint JS/TS with Oxlint (Vite+)
nub run format              # Format with Oxfmt (Vite+) — JS/TS, CSS, JSON/JSONC, Markdown

# Content schema migration
EMDASH_TOKEN=... nub run cms:migrate
```

## Architecture

### Internationalization

- Base locale: Portuguese (`pt`)
- Supported locales: `pt`, `en`
- UI strings: localized `site_copy` entries in Emdash
- Content i18n: Emdash row-per-locale with `translation_group` linking
- Locale constants and the typed query helper live in `src/i18n/`
- Astro derives `Astro.currentLocale` from the locale-prefixed public URL

### Content Management

- CMS: Emdash CMS at `/_emdash/admin`
- Database: Cloudflare D1 (production) / SQLite (local dev)
- Media: Cloudflare R2 (production) / local filesystem (local dev)
- Content format: Portable Text (structured JSON), rendered via `astro-portabletext`
- Collections: authors, blog, events, gallery, locations, site_copy
- Gallery's `author` field is an Emdash reference to the authors content type
- Query API: `getEmDashCollection()` and `getEmDashEntry()` from `emdash`
- Search: FTS5 full-text search via `search()` from `emdash`
- Legacy content files in `src/content/` (kept for reference during migration)

### Key Directories

- `src/components/sections/` - Page sections (Hero, FeaturedEvents, etc.)
- `src/components/ui/` - Reusable UI components
- `src/pages/[locale]/` - Localized pages with dynamic routing
- `src/i18n/` - Internationalization utilities
- `src/content/` - Legacy content files (Markdown/JSON)
- `scripts/` - Migration and utility scripts

### Infrastructure

- `wrangler.jsonc` - Cloudflare Workers config (D1 + R2 bindings)
- Environment variables: `EMDASH_AUTH_SECRET`, `EMDASH_PREVIEW_SECRET`

### Styling

- TailwindCSS v4 with Vite plugin
- Global styles in `src/styles/global.css`

### Tooling

- Linting and formatting via Vite+ (`vp`): Oxlint (`nub run lint`) and Oxfmt (`nub run format`). `vite-plus` is pinned as a devDependency, so `nub install` provides the `vp` binary (no global install needed). The pre-commit hook resolves the local binary and skips checks with a warning if it is missing.
- Suppress a lint rule with an oxlint directive (`// oxlint-disable-next-line <rule>`), not Biome's `biome-ignore` (which oxlint ignores). Note oxlint's default config does not enable `no-explicit-any`.
- Oxfmt formats JS/TS, CSS, JSON/JSONC, and Markdown. It does not yet support `.astro`, so `.astro` files are currently left unformatted.

## Important Notes

- Always run the build command to test Emdash-backed locale queries and Astro checks before committing
- Content pages are SSR-only (no prerendering) since they query D1 at runtime
- Local dev uses SQLite (`data.db`) and local filesystem (`uploads/`) — both gitignored
- Site deploys to Cloudflare with server-side rendering
