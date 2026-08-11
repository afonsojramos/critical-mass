import { EmDashClient, type ContentItem } from "emdash/client";

type FieldType = "string" | "text" | "reference";

interface FieldDefinition {
  slug: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Record<string, unknown>;
  translatable?: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

const baseUrl = (process.env.EMDASH_URL ?? "https://massacritica.pt").replace(/\/$/, "");
const token = process.env.EMDASH_TOKEN;

if (!token) {
  throw new Error(
    "EMDASH_TOKEN is required. Create a token with schema and content permissions, then run `EMDASH_TOKEN=... nub run cms:migrate`.",
  );
}

const client = new EmDashClient({ baseUrl, token });

const copyFields: FieldDefinition[] = [
  ["title", "Site title", "string"],
  ["description", "Site description", "text"],
  ["nav_events", "Navigation: events", "string"],
  ["nav_locations", "Navigation: locations", "string"],
  ["nav_blog", "Navigation: blog", "string"],
  ["nav_home", "Navigation: home", "string"],
  ["nav_gallery", "Navigation: gallery", "string"],
  ["hero_title", "Hero title", "string"],
  ["hero_description", "Hero description", "text"],
  ["hero_app_purpose", "Hero application purpose", "text"],
  ["hero_button", "Hero button", "string"],
  ["hero_download_calendar", "Hero calendar button", "string"],
  ["locations_title", "Locations title", "string"],
  ["locations_description", "Locations description", "string"],
  ["locations_more_coming_soon", "Locations coming soon", "string"],
  ["locations_create_your_movement", "Locations call to action", "string"],
  ["locations_send_email", "Locations email button", "string"],
  ["events_title", "Events title", "string"],
  ["events_description", "Events description", "text"],
  ["events_view_all", "Events view all", "string"],
  ["events_join", "Events join", "string"],
  ["events_service_info", "Event information", "string"],
  ["events_no_image", "Events missing image", "string"],
  ["footer_contact", "Footer contact", "string"],
  ["footer_privacy", "Footer privacy", "string"],
  ["footer_contribute", "Footer contribute", "string"],
  ["search_placeholder", "Search placeholder", "string"],
  ["search_button", "Search button", "string"],
  ["button_read_more", "Read more button", "string"],
  ["blog_title", "Blog title", "string"],
  ["blog_description", "Blog description", "text"],
  ["blog_written_by", "Blog written by", "string"],
  ["blog_on", "Blog date separator", "string"],
  ["blog_all_articles", "Blog all articles", "string"],
  ["page_not_found_title", "Not found title", "string"],
  ["page_not_found_back_home", "Not found home button", "string"],
  ["articles_tag", "Articles tag title", "string"],
  ["partners", "Partners", "string"],
  ["communities", "Communities", "string"],
  ["gallery_title", "Gallery title", "string"],
  ["gallery_description", "Gallery description", "text"],
  ["gallery_no_images", "Gallery empty state", "string"],
  ["gallery_by", "Gallery author prefix", "string"],
  ["location_sunday", "Sunday", "string"],
  ["location_monday", "Monday", "string"],
  ["location_tuesday", "Tuesday", "string"],
  ["location_wednesday", "Wednesday", "string"],
  ["location_thursday", "Thursday", "string"],
  ["location_friday", "Friday", "string"],
  ["location_saturday", "Saturday", "string"],
  ["location_of_every_month", "Of every month", "string"],
].map(([slug, label, type]) => ({
  slug,
  label,
  type: type as FieldType,
  required: true,
  translatable: true,
}));

const copy = {
  pt: {
    title: "Massa Crítica Portugal",
    description:
      "Junta-te ao movimento ciclístico mensal que transforma as ruas da cidade em espaços de comunidade, ativismo e celebração da cultura da bicicleta em Portugal.",
    nav_events: "Eventos",
    nav_locations: "Pontos de\nEncontro",
    nav_blog: "Blog",
    nav_home: "Massa Crítica",
    nav_gallery: "Galeria",
    hero_title: "Massa Crítica",
    hero_description:
      "Todas as últimas sextas-feiras do mês, ciclistas de todo o Portugal reúnem-se para recuperar as ruas, construir comunidade e defender cidades mais seguras e amigas da bicicleta. Junta-te a este movimento pacífico mas poderoso.",
    hero_app_purpose:
      "A Massa Crítica Portugal é o site público dos pontos de encontro, eventos, galeria e artigos do movimento. Os editores autorizados utilizam o início de sessão com Google para gerir estes conteúdos.",
    hero_button: "Junta-te ao próximo evento!",
    hero_download_calendar: "Adicionar ao calendário",
    locations_title: "Pontos de Encontro",
    locations_description: "Onde nos encontramos",
    locations_more_coming_soon: "A tua cidade pode ser a próxima!",
    locations_create_your_movement: "Leva a Massa Crítica para a tua cidade!",
    locations_send_email: "Envia-nos um Email",
    events_title: "Eventos",
    events_description: "Iniciativas organizadas por nós ou pela comunidade",
    events_view_all: "Ver Todos os Eventos",
    events_join: "Saber mais",
    events_service_info: "Informações do Evento",
    events_no_image: "Imagem não disponível",
    footer_contact: "Envia-nos um email para",
    footer_privacy: "Política de Privacidade",
    footer_contribute: "Gostarias de contribuir?",
    search_placeholder: "Pesquisar artigos...",
    search_button: "Pesquisar",
    button_read_more: "Ler Mais",
    blog_title: "Blog",
    blog_description: "Lê sobre alguns dos nossos últimos projetos e pensamentos.",
    blog_written_by: "Escrito por ",
    blog_on: " no dia ",
    blog_all_articles: "Todos os artigos",
    page_not_found_title: "Página não encontrada",
    page_not_found_back_home: "Voltar para a página inicial",
    articles_tag: "Artigos com a etiqueta",
    partners: "Parceiros",
    communities: "Outras Comunidades",
    gallery_title: "Galeria",
    gallery_description: "Momentos capturados das nossas iniciativas e eventos",
    gallery_no_images: "Nenhuma imagem disponível ainda.",
    gallery_by: "Por",
    location_sunday: "Domingo",
    location_monday: "Segunda-feira",
    location_tuesday: "Terça-feira",
    location_wednesday: "Quarta-feira",
    location_thursday: "Quinta-feira",
    location_friday: "Sexta-feira",
    location_saturday: "Sábado",
    location_of_every_month: "do mês",
  },
  en: {
    title: "Massa Crítica Portugal",
    description:
      "Join the monthly cycling movement that transforms city streets into spaces for community, advocacy, and celebration of bike culture in Portugal.",
    nav_events: "Events",
    nav_locations: "Locations",
    nav_blog: "Blog",
    nav_home: "Critical Mass",
    nav_gallery: "Gallery",
    hero_title: "Massa Crítica\nPortugal",
    hero_description:
      "Every last Friday of the month, cyclists across Portugal gather to reclaim the streets, build community, and advocate for safer, more bike-friendly cities. Join us in this peaceful yet powerful movement.",
    hero_app_purpose:
      "Massa Crítica Portugal is the public website for the movement's meeting points, events, gallery, and articles. Authorised editors use Google Sign-In to manage this content.",
    hero_button: "Join the next event!",
    hero_download_calendar: "Add to Calendar",
    locations_title: "Meeting Points",
    locations_description: "Where we meet",
    locations_more_coming_soon: "Your city could be next!",
    locations_create_your_movement: "Bring Critical Mass to your city!",
    locations_send_email: "Send us an Email",
    events_title: "Events",
    events_description: "Initiatives hosted by us or the community",
    events_view_all: "View All Events",
    events_join: "Know more",
    events_service_info: "Event Info",
    events_no_image: "No image available",
    footer_contact: "Send us an email to",
    footer_privacy: "Privacy Policy",
    footer_contribute: "Would you like to contribute?",
    search_placeholder: "Search articles...",
    search_button: "Search",
    button_read_more: "Read More",
    blog_title: "Blog",
    blog_description: "Read about some of our latest projects and insights",
    blog_written_by: "Written by ",
    blog_on: " on ",
    blog_all_articles: "All Articles",
    page_not_found_title: "Page not found",
    page_not_found_back_home: "Back to home page",
    articles_tag: "Articles with tag",
    partners: "Partners",
    communities: "Other Communities",
    gallery_title: "Gallery",
    gallery_description: "Captured moments from our initiatives and events",
    gallery_no_images: "No images available yet.",
    gallery_by: "By",
    location_sunday: "Sunday",
    location_monday: "Monday",
    location_tuesday: "Tuesday",
    location_wednesday: "Wednesday",
    location_thursday: "Thursday",
    location_friday: "Friday",
    location_saturday: "Saturday",
    location_of_every_month: "of the month",
  },
} as const;

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${baseUrl}/_emdash/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.success || payload.data === undefined) {
    throw new Error(
      `${method} ${path} failed (${response.status}): ${payload.error?.message ?? response.statusText}`,
    );
  }
  return payload.data;
}

