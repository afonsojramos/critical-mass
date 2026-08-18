const CANONICAL_HOST = "massacritica.pt";
const DUPLICATE_LOCALE_PATH = /^\/(pt|en)\/(articles|events)\/\1\/(.+?)\/?$/;
// Local dev (Cloudflare Vite plugin) serves the Worker over plain http.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function canonicalRedirectUrl(requestUrl: string): URL | null {
  const url = new URL(requestUrl);
  let changed = false;

  if (url.protocol !== "https:" && !LOCAL_HOSTS.has(url.hostname)) {
    url.protocol = "https:";
    changed = true;
  }

  if (url.hostname === `www.${CANONICAL_HOST}`) {
    url.hostname = CANONICAL_HOST;
    changed = true;
  }

  const duplicateLocale = url.pathname.match(DUPLICATE_LOCALE_PATH);
  if (duplicateLocale) {
    url.pathname = `/${duplicateLocale[1]}/${duplicateLocale[2]}/${duplicateLocale[3]}`;
    changed = true;
  } else if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
    changed = true;
  }

  return changed ? url : null;
}
