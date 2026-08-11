import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";
import {
  buildLocationCalendar,
  type CalendarLocale,
  type LocationCalendarEntry,
} from "./location-calendar";

export function createLocationCalendarRoute(locale: CalendarLocale): APIRoute {
  return async () => {
    const { entries } = await getEmDashCollection("locations", { status: "published" });
    const calendar = buildLocationCalendar(entries as LocationCalendarEntry[], locale);

    return new Response(calendar, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="critical-mass-${locale}.ics"`,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  };
}
