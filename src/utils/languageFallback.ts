/**
 * Simple version for static generation - constructs URL without async content checking
 * This is used during build time when we can't perform async operations
 */
export function getLanguageSwitchUrlStatic(targetLocale: string, currentRoute: string): string {
  // If we're on the home page, just switch locale
  if (!currentRoute || currentRoute === "") {
    return `/${targetLocale}`;
  }

  // Parse the route to understand what type of content we're dealing with
  const routeParts = currentRoute.split("/");
  const [section, ...rest] = routeParts;

  // For specific content pages (blog posts, events), fallback to the section index
  if (section === "articles" && rest.length > 0 && rest[0] !== "search" && rest[0] !== "tag") {
    // Specific blog post - fallback to articles index
    return `/${targetLocale}/articles`;
  }

  if (section === "events" && rest.length > 0) {
    // Specific event - fallback to events index
    return `/${targetLocale}/events`;
  }

  // For tag and search pages, fallback to articles index
  if (section === "articles" && (rest[0] === "tag" || rest[0] === "search")) {
    return `/${targetLocale}/articles`;
  }

  // For other routes, try direct translation
  return `/${targetLocale}/${currentRoute}`;
}
