import { defineMiddleware } from "astro:middleware";
import { baseLocale, locales, setLocale } from "./paraglide/runtime.js";

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;

  // Public pages keep their historical locale-prefixed URLs.
  if (pathname === "/") {
    return new Response(null, {
      status: 302,
      headers: { Location: `/${baseLocale}` },
    });
  }

  // Set Paraglide's request locale from the URL. The global-variable strategy
  // survives the nested request context created by Emdash's middleware.
  const firstSegment = pathname.split("/")[1];
  if ((locales as readonly string[]).includes(firstSegment)) {
    setLocale(firstSegment as (typeof locales)[number], { reload: false });
  } else {
    setLocale(baseLocale, { reload: false });
  }

  return next();
});
