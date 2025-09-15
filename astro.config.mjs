// @ts-check
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import decapCmsOauth from "astro-decap-cms-oauth";
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
        strategy: ["url", "cookie"],
      }),
    ],
  },
  integrations: [
    decapCmsOauth({
      decapCMSSrcUrl: "https://unpkg.com/@sveltia/cms/dist/sveltia-cms.js",
    }),
    sitemap(),
  ],
  output: "server",
  adapter: cloudflare({
    imageService: "compile",
  }),
  i18n: {
    locales: [...locales],
    defaultLocale: baseLocale,
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
