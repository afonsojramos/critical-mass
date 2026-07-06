import { getTaxonomyTerms, getTranslations } from "emdash";
import { baseLocale, locales } from "@/paraglide/runtime";

function otherLocale(current: string): string {
  return (locales as readonly string[]).find((l) => l !== current) ?? baseLocale;
}

/**
 * Other-locale URL for a content entry page (event, article), resolved via the
 * entry's translation so the language switcher lands on the same content even
 * when slugs differ per locale. Falls back to the section index when there is
 * no published translation.
 *
 * @param collection - emdash collection (e.g. "events", "blog")
 * @param entryId    - the entry's DB id (`entry.data.id`)
 * @param current    - the current locale
 * @param slugBase   - path before the slug (e.g. "events", "articles")
 * @param indexPath  - fallback path when no translation exists (defaults to slugBase)
 */
export async function entryLocaleSwitchHref(
  collection: string,
  entryId: string,
  current: string,
  slugBase: string,
  indexPath: string = slugBase,
): Promise<string> {
  const other = otherLocale(current);
  const { translations } = await getTranslations(collection, entryId);
  const alt = translations.find((t) => t.locale === other && t.status === "published" && t.slug);
  return alt?.slug ? `/${other}/${slugBase}/${alt.slug}` : `/${other}/${indexPath}`;
}

/**
 * Other-locale URL for a taxonomy term page (tag, category), resolved via the
 * term's translation group so the switcher lands on the localized term URL.
 * Falls back to the section index when no translated term exists.
 *
 * @param taxonomy - emdash taxonomy (e.g. "tag", "category")
 * @param termSlug - the current (localized) term slug from the URL
 * @param current  - the current locale
 * @param slugBase - path before the slug (e.g. "articles/tag", "gallery")
 * @param indexPath - fallback path when no translated term exists
 */
export async function termLocaleSwitchHref(
  taxonomy: string,
  termSlug: string,
  current: string,
  slugBase: string,
  indexPath: string,
): Promise<string> {
  const other = otherLocale(current);
  const currentTerms = await getTaxonomyTerms(taxonomy, { locale: current });
  const group = currentTerms.find((t) => t.slug === termSlug)?.translationGroup;
  if (group) {
    const otherTerms = await getTaxonomyTerms(taxonomy, { locale: other });
    const alt = otherTerms.find((t) => t.translationGroup === group);
    if (alt?.slug) return `/${other}/${slugBase}/${alt.slug}`;
  }
  return `/${other}/${indexPath}`;
}
