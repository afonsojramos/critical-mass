// @ts-check
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { baseLocale, locales } from "./src/paraglide/runtime";

// https://astro.build/config
export default defineConfig({
  site: "https://massacritica.pt",
  vite: {
    plugins: [
      tailwindcss(),
      paraglideVitePlugin({
        project: "./project.inlang",
        outdir: "./src/paraglide",
        disableAsyncLocalStorage: true,
        // globalVariable is set per-request by our middleware (see src/middleware.ts).
        // It survives nested run() calls that the mock AsyncLocalStorage doesn't.
        strategy: ["globalVariable", "url", "cookie"],
      }),
    ],
  },
  integrations: [
    react(),
    // Emdash CMS — uses D1 for database and R2 for media.
    // In local dev, the Cloudflare Vite plugin emulates D1 with local SQLite
    // and R2 with local filesystem automatically.
    emdash({
      database: d1({ binding: "DB" }),
      storage: r2({ binding: "MEDIA" }),
    }),
    sitemap(),
  ],
  output: "server",
  adapter: cloudflare({
    imageService: "compile",
  }),
  redirects: {
    "/admin": "/_emdash/admin",
  },
  i18n: {
    locales: [...locales],
    defaultLocale: baseLocale,
    // Manual routing: Paraglide middleware handles locale detection/redirects.
    // This prevents Astro's built-in i18n from intercepting /_emdash CMS routes.
    routing: "manual",
  },
});
