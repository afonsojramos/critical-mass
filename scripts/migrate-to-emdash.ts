import { EmDashClient, type ContentItem } from "emdash/client";

interface FieldDefinition {
  slug: string;
  label: string;
  type: "reference";
  required: boolean;
  options: Record<string, unknown>;
  widget: string;
  translatable: boolean;
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
    widget: "content-reference:entry-picker",
    translatable: false,
  };

  if (!author) {
    await client.createField("gallery", definition);
  } else {
    await api("PUT", "/schema/collections/gallery/fields/author", definition);
  }

  await normalizeGalleryAuthorReferences();
}

await connectGalleryAuthors();

console.log(`Gallery author migration complete at ${baseUrl}.`);
