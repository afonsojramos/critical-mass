// @ts-check
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { github } from "emdash/auth/providers/github";
import { google } from "emdash/auth/providers/google";
import { baseLocale, locales } from "./src/paraglide/runtime";
import { emailCloudflare } from "./src/plugins/email-cloudflare";

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
      siteUrl: "https://massacritica.pt",
      database: d1({ binding: "DB" }),
      storage: r2({ binding: "MEDIA" }),
      // "Sign in with Google/GitHub" alongside passkeys. Requires the
      // EMDASH_OAUTH_{GOOGLE,GITHUB}_CLIENT_ID/SECRET secrets.
      authProviders: [google(), github()],
      plugins: [
        emailCloudflare({
          from: "auth@admin.massacritica.pt",
          fromName: "Massa Crítica",
        }),
      ],
    }),
  ],
  output: "server",
  adapter: cloudflare({
    imageService: "compile",
  }),
  redirects: {
    "/sitemap-index.xml": "/sitemap.xml",
    "/sitemap-0.xml": "/sitemap.xml",
  },
  i18n: {
    locales: [...locales],
    defaultLocale: baseLocale,
    // Manual routing: Paraglide middleware handles locale detection/redirects.
    // This prevents Astro's built-in i18n from intercepting /_emdash CMS routes.
    routing: "manual",
  },
});
