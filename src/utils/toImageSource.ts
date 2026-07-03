import type { ImageMetadata } from "astro";
import { getOptimizedImage } from "@/utils/getOptimizedImage";

/**
 * Emdash image fields can hold either a legacy path string (a repo asset like
 * "/images/gallery/foo.jpg") or a MediaValue object uploaded to R2. Normalize
 * either into something `<Image>`/`<img>` `src` accepts:
 * - bundled repo asset → optimized `ImageMetadata`
 * - CMS media / unbundled path → URL string
 *
 * @param value - path string, emdash MediaValue, or nullish
 */
/** Emdash serves local media at this path, keyed by storage key. */
const MEDIA_FILE_PREFIX = "/_emdash/api/media/file/";

export function toImageSource(value: unknown): ImageMetadata | string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return getOptimizedImage(value);
  if (typeof value === "object") {
    const media = value as {
      src?: string;
      url?: string;
      id?: string;
      meta?: { storageKey?: string };
    };
    if (media.src) return media.src;
    if (media.url) return media.url;
    // Local media values persist a storage key (or media id) rather than a URL.
    const key = media.meta?.storageKey ?? media.id;
    return key ? `${MEDIA_FILE_PREFIX}${key}` : undefined;
  }
  return undefined;
}
