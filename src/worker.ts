// Cloudflare Worker entry for the EmDash-powered site.
//
// Wraps the Astro Cloudflare server handler with EmDash's `scheduled()` handler
// so the Cron Trigger in wrangler.jsonc drives scheduled publishing, plugin
// cron, and system cleanup. Re-exports `PluginBridge` so the sandbox binding
// resolves against the entry module. Requires `"main": "src/worker.ts"` and a
// `triggers.crons` entry in wrangler.jsonc.
import emdashWorker from "@emdash-cms/cloudflare/worker";

export { PluginBridge } from "@emdash-cms/cloudflare/worker";

const CANONICAL_HOST = "massacritica.pt";
const DUPLICATE_LOCALE_PATH = /^\/(pt|en)\/(articles|events)\/\1\/(.+?)\/?$/;

export function canonicalRedirectUrl(requestUrl: string): URL | null {
  const url = new URL(requestUrl);
  let changed = false;

  if (url.protocol !== "https:") {
    url.protocol = "https:";
    changed = true;
  }

  if (url.hostname === `www.${CANONICAL_HOST}`) {
    url.hostname = CANONICAL_HOST;
    changed = true;
  }

  const duplicateLocale = url.pathname.match(DUPLICATE_LOCALE_PATH);
  if (duplicateLocale) {
    url.pathname = `/${duplicateLocale[1]}/${duplicateLocale[2]}/${duplicateLocale[3]}`;
    changed = true;
  } else if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
    changed = true;
  }

  return changed ? url : null;
}

export default {
  ...emdashWorker,
  fetch(request, env, ctx) {
    // Historical www/http/trailing-slash URLs are still in Google's index.
    // Normalize them at the edge so every variant permanently redirects to the
    // same URL emitted by canonical tags and the sitemap.
    const redirectUrl = canonicalRedirectUrl(request.url);
    if (redirectUrl) {
      return Response.redirect(redirectUrl, 308);
    }

    const fetchHandler = emdashWorker.fetch;
    if (!fetchHandler) {
      return new Response("Worker fetch handler unavailable", { status: 500 });
    }

    return fetchHandler(request, env, ctx);
  },
} satisfies ExportedHandler;