async function ensureSiteCopySchema(): Promise<void> {
  const collections = await client.collections();
  if (!collections.some((collection) => collection.slug === "site_copy")) {
    await client.createCollection({
      slug: "site_copy",
      label: "Site Copy",
      labelSingular: "Site Copy",
      description: "Localized interface copy for the public site.",
      icon: "languages",
      supports: ["drafts", "revisions"],
    });
  }

  const collection = await client.collection("site_copy");
  const existing = new Set(collection.fields.map((field) => field.slug));
  for (const field of copyFields) {
    if (!existing.has(field.slug)) {
      await client.createField("site_copy", field);
    }
  }
}

async function connectGalleryAuthors(): Promise<void> {
  const collections = await client.collections();
  for (const required of ["authors", "gallery"]) {
    if (!collections.some((collection) => collection.slug === required)) {
      throw new Error(`The required Emdash content type "${required}" does not exist.`);
    }
  }

  const gallery = await client.collection("gallery");
  const author = gallery.fields.find((field) => field.slug === "author");
  const definition: FieldDefinition = {
    slug: "author",
    label: "Author",
    type: "reference",
    required: false,
    options: { collection: "authors", allowMultiple: false },
    translatable: false,
  };

  if (!author) {
    await client.createField("gallery", definition);
  } else {
    await api("PUT", "/schema/collections/gallery/fields/author", definition);
  }

  await normalizeGalleryAuthorReferences();
}

