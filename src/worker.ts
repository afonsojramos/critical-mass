// Cloudflare Worker entry for the EmDash-powered site.
//
// Wraps the Astro Cloudflare server handler with EmDash's `scheduled()` handler
// so the Cron Trigger in wrangler.jsonc drives scheduled publishing, plugin
// cron, and system cleanup. Re-exports `PluginBridge` so the sandbox binding
// resolves against the entry module. Requires `"main": "src/worker.ts"` and a
// `triggers.crons` entry in wrangler.jsonc.
export { default, PluginBridge } from "@emdash-cms/cloudflare/worker";
