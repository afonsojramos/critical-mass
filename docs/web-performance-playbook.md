# Web performance playbook

Critical Mass is an Astro SSR site whose performance depends on three systems at once:
Cloudflare delivery, D1/Emdash content queries, and media/client behavior. Measure those
layers separately and preserve Portuguese/English content parity while optimizing.

## Representative routes

Use realistic published content in both `pt` and `en`:

- localized homepage;
- events index and an event detail containing several images;
- articles index and an article detail with author/media content;
- gallery index and a populated category;
- article search with a result set and an empty result.

Run five iterations for each comparison. Keep the first as cold and report the median
of the remaining four as warm. Hold content revision, locale, device, viewport, and
network settings constant.

## Required evidence

| Layer       | Capture                                                                           |
| ----------- | --------------------------------------------------------------------------------- |
| Origin      | document response start/TTFB, D1 query count/duration, `Server-Timing`            |
| Delivery    | cache status/age, request count, transfer size, source-map policy                 |
| Rendering   | FCP, LCP, CLS, DOM size, image dimensions/decoding                                |
| Client      | JavaScript bytes by route, Swiper/Lenis loading, long tasks                       |
| Interaction | Event Timing/INP and action-to-ready latency for menus, gallery, carousel, search |

Event Timing does not include every async request. Report both the INP candidate and
the wall-clock time until the expected content is ready. Save CDP/automation traces
mode `0600` and avoid capturing CMS credentials or preview tokens.

## Existing delivery behavior

Public content routes intentionally use shared-cache windows such as
`s-maxage=300, stale-while-revalidate=3600`; search uses a shorter freshness window.
Keep these rules unless product freshness changes. Verify actual Cloudflare responses
after deployment rather than assuming an Astro header survived the adapter.

Only fingerprinted static assets may receive one-year immutable caching. HTML, search,
CMS/admin, preview, and personalized responses must not. Confirm public JavaScript
source maps match the intended deployment policy.

## Highest-value hypotheses

### Batch and reuse Emdash reads

Several list components resolve related authors one card at a time. For example,
article and gallery cards can call `getEmDashEntry()` for each rendered item. On a D1
SSR path this is an N+1 pattern even when the client receives no extra request.

- Fetch referenced authors once at the page/section boundary.
- Deduplicate author IDs and resolve them in a batch when Emdash supports it, or cache
  the in-flight per-request lookup by ID.
- Pass the resolved author into cards so presentational components do not own database
  access.
- Keep locale/translation-group semantics intact.

Also inspect homepage sections that independently call `getEmDashCollection()`. Share a
request-scoped result when they need the same collection/filter, and parallelize truly
independent collections.

Add server-only timings around collection, entry, taxonomy, author, search, and image
metadata work before consolidating broadly.

### Keep route JavaScript intentional

- Load Swiper only on routes/components that render a carousel.
- Load Lenis only where smooth scrolling is an explicit experience requirement and
  respect reduced-motion preferences.
- Prefer Astro markup and small inline behavior to hydrating React for static content.
- Inspect production chunks whenever `client:*` directives or interactive dependencies
  are added.

### Make media stable and appropriately sized

- Use `astro:assets`/`ContentImage` for bundled images with intrinsic dimensions.
- Ensure remote R2/Emdash media has a reserved aspect ratio before it loads.
- Generate responsive sources that match card, hero, article, and gallery display
  widths; do not serve the original upload everywhere.
- Preload only the actual above-the-fold LCP image. Additional preloads can delay CSS
  and the document.
- Test image-heavy routes on mobile, not just the homepage.

### Bound content without harming discovery

Use server pagination for large article, event, search, and gallery result sets when D1
and DOM measurements require it. Keep crawlable links and localized canonical paths;
do not replace public content with client-only infinite scrolling.

## Regression gates

- Track JavaScript and CSS bytes for the common Astro shell and interactive route
  chunks.
- Add query-count integration coverage for list/detail composition when author/taxonomy
  batching lands.
- Verify cache headers for HTML, search JSON, media, and hashed assets separately.
- Check both locales for LCP/CLS because translated copy can change wrapping and card
  height.
- Keep CMS/admin paths out of public bundle and cache assertions.

## React Doctor

React Doctor is supplementary at most. Most of the public site is Astro, and its
highest-value issues are SSR query shape, media delivery, and route-specific scripts.
Use it only for concrete React islands, excluding `dist`, dependencies, and worktrees.
It is not a Lighthouse or runtime trace replacement.

## Completion checklist

1. Run `nub run lint`, `nub run format`, and the mandatory `nub run build` so Astro
   and Emdash integration checks execute.
2. Inspect generated client/server assets and localized rendered HTML.
3. Deploy through the normal Cloudflare workflow.
4. Repeat the same route/locale/interaction traces on the deployed revision.
5. Record date, commit, environment, content fixture, locale, and cold/warm methodology
   beside each baseline.
