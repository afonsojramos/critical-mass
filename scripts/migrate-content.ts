/**
 * Content migration script: Sveltia CMS -> Emdash CMS
 *
 * Reads existing content files (Markdown/JSON) and outputs
 * Emdash-compatible seed data for import via REST API.
 *
 * Usage: bun run scripts/migrate-content.ts
 *
 * The script outputs a JSON seed file that can be imported
 * using the Emdash REST API or CLI.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import matter from "gray-matter";
import { JSDOM } from "jsdom";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const CONTENT_DIR = join(import.meta.dirname, "../src/content");
const OUTPUT_FILE = join(import.meta.dirname, "../seed.json");

// ─── Markdown to Portable Text ───────────────────────────────────────────────

const markdownToHtml = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true });

function htmlToPortableText(html: string): PortableTextBlock[] {
  const dom = new JSDOM(`<!DOCTYPE html><body>${html}</body>`);
  const body = dom.window.document.body;
  const blocks: PortableTextBlock[] = [];

  for (const node of body.childNodes) {
    if (node.nodeType === 3) {
      // Text node
      const text = node.textContent?.trim();
      if (text) {
        blocks.push(createTextBlock([{ _type: "span", text, marks: [] }]));
      }
      continue;
    }
    if (node.nodeType !== 1) continue;
    const el = node as Element;

    switch (el.tagName.toLowerCase()) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const { spans, markDefs } = extractSpansAndMarkDefs(el);
        blocks.push(createTextBlock(spans, el.tagName.toLowerCase(), markDefs));
        break;
      }
      case "p": {
        const { spans, markDefs } = extractSpansAndMarkDefs(el);
        blocks.push(createTextBlock(spans, "normal", markDefs));
        break;
      }
      case "ul":
      case "ol": {
        const listStyle = el.tagName.toLowerCase() === "ol" ? "number" : "bullet";
        for (const li of el.querySelectorAll(":scope > li")) {
          const { spans, markDefs } = extractSpansAndMarkDefs(li);
          blocks.push({
            _type: "block",
            _key: generateKey(),
            style: "normal",
            listItem: listStyle,
            level: 1,
            markDefs,
            children: spans,
          });
        }
        break;
      }
      case "blockquote":
        for (const p of el.querySelectorAll("p")) {
          const { spans, markDefs } = extractSpansAndMarkDefs(p);
          blocks.push(createTextBlock(spans, "blockquote", markDefs));
        }
        if (!el.querySelector("p")) {
          const { spans, markDefs } = extractSpansAndMarkDefs(el);
          blocks.push(createTextBlock(spans, "blockquote", markDefs));
        }
        break;
      case "hr":
        blocks.push({ _type: "break", _key: generateKey(), style: "lineBreak" });
        break;
      default: {
        // Fallback: treat as paragraph
        const { spans, markDefs } = extractSpansAndMarkDefs(el);
        blocks.push(createTextBlock(spans, "normal", markDefs));
      }
    }
  }

  return blocks;
}

interface PortableTextSpan {
  _type: "span";
  _key?: string;
  text: string;
  marks: string[];
}

interface PortableTextBlock {
  _type: string;
  _key: string;
  style?: string;
  listItem?: string;
  level?: number;
  markDefs?: MarkDef[];
  children?: PortableTextSpan[];
}

interface MarkDef {
  _type: string;
  _key: string;
  href?: string;
}

let keyCounter = 0;
function generateKey(): string {
  return `k${(keyCounter++).toString(36)}`;
}

function createTextBlock(
  children: PortableTextSpan[],
  style = "normal",
  markDefs: MarkDef[] = [],
): PortableTextBlock {
  const block: PortableTextBlock = {
    _type: "block",
    _key: generateKey(),
    style,
    markDefs,
    children: children.length > 0 ? children : [{ _type: "span", text: "", marks: [] }],
  };
  return block;
}

function extractSpansAndMarkDefs(el: Element): {
  spans: PortableTextSpan[];
  markDefs: MarkDef[];
} {
  const spans: PortableTextSpan[] = [];
  const markDefs: MarkDef[] = [];

  for (const child of el.childNodes) {
    if (child.nodeType === 3) {
      // Text node
      const text = child.textContent ?? "";
      if (text) {
        spans.push({ _type: "span", _key: generateKey(), text, marks: [] });
      }
    } else if (child.nodeType === 1) {
      const childEl = child as Element;
      const tag = childEl.tagName.toLowerCase();

      if (tag === "a") {
        const href = childEl.getAttribute("href") ?? "";
        const markKey = generateKey();
        markDefs.push({ _type: "link", _key: markKey, href });
        const inner = extractSpansAndMarkDefs(childEl);
        for (const span of inner.spans) {
          span.marks = [...span.marks, markKey];
        }
        spans.push(...inner.spans);
        markDefs.push(...inner.markDefs);
      } else if (tag === "strong" || tag === "b") {
        const inner = extractSpansAndMarkDefs(childEl);
        for (const span of inner.spans) {
          span.marks = [...span.marks, "strong"];
        }
        spans.push(...inner.spans);
        markDefs.push(...inner.markDefs);
      } else if (tag === "em" || tag === "i") {
        const inner = extractSpansAndMarkDefs(childEl);
        for (const span of inner.spans) {
          span.marks = [...span.marks, "em"];
        }
        spans.push(...inner.spans);
        markDefs.push(...inner.markDefs);
      } else if (tag === "code") {
        const inner = extractSpansAndMarkDefs(childEl);
        for (const span of inner.spans) {
          span.marks = [...span.marks, "code"];
        }
        spans.push(...inner.spans);
        markDefs.push(...inner.markDefs);
      } else {
        // Recurse into other elements
        const inner = extractSpansAndMarkDefs(childEl);
        spans.push(...inner.spans);
        markDefs.push(...inner.markDefs);
      }
    }
  }

  return { spans, markDefs };
}

function convertMarkdown(markdown: string): PortableTextBlock[] {
  const html = markdownToHtml.processSync(markdown).toString();
  return htmlToPortableText(html);
}

// ─── Content Reading ─────────────────────────────────────────────────────────

function readJsonFiles(dir: string): Array<{ slug: string; data: Record<string, unknown> }> {
  try {
    const files = readdirSync(dir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const content = readFileSync(join(dir, f), "utf-8");
        const slug = basename(f, ".json");
        return { slug, data: JSON.parse(content) };
      });
  } catch {
    return [];
  }
}

function readMarkdownFiles(
  dir: string,
): Array<{ slug: string; data: Record<string, unknown>; body: PortableTextBlock[] }> {
  try {
    const files = readdirSync(dir);
    return files
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const raw = readFileSync(join(dir, f), "utf-8");
        const { data, content } = matter(raw);
        const slug = basename(f, ".md");
        const body = convertMarkdown(content);
        return { slug, data, body };
      });
  } catch {
    return [];
  }
}

// ─── Seed Generation ─────────────────────────────────────────────────────────

// ─── Seed Generation (Emdash SeedFile format) ───────────────────────────────

let idCounter = 0;
function seedId(prefix: string): string {
  return `${prefix}-${(idCounter++).toString().padStart(3, "0")}`;
}

interface SeedEntry {
  id: string;
  slug: string;
  locale?: string;
  translationOf?: string;
  status: "published";
  data: Record<string, unknown>;
}

interface SeedCollection {
  slug: string;
  label: string;
  labelSingular?: string;
  supports?: string[];
  fields: SeedField[];
}

interface SeedField {
  slug: string;
  label: string;
  type: string;
  required?: boolean;
  options?: Record<string, unknown>;
}

function generateSeed() {
  const collections: SeedCollection[] = [];
  const content: Record<string, SeedEntry[]> = {};

  // ─── Authors ───
  const authors = readJsonFiles(join(CONTENT_DIR, "authors"));
  collections.push({
    slug: "authors",
    label: "Authors",
    labelSingular: "Author",
    fields: [
      { slug: "name", label: "Name", type: "string", required: true },
      { slug: "image", label: "Image", type: "string", required: true },
      { slug: "bio", label: "Bio", type: "text" },
      { slug: "social_media_link", label: "Social Media Link", type: "string" },
    ],
  });
  content.authors = authors.map((a) => ({
    id: seedId("author"),
    slug: a.slug,
    locale: "pt",
    status: "published" as const,
    data: {
      name: a.data.name,
      image: a.data.image,
      bio: a.data.bio ?? "",
      social_media_link: a.data.socialMediaLink ?? "",
    },
  }));

  // ─── Locations ───
  const locations = readJsonFiles(join(CONTENT_DIR, "locations"));
  collections.push({
    slug: "locations",
    label: "Locations",
    labelSingular: "Location",
    fields: [
      { slug: "city", label: "City", type: "string", required: true },
      { slug: "exact_location", label: "Exact Location", type: "string", required: true },
      { slug: "image", label: "Image", type: "string", required: true },
      { slug: "link", label: "Link", type: "string", required: true },
      { slug: "sort_index", label: "Sort Index", type: "integer", required: true },
      {
        slug: "date_frequency",
        label: "Date Frequency",
        type: "select",
        options: { choices: ["1st", "2nd", "3rd", "4th", "Last"] },
      },
      {
        slug: "day_of_week",
        label: "Day of Week",
        type: "select",
        options: {
          choices: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        },
      },
      { slug: "custom_date", label: "Custom Date", type: "string" },
    ],
  });
  content.locations = locations.map((l) => ({
    id: seedId("loc"),
    slug: l.slug,
    locale: "pt",
    status: "published" as const,
    data: {
      city: l.data.city,
      exact_location: l.data.exactLocation,
      image: l.data.image,
      link: l.data.link,
      sort_index: l.data.index,
      date_frequency: l.data.dateFrequency ?? null,
      day_of_week: l.data.dayOfWeek ?? null,
      custom_date: l.data.customDate ?? null,
    },
  }));

  // ─── Blog (i18n) ───
  const blogPt = readMarkdownFiles(join(CONTENT_DIR, "blog/pt"));
  const blogEn = readMarkdownFiles(join(CONTENT_DIR, "blog/en"));
  const blogEntries: SeedEntry[] = [];

  for (const pt of blogPt) {
    const ptId = seedId("blog");
    blogEntries.push({
      id: ptId,
      slug: pt.slug,
      locale: "pt",
      status: "published",
      data: {
        title: pt.data.title,
        body: pt.body,
        pub_date: pt.data.pubDate,
        author: pt.data.author,
        image: pt.data.image,
        tags: pt.data.tags,
        summary: pt.data.summary,
        content_type: pt.data.type,
      },
    });

    const en = blogEn.find((e) => e.slug === pt.slug);
    if (en) {
      blogEntries.push({
        id: seedId("blog"),
        slug: en.slug,
        locale: "en",
        translationOf: ptId,
        status: "published",
        data: {
          title: en.data.title,
          body: en.body,
          pub_date: en.data.pubDate,
          author: en.data.author,
          image: en.data.image,
          tags: en.data.tags,
          summary: en.data.summary,
          content_type: en.data.type,
        },
      });
    }
  }

  collections.push({
    slug: "blog",
    label: "Blog",
    labelSingular: "Post",
    supports: ["drafts", "search"],
    fields: [
      { slug: "title", label: "Title", type: "string", required: true },
      { slug: "body", label: "Body", type: "portableText", required: true },
      { slug: "pub_date", label: "Publish Date", type: "datetime", required: true },
      {
        slug: "author",
        label: "Author",
        type: "reference",
        required: true,
        options: { collection: "authors" },
      },
      { slug: "image", label: "Image", type: "string", required: true },
      {
        slug: "tags",
        label: "Tags",
        type: "multiSelect",
        options: {
          choices: [
            "cycling",
            "activism",
            "urbanism",
            "events",
            "community",
            "sustainability",
            "safety",
            "infrastructure",
            "politics",
            "history",
            "tutorial",
            "beginner",
          ],
        },
      },
      { slug: "summary", label: "Summary", type: "text", required: true },
      {
        slug: "content_type",
        label: "Type",
        type: "select",
        options: { choices: ["Article", "Tutorial"] },
      },
    ],
  });
  content.blog = blogEntries;

  // ─── Events (i18n) ───
  const eventsPt = readMarkdownFiles(join(CONTENT_DIR, "events/pt"));
  const eventsEn = readMarkdownFiles(join(CONTENT_DIR, "events/en"));
  const eventEntries: SeedEntry[] = [];

  for (const pt of eventsPt) {
    const ptId = seedId("event");
    eventEntries.push({
      id: ptId,
      slug: pt.slug,
      locale: "pt",
      status: "published",
      data: {
        title: pt.data.title,
        body: pt.body,
        description: pt.data.description,
        featured: pt.data.featured ?? false,
        images: pt.data.images ?? [],
      },
    });

    const en = eventsEn.find((e) => e.slug === pt.slug);
    if (en) {
      eventEntries.push({
        id: seedId("event"),
        slug: en.slug,
        locale: "en",
        translationOf: ptId,
        status: "published",
        data: {
          title: en.data.title,
          body: en.body,
          description: en.data.description,
          featured: en.data.featured ?? false,
          images: en.data.images ?? [],
        },
      });
    }
  }

  collections.push({
    slug: "events",
    label: "Events",
    labelSingular: "Event",
    supports: ["drafts"],
    fields: [
      { slug: "title", label: "Title", type: "string", required: true },
      { slug: "body", label: "Body", type: "portableText" },
      { slug: "description", label: "Description", type: "text", required: true },
      { slug: "featured", label: "Featured", type: "boolean" },
      { slug: "images", label: "Images", type: "json" },
    ],
  });
  content.events = eventEntries;

  // ─── Gallery (i18n) ───
  const galleryPt = readJsonFiles(join(CONTENT_DIR, "gallery/pt"));
  const galleryEn = readJsonFiles(join(CONTENT_DIR, "gallery/en"));
  const galleryEntries: SeedEntry[] = [];

  for (const pt of galleryPt) {
    const ptId = seedId("gallery");
    galleryEntries.push({
      id: ptId,
      slug: pt.slug,
      locale: "pt",
      status: "published",
      data: {
        title: pt.data.title,
        image: pt.data.image,
        description: pt.data.description ?? "",
        category: pt.data.category ?? null,
        date: pt.data.date ?? null,
        author: pt.data.author ?? null,
      },
    });

    const en = galleryEn.find((e) => e.slug === pt.slug);
    if (en) {
      galleryEntries.push({
        id: seedId("gallery"),
        slug: en.slug,
        locale: "en",
        translationOf: ptId,
        status: "published",
        data: {
          title: en.data.title,
          image: en.data.image,
          description: en.data.description ?? "",
          category: en.data.category ?? null,
          date: en.data.date ?? null,
          author: en.data.author ?? null,
        },
      });
    }
  }

  collections.push({
    slug: "gallery",
    label: "Gallery",
    labelSingular: "Gallery Item",
    fields: [
      { slug: "title", label: "Title", type: "string", required: true },
      { slug: "image", label: "Image", type: "string", required: true },
      { slug: "description", label: "Description", type: "text" },
      { slug: "category", label: "Category", type: "string" },
      { slug: "date", label: "Date", type: "datetime" },
      { slug: "author", label: "Author", type: "reference", options: { collection: "authors" } },
    ],
  });
  content.gallery = galleryEntries;

  return { version: "1" as const, collections, content };
}

// ─── Main ────────────────────────────────────────────────────────────────────

const seed = generateSeed();
writeFileSync(OUTPUT_FILE, JSON.stringify(seed, null, 2));

console.log(`Seed file written to ${OUTPUT_FILE}`);
console.log("Collections:");
for (const [slug, entries] of Object.entries(seed.content)) {
  console.log(`  ${slug}: ${entries.length} entries`);
}
