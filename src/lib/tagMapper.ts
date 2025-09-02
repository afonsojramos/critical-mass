/**
 * Tag translation mapper
 * Stores English tags in content, displays appropriate language in frontend
 */

export const tagTranslations = {
  cycling: {
    pt: "ciclismo",
    en: "cycling",
  },
  activism: {
    pt: "ativismo",
    en: "activism",
  },
  history: {
    pt: "história",
    en: "history",
  },
  safety: {
    pt: "segurança",
    en: "safety",
  },
  tips: {
    pt: "dicas",
    en: "tips",
  },
  "urban-planning": {
    pt: "urbanismo",
    en: "urban planning",
  },
  community: {
    pt: "comunidade",
    en: "community",
  },
  events: {
    pt: "eventos",
    en: "events",
  },
  sustainability: {
    pt: "sustentabilidade",
    en: "sustainability",
  },
  mobility: {
    pt: "mobilidade",
    en: "mobility",
  },
  transport: {
    pt: "transporte",
    en: "transport",
  },
  bicycle: {
    pt: "bicicleta",
    en: "bicycle",
  },
} as const;

export type TagKey = keyof typeof tagTranslations;
export type Locale = "pt" | "en";

/**
 * Translate an English tag to the specified locale
 */
export function translateTag(enTag: string, locale: Locale): string {
  const tagKey = enTag as TagKey;
  return tagTranslations[tagKey]?.[locale] || enTag;
}

/**
 * Translate an array of English tags to the specified locale
 */
export function translateTags(enTags: string[], locale: Locale): string[] {
  return enTags.map((tag) => translateTag(tag, locale));
}

/**
 * Get all available English tag keys (for CMS configuration)
 */
export function getEnglishTags(): string[] {
  return Object.keys(tagTranslations);
}

/**
 * Get all translated tags for a specific locale
 */
export function getTranslatedTags(locale: Locale): string[] {
  return Object.values(tagTranslations).map((translation) => translation[locale]);
}

/**
 * Create a tag slug for URL purposes (lowercase, no accents, hyphenated)
 */
export function createTagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\s+/g, "-"); // Replace spaces with hyphens
}
