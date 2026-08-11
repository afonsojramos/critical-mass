export const baseLocale = "pt" as const;
export const locales = [baseLocale, "en"] as const;

export type Locale = (typeof locales)[number];

export function isLocale(value: string | undefined): value is Locale {
  return locales.some((locale) => locale === value);
}

export function resolveLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : baseLocale;
}
