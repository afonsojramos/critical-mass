export interface UploadedGalleryMedia {
  id: string;
  filename: string;
  mimeType: string;
  url: string;
  storageKey?: string;
  width?: number;
  height?: number;
  blurhash?: string;
  dominantColor?: string;
  alt?: string;
  provider?: string;
  meta?: Record<string, unknown>;
}

export function galleryTitleFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  const words = withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return words ? words.charAt(0).toLocaleUpperCase() + words.slice(1) : "Untitled";
}

/** Match the value produced by Emdash's built-in image picker. */
export function galleryMediaValue(media: UploadedGalleryMedia, alt: string) {
  const isLocal = !media.provider || media.provider === "local";
  return {
    id: media.id,
    provider: media.provider || "local",
    previewUrl: isLocal ? undefined : media.url,
    alt,
    width: media.width,
    height: media.height,
    filename: media.filename,
    mimeType: media.mimeType,
    blurhash: media.blurhash,
    dominantColor: media.dominantColor,
    meta: isLocal ? { ...media.meta, storageKey: media.storageKey } : media.meta,
  };
}
