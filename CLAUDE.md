# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Astro-based multilingual website for Critical Mass Portugal. The site features:
- Multilingual support (Portuguese/English) via Inlang/Paraglide.js
- Content management via Decap CMS (formerly Netlify CMS)
- Server-side rendering with Cloudflare adapter
- TailwindCSS for styling
- Content collections for blog articles and events

## Development Commands

```bash
# Development
bun install                 # Install dependencies
bun run dev                 # Start dev server at localhost:4321
bun run build               # Build production site (includes i18n compile + astro check)
bun run preview             # Preview build locally

# Code Quality
bun run lint                # Check code with Biome (fails on warnings)
bun run lint:fix            # Auto-fix Biome issues

# Internationalization
bun run machine-translate   # Auto-translate content using Inlang
```

## Architecture

### Internationalization
- Base locale: Portuguese (`pt`)
- Supported locales: `pt`, `en`
- Translation files: `messages/pt.json`, `messages/en.json`
- Generated code: `src/paraglide/` (auto-generated, don't edit manually)
- Build process compiles translations before Astro build

### Content Management
- Blog posts: `src/content/blog/{locale}/`
- Events: `src/content/events/{locale}/`
- Content schema defined in `src/content/config.ts`
- CMS admin at `/admin` using Decap CMS with OAuth

### Key Directories
- `src/components/sections/` - Page sections (Hero, FeaturedEvents, etc.)
- `src/components/ui/` - Reusable UI components
- `src/pages/[locale]/` - Localized pages with dynamic routing
- `src/i18n/` - Internationalization utilities
- `public/admin/config.yml` - CMS configuration

### Styling
- TailwindCSS v4 with Vite plugin
- Global styles in `src/styles/global.css`
- Biome formatting with 2-space indentation, 100-char line width

## Important Notes

- Always run build command to test i18n compilation before committing
- Content changes may require CMS OAuth setup (see CMS_SETUP.md)
- Site deploys to Cloudflare with server-side rendering