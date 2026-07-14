import type { APIRoute } from "astro";
import { getEmDashCollection, getTaxonomyTerms } from "emdash";
import { entryRouteSlug } from "@/utils/entryRouteSlug";

const ORIGIN = "https://massacritica.pt";
const LOCALES = ["pt", "en"] as const;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const GET: APIRoute = async () => {
  const paths = new Set<string>();

  for (const locale of LOCALES) {
    paths.add(`/${locale}`);
    paths.add(`/${locale}/articles`);
    paths.add(`/${locale}/events`);
    paths.add(`/${locale}/gallery`);

    const [{ entries: articles }, { entries: events }, categories] = await Promise.all([
      getEmDashCollection("blog", { status: "published", locale }),
      getEmDashCollection("events", { status: "published", locale }),
      getTaxonomyTerms("category", { locale }),
    ]);

    for (const article of articles) {
      paths.add(`/${locale}/articles/${entryRouteSlug(article.id, locale)}`);
    }
    for (const event of events) {
      paths.add(`/${locale}/events/${entryRouteSlug(event.id, locale)}`);
    }
    for (const category of categories) {
      paths.add(`/${locale}/gallery/${category.slug}`);
    }
  }

  const urls = [...paths]
    .sort()
    .map((path) => `  <url><loc>${escapeXml(`${ORIGIN}${path}`)}</loc></url>`)
    .join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
};
