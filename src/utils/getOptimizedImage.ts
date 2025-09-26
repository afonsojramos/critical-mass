import type { ImageMetadata } from "astro";

// Cache the glob import to avoid re-importing on every call
const images = import.meta.glob("/src/assets/**/*", { eager: true });

/**
 * Get optimized image from assets based on CMS path
 * @param imagePath - Path from CMS (e.g., "/images/events/event.jpg", "/cities/porto.svg", "/plus.svg")
 * @returns Optimized ImageMetadata or original path as fallback
 */
export function getOptimizedImage(imagePath: string): ImageMetadata | string {
  if (!imagePath) return imagePath;

  let assetPath: string;

  if (imagePath.startsWith("/images/")) {
    // Convert CMS path (/images/events/filename.jpg) to asset path (/src/assets/images/events/filename.jpg)
    assetPath = `/src/assets${imagePath}`;
  } else if (imagePath.startsWith("/cities/")) {
    // Convert city path (/cities/filename.svg) to asset path (/src/assets/cities/filename.svg)
    assetPath = `/src/assets${imagePath}`;
  } else if (
    imagePath.startsWith("/") &&
    !imagePath.includes("/images/") &&
    !imagePath.includes("/cities/")
  ) {
    // Handle root paths like /plus.svg -> /src/assets/plus.svg
    assetPath = `/src/assets${imagePath}`;
  } else {
    // Return original path if it doesn't match expected patterns
    return imagePath;
  }

  const imageModule = images[assetPath] as { default: ImageMetadata } | undefined;
  return imageModule?.default || imagePath;
}
