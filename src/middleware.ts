import { defineMiddleware } from "astro:middleware";
import { baseLocale, locales, setLocale } from "./paraglide/runtime.js";

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;

  // Redirect bare root to default locale
  if (pathname === "/") {
    return new Response(null, {
      status: 302,
      headers: { Location: `/${baseLocale}` },
    });
  }

  // Set Paraglide locale from URL prefix (/pt/..., /en/...) via globalVariable strategy.
  // We avoid paraglideMiddleware's mock AsyncLocalStorage because nested run() calls
  // (from Emdash's request-context middleware) clear the locale mid-render.
  const firstSegment = pathname.split("/")[1];
  if ((locales as readonly string[]).includes(firstSegment)) {
    setLocale(firstSegment as (typeof locales)[number], { reload: false });
  } else {
    // No locale prefix (a malformed or shared URL, e.g. /events/<slug>). Fall
    // back to the base locale so message lookups — including the 404 page —
    // don't throw "No locale found" and turn a plain 404 into a 500.
    setLocale(baseLocale, { reload: false });
  }

  return next();
});
