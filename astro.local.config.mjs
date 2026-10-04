// @ts-check
import cloudflare from "@astrojs/cloudflare";
import config from "./astro.config.mjs";

export default {
  ...config,
  adapter: cloudflare({
    imageService: "compile",
    remoteBindings: false,
    persistState: { path: ".wrangler/local-test" },
    inspectorPort: false,
  }),
};