async function collectContent(collection: string): Promise<ContentItem[]> {
  const items: ContentItem[] = [];
  for await (const item of client.listAll(collection, { limit: 100 })) {
    items.push(item);
  }
  return items;
}

function indexAuthor(index: Map<string, ContentItem>, key: unknown, author: ContentItem): void {
  if (typeof key !== "string" || key.length === 0) return;

  index.set(key, author);
  if (author.locale) index.set(`${author.locale}:${key}`, author);
}

async function normalizeGalleryAuthorReferences(): Promise<void> {
  const authors = await collectContent("authors");
  const authorIndex = new Map<string, ContentItem>();

  for (const author of authors) {
    indexAuthor(authorIndex, author.id, author);
    indexAuthor(authorIndex, author.slug, author);
    indexAuthor(authorIndex, author.data.name, author);
  }

  for (const galleryItem of await collectContent("gallery")) {
    const reference = galleryItem.data.author;
    if (typeof reference !== "string" || reference.length === 0) continue;
    if (authors.some((author) => author.id === reference)) continue;

    const author =
      (galleryItem.locale ? authorIndex.get(`${galleryItem.locale}:${reference}`) : undefined) ??
      authorIndex.get(reference);

    if (!author) {
      console.warn(
        `Could not connect gallery item "${galleryItem.slug ?? galleryItem.id}" to unknown author "${reference}".`,
      );
      continue;
    }

    await client.update("gallery", galleryItem.id, {
      data: { ...galleryItem.data, author: author.id },
      locale: galleryItem.locale ?? undefined,
    });

    if (galleryItem.status === "published") {
      await client.publish("gallery", galleryItem.id);
    }
  }
}

async function existingCopy(locale: "pt" | "en"): Promise<ContentItem | undefined> {
  const result = await client.list("site_copy", { locale, limit: 100 });
  return result.items.find((item) => item.slug === "site-copy");
}

async function ensureCopyContent(): Promise<void> {
  let pt = await existingCopy("pt");
  if (!pt) {
    pt = await client.create("site_copy", {
      slug: "site-copy",
      locale: "pt",
      data: copy.pt,
    });
    await client.publish("site_copy", pt.id);
  }

  const en = await existingCopy("en");
  if (!en) {
    const created = await client.create("site_copy", {
      slug: "site-copy",
      locale: "en",
      translationOf: pt.id,
      data: copy.en,
    });
    await client.publish("site_copy", created.id);
  }
}

await ensureSiteCopySchema();
await connectGalleryAuthors();
await ensureCopyContent();

console.log(`Emdash migration complete at ${baseUrl}.`);
