import { defineCollection, reference, z } from "astro:content";

const authorsCollection = defineCollection({
  type: "data",
  schema: z.object({
    name: z.string(),
    image: z.string(),
    bio: z.string().optional(),
    socialMediaLink: z.string().optional(),
  }),
});

const blogCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    author: reference("authors"),
    image: z.string(),
    tags: z.array(z.string()),
    summary: z.string(),
    type: z.enum(["Article", "Tutorial"]),
  }),
});

const eventsCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    images: z.array(z.string()).optional(),
    description: z.string(),
    featured: z.boolean().default(false),
  }),
});

const galleryCollection = defineCollection({
  type: "data",
  schema: z.object({
    title: z.string(),
    image: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
    date: z.coerce.date().optional(),
  }),
});

export const collections = {
  authors: authorsCollection,
  blog: blogCollection,
  events: eventsCollection,
  gallery: galleryCollection,
};
