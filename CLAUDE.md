# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Astro-based multilingual website for Critical Mass Portugal. The site features:

- Multilingual support (Portuguese/English) via Paraglide and Emdash
- Content management via Emdash CMS (database-first, Portable Text)
- Server-side rendering with Cloudflare adapter
- TailwindCSS for styling
- Cloudflare D1 for content storage, R2 for media

## Development Commands

```bash
# Development
pnpm install                 # Install dependencies
pnpm run dev                 # Start dev server at localhost:4321
pnpm run build               # Build production site (includes astro check)
pnpm run preview             # Preview build locally

# Code Quality
pnpm run lint                # Lint JS/TS with Oxlint (Vite+)
pnpm run format              # Format with Oxfmt (Vite+) — JS/TS, CSS, JSON/JSONC, Markdown
```

## Architecture

### Internationalization

- Base locale: Portuguese (`pt`)
- Supported locales: `pt`, `en`
- UI strings: Paraglide catalogs in `messages/{locale}.json`
- Content i18n: Emdash row-per-locale with `translation_group` linking
- Generated Paraglide modules live in `src/paraglide/` and must not be edited by hand
- Middleware sets Paraglide's locale from the locale-prefixed public URL

### Content Management

- CMS: Emdash CMS at `/_emdash/admin`
- Database: Cloudflare D1 (production) / SQLite (local dev)
- Media: Cloudflare R2 (production) / local filesystem (local dev)
- Content format: Portable Text (structured JSON), rendered via `astro-portabletext`
- Collections: authors, blog, events, gallery, locations
- Gallery's `author` field is an Emdash reference to the authors content type, rendered by the custom `content-reference` admin plugin
- Bulk gallery uploads: the `emdash-plugin-bulk-upload` npm package (our own OSS plugin), configured in `src/plugins/bulk-upload-admin.tsx` with plugin id `gallery-tools` (existing schema references `gallery-tools:month-year`)
- Query API: `getEmDashCollection()` and `getEmDashEntry()` from `emdash`
- Search: FTS5 full-text search via `search()` from `emdash`
- Legacy content files in `src/content/` (kept for reference during migration)

### Key Directories

- `src/components/sections/` - Page sections (Hero, FeaturedEvents, etc.)
- `src/components/ui/` - Reusable UI components
- `src/pages/[locale]/` - Localized pages with dynamic routing
- `messages/` - Paraglide source translation catalogs
- `src/i18n/` - Typed interface-copy adapter
- `src/content/` - Legacy content files (Markdown/JSON)
- `scripts/` - Migration and utility scripts

### Infrastructure

- `wrangler.jsonc` - Cloudflare Workers config (D1 + R2 bindings)
- Environment variables: `EMDASH_AUTH_SECRET`, `EMDASH_PREVIEW_SECRET`

### Styling

- TailwindCSS v4 with Vite plugin
- Global styles in `src/styles/global.css`

### Tooling

- Linting and formatting via Vite+ (`vp`): Oxlint (`pnpm run lint`) and Oxfmt (`pnpm run format`). `vite-plus` is pinned as a devDependency, so `pnpm install` provides the `vp` binary (no global install needed). The pre-commit hook resolves the local binary and skips checks with a warning if it is missing.
- Suppress a lint rule with an oxlint directive (`// oxlint-disable-next-line <rule>`), not Biome's `biome-ignore` (which oxlint ignores). Note oxlint's default config does not enable `no-explicit-any`.
- Oxfmt formats JS/TS, CSS, JSON/JSONC, and Markdown. It does not yet support `.astro`, so `.astro` files are currently left unformatted.

## Important Notes

- Always run the build command to compile Paraglide messages, test Emdash-backed content queries, and run Astro checks before committing
- Content pages are SSR-only (no prerendering) since they query D1 at runtime
- Local dev uses SQLite (`data.db`) and local filesystem (`uploads/`) — both gitignored
- Site deploys to Cloudflare with server-side rendering
