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
export function toImageSource(value: unknown): ImageMetadata | string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return getOptimizedImage(value);
  if (typeof value === "object") {
    const media = value as { src?: string; url?: string };
    return media.src ?? media.url ?? undefined;
  }
  return undefined;
}
