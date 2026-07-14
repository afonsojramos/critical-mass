export function entryRouteSlug(id: string, locale: string): string {
  const localePrefix = `${locale}/`;
  return id.startsWith(localePrefix) ? id.slice(localePrefix.length) : id;
}
