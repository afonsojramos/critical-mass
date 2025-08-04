// @ts-check
import cloudflare from "@astrojs/cloudflare";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import decapCmsOauth from "astro-decap-cms-oauth";
import { defineConfig } from "astro/config";
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
  ],
  output: "server",
  adapter: cloudflare(),
  i18n: {
    locales: [...locales],
    defaultLocale: baseLocale,
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
