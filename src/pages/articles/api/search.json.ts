import type { APIRoute } from "astro";
import { search } from "emdash";

export const GET: APIRoute = async ({ url, currentLocale }): Promise<Response> => {
  const query: string | null = url.searchParams.get("query");
  const locale = url.searchParams.get("locale") ?? currentLocale;

  if (query === null) {
    return new Response(
      JSON.stringify({
        error: "Query param is missing",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  const searchResults = await search(query, { collections: ["blog"], limit: 20, locale });

  return new Response(JSON.stringify(searchResults.items), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600",
    },
  });
};
