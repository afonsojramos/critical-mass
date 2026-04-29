export function formatDate(date: Date | string, locale?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale === "pt" ? "pt-PT" : "en-US", options);
}

export function capitalize(str: string): string {
  if (typeof str !== "string" || str.length === 0) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}
