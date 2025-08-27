/**
 * Tag translation mapper
 * Stores Portuguese tags in content, displays appropriate language in frontend
 */

export const tagTranslations = {
  ciclismo: {
    pt: "ciclismo",
    en: "cycling"
  },
  ativismo: {
    pt: "ativismo", 
    en: "activism"
  },
  história: {
    pt: "história",
    en: "history"
  },
  segurança: {
    pt: "segurança",
    en: "safety"
  },
  dicas: {
    pt: "dicas",
    en: "tips"
  },
  urbanismo: {
    pt: "urbanismo",
    en: "urban planning"
  },
  comunidade: {
    pt: "comunidade",
    en: "community"
  },
  eventos: {
    pt: "eventos",
    en: "events"
  },
  sustentabilidade: {
    pt: "sustentabilidade",
    en: "sustainability"
  },
  mobilidade: {
    pt: "mobilidade",
    en: "mobility"
  },
  transporte: {
    pt: "transporte",
    en: "transport"
  },
  bicicleta: {
    pt: "bicicleta",
    en: "bicycle"
  }
} as const;

export type TagKey = keyof typeof tagTranslations;
export type Locale = 'pt' | 'en';

/**
 * Translate a Portuguese tag to the specified locale
 */
export function translateTag(ptTag: string, locale: Locale): string {
  const tagKey = ptTag as TagKey;
  return tagTranslations[tagKey]?.[locale] || ptTag;
}

/**
 * Translate an array of Portuguese tags to the specified locale
 */
export function translateTags(ptTags: string[], locale: Locale): string[] {
  return ptTags.map(tag => translateTag(tag, locale));
}

/**
 * Get all available Portuguese tag keys (for CMS configuration)
 */
export function getPortugueseTags(): string[] {
  return Object.keys(tagTranslations);
}

/**
 * Get all translated tags for a specific locale
 */
export function getTranslatedTags(locale: Locale): string[] {
  return Object.values(tagTranslations).map(translation => translation[locale]);
}

/**
 * Create a tag slug for URL purposes (lowercase, no accents, hyphenated)
 */
export function createTagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, '-'); // Replace spaces with hyphens
}