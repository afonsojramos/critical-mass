const GALLERY_PERIOD_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const LEGACY_DATE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?:T.*)?$/;

/** Normalize legacy ISO dates and current month values to YYYY-MM. */
export function normalizeGalleryPeriod(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  const current = trimmed.match(GALLERY_PERIOD_PATTERN);
  if (current) return current[0];
  const legacy = trimmed.match(LEGACY_DATE_PATTERN);
  return legacy ? `${legacy[1]}-${legacy[2]}` : undefined;
}

/** Return the exclusive upper bound for a YYYY-MM database range. */
export function nextGalleryPeriod(period: string): string | undefined {
  const normalized = normalizeGalleryPeriod(period);
  if (!normalized || normalized !== period) return undefined;

  const [yearText, monthText] = normalized.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (month === 12) return `${year + 1}-01`;
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function galleryPeriodRange(value: unknown): { gte: string; lt: string } | undefined {
  const period = normalizeGalleryPeriod(value);
  if (!period || period !== value) return undefined;
  const next = nextGalleryPeriod(period);
  return next ? { gte: period, lt: next } : undefined;
}

export function galleryPeriodLabel(value: unknown, locale: string): string | undefined {
  const period = normalizeGalleryPeriod(value);
  if (!period) return undefined;
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "pt-PT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}
