import { getTaxonomyTerms } from "emdash";

/**
 * Resolve a localized term slug to its base-locale (pt) slug.
 *
 * Emdash normalizes taxonomy assignments to the translation-group root (the
 * base-locale term), and the term filter matches by that root's slug. So to
 * filter by a localized URL slug (e.g. `cycling` on `/en/...`) we first map it
 * back to the base slug (`ciclismo`). The pt slug is already the base.
 */
export async function resolveBaseTermSlug(
  taxonomy: string,
  slug: string,
  locale: string,
): Promise<string> {
  if (locale === "pt") return slug;
  // biome-ignore lint/suspicious/noExplicitAny: Emdash returns untyped terms
  const localized = (await getTaxonomyTerms(taxonomy, { locale })) as any[];
  const group = localized.find((t) => t.slug === slug)?.translationGroup;
  if (!group) return slug;
  // biome-ignore lint/suspicious/noExplicitAny: Emdash returns untyped terms
  const base = (await getTaxonomyTerms(taxonomy, { locale: "pt" })) as any[];
  return base.find((t) => t.translationGroup === group)?.slug ?? slug;
}
