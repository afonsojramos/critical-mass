# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Astro-based multilingual website for Critical Mass Portugal. The site features:

- Multilingual support (Portuguese/English) via Inlang/Paraglide.js
- Content management via Emdash CMS (database-first, Portable Text)
- Server-side rendering with Cloudflare adapter
- TailwindCSS for styling
- Cloudflare D1 for content storage, R2 for media

## Development Commands

```bash
# Development
bun install                 # Install dependencies
bun run dev                 # Start dev server at localhost:4321
bun run build               # Build production site (includes i18n compile + astro check)
bun run preview             # Preview build locally

# Code Quality
bun run lint                # Lint JS/TS with Oxlint (Vite+)
bun run format              # Format with Oxfmt (Vite+) — JS/TS, CSS, JSON/JSONC, Markdown

# Internationalization
bun run machine-translate   # Auto-translate content using Inlang
```

## Architecture

### Internationalization

- Base locale: Portuguese (`pt`)
- Supported locales: `pt`, `en`
- UI strings: `messages/pt.json`, `messages/en.json` (Paraglide.js)
- Content i18n: Emdash row-per-locale with `translation_group` linking
- Generated code: `src/paraglide/` (auto-generated, don't edit manually)
- Build process compiles translations before Astro build

### Content Management

- CMS: Emdash CMS at `/_emdash/admin`
- Database: Cloudflare D1 (production) / SQLite (local dev)
- Media: Cloudflare R2 (production) / local filesystem (local dev)
- Content format: Portable Text (structured JSON), rendered via `astro-portabletext`
- Collections: authors, blog, events, gallery, locations
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

- Linting and formatting via Vite+ (`vp`): Oxlint (`bun run lint`) and Oxfmt (`bun run format`). Requires the global `vp` CLI (https://vite.plus); the pre-commit hook skips checks with a warning if it is missing.
- Oxfmt formats JS/TS, CSS, JSON/JSONC, and Markdown. It does not yet support `.astro`, so `.astro` files are currently left unformatted.

## Important Notes

- Always run build command to test i18n compilation before committing
- Content pages are SSR-only (no prerendering) since they query D1 at runtime
- Local dev uses SQLite (`data.db`) and local filesystem (`uploads/`) — both gitignored
- Site deploys to Cloudflare with server-side rendering
