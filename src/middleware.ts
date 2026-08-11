import { defineMiddleware } from "astro:middleware";
import { baseLocale } from "./i18n/config";

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;

  // Public pages keep their historical locale-prefixed URLs. Astro derives
  // `Astro.currentLocale` from that prefix; Emdash reads the same i18n config.
  if (pathname === "/") {
    return new Response(null, {
      status: 302,
      headers: { Location: `/${baseLocale}` },
    });
  }

  return next();
});
