import { getEmDashEntry } from "emdash";
import { resolveLocale, type Locale } from "./config";

export interface SiteCopy {
  title: string;
  description: string;
  nav_events: string;
  nav_locations: string;
  nav_blog: string;
  nav_home: string;
  nav_gallery: string;
  hero_title: string;
  hero_description: string;
  hero_app_purpose: string;
  hero_button: string;
  hero_download_calendar: string;
  locations_title: string;
  locations_description: string;
  locations_more_coming_soon: string;
  locations_create_your_movement: string;
  locations_send_email: string;
  events_title: string;
  events_description: string;
  events_view_all: string;
  events_join: string;
  events_service_info: string;
  events_no_image: string;
  footer_contact: string;
  footer_privacy: string;
  footer_contribute: string;
  search_placeholder: string;
  search_button: string;
  button_read_more: string;
  blog_title: string;
  blog_description: string;
  blog_written_by: string;
  blog_on: string;
  blog_all_articles: string;
  page_not_found_title: string;
  page_not_found_back_home: string;
  articles_tag: string;
  partners: string;
  communities: string;
  gallery_title: string;
  gallery_description: string;
  gallery_no_images: string;
  gallery_by: string;
  location_sunday: string;
  location_monday: string;
  location_tuesday: string;
  location_wednesday: string;
  location_thursday: string;
  location_friday: string;
  location_saturday: string;
  location_of_every_month: string;
}

/**
 * Load interface copy from Emdash's localized `site_copy` content type.
 * Emdash request caching deduplicates this lookup when several components
 * render during the same request.
 */
export async function getSiteCopy(locale?: string): Promise<SiteCopy> {
  const resolvedLocale: Locale = resolveLocale(locale);
  const { entry, error } = await getEmDashEntry<"site_copy", SiteCopy>("site_copy", "site-copy", {
    locale: resolvedLocale,
  });

  if (!entry) {
    const detail = error ? `: ${error.message}` : "";
    throw new Error(
      `Missing published Emdash site copy for locale "${resolvedLocale}"${detail}. Run \`nub run cms:migrate\` before deploying this revision.`,
    );
  }

  return entry.data;
}
