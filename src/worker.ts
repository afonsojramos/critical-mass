// Cloudflare Worker entry for the EmDash-powered site.
//
// Wraps the Astro Cloudflare server handler with EmDash's `scheduled()` handler
// so the Cron Trigger in wrangler.jsonc drives scheduled publishing, plugin
// cron, and system cleanup. Re-exports `PluginBridge` so the sandbox binding
// resolves against the entry module. Requires `"main": "src/worker.ts"` and a
// `triggers.crons` entry in wrangler.jsonc.
import emdashWorker from "@emdash-cms/cloudflare/worker";
import { canonicalRedirectUrl } from "./canonical-url";
import {
  isPrivateResponseRequest,
  privateRouteRedirectUrl,
  withPrivateResponseHeaders,
} from "./private-response";

export { PluginBridge } from "@emdash-cms/cloudflare/worker";
export { canonicalRedirectUrl } from "./canonical-url";

// Workers expose a default edge cache that the DOM's `CacheStorage` type
// (pulled in via astro/client) does not describe.
const edgeCache = (caches as unknown as { default: Cache }).default;

export default {
  ...emdashWorker,
  async fetch(request, env, ctx) {
    // Keep private redirects inside the Worker. Astro's static redirect layer
    // runs before this wrapper and cannot attach the response privacy policy.
    const privateRedirectUrl = privateRouteRedirectUrl(request.url);
    if (privateRedirectUrl) {
      return withPrivateResponseHeaders(Response.redirect(privateRedirectUrl, 308));
    }

    // Historical www/http/trailing-slash URLs are still in Google's index.
    // Normalize them at the edge so every variant permanently redirects to the
    // same URL emitted by canonical tags and the sitemap.
    const redirectUrl = canonicalRedirectUrl(request.url);
    if (redirectUrl) {
      const response = Response.redirect(redirectUrl, 308);
      return isPrivateResponseRequest(request, new URL(request.url).pathname)
        ? withPrivateResponseHeaders(response)
        : response;
    }

    const fetchHandler = emdashWorker.fetch;
    if (!fetchHandler) {
      return new Response("Worker fetch handler unavailable", { status: 500 });
    }

    // Worker responses bypass Cloudflare's HTTP cache, so the `s-maxage` that
    // public pages already send does nothing unless we go through the Cache
    // API ourselves. Restricted to cookie-less GETs: a signed-in editor's
    // response can carry visual-editing markup that must never be served to
    // anonymous visitors, and their own requests must never be answered from
    // a shared cache entry. The TTL comes from the page's own header.
    const isPrivate = isPrivateResponseRequest(request, new URL(request.url).pathname);
    const cacheable =
      !import.meta.env.DEV &&
      request.method === "GET" &&
      !isPrivate &&
      !request.headers.has("cookie");
    if (cacheable) {
      const cached = await edgeCache.match(request);
      if (cached) return cached;
    }

    const response = await fetchHandler(request, env, ctx);
    if (
      cacheable &&
      response.status === 200 &&
      !response.headers.has("set-cookie") &&
      (response.headers.get("cache-control") ?? "").includes("s-maxage")
    ) {
      ctx.waitUntil(edgeCache.put(request, response.clone()));
    }
    return isPrivate ? withPrivateResponseHeaders(response) : response;
  },
} satisfies ExportedHandler;
