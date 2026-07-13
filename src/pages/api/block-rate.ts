import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createWebHandler } from "blockrate";

// First-party blockrate reporter. The browser posts here (same origin) and this
// route forwards to blockrate.app with the server-side API key. Posting to
// blockrate.app directly from the client would invert the measurement the moment
// that domain lands on a blocklist. Unset key → 204 no-op (local dev).
export const prerender = false;

type ForwardHandler = (request: Request) => Promise<Response>;
let handler: ForwardHandler | null | undefined;

export const POST: APIRoute = async ({ request }) => {
  if (handler === undefined) {
    const apiKey = (env as { BLOCKRATE_API_KEY?: string }).BLOCKRATE_API_KEY;
    try {
      handler = apiKey ? createWebHandler({ forward: { apiKey } }) : null;
    } catch (err) {
      console.error("[blockrate] handler construction failed — check BLOCKRATE_API_KEY", err);
      handler = null;
    }
  }
  return handler ? handler(request) : new Response(null, { status: 204 });
};
