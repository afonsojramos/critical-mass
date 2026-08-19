import { m as messages } from "../paraglide/messages.js";

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
  gallery_no_results: string;
  gallery_by: string;
  gallery_all_categories: string;
  gallery_filter_title: string;
  gallery_filter_location: string;
  gallery_filter_all_locations: string;
  gallery_filter_period: string;
  gallery_filter_year: string;
  gallery_filter_month: string;
  gallery_filter_all_years: string;
  gallery_filter_all_months: string;
  gallery_filter_apply: string;
  gallery_filter_clear: string;
  location_sunday: string;
  location_monday: string;
  location_tuesday: string;
  location_wednesday: string;
  location_thursday: string;
  location_friday: string;
  location_saturday: string;
  location_last_friday_of_month: string;
  location_of_every_month: string;
}

type MessageFunction = (
  inputs?: Record<string, never>,
  options?: { locale?: "en" | "pt" },
) => string;

/** Resolve the generated Paraglide messages for the requested locale. */
export async function getSiteCopy(locale?: string): Promise<SiteCopy> {
  const resolvedLocale = locale === "en" ? "en" : "pt";
  const messageFunctions = messages as unknown as Record<keyof SiteCopy, MessageFunction>;
  return Object.fromEntries(
    Object.entries(messageFunctions).map(([key, message]) => [
      key,
      message({}, { locale: resolvedLocale }),
    ]),
  ) as unknown as SiteCopy;
}
