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

    const response = await fetchHandler(request, env, ctx);
    return isPrivateResponseRequest(request, new URL(request.url).pathname)
      ? withPrivateResponseHeaders(response)
      : response;
  },
} satisfies ExportedHandler;
