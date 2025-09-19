declare global {
  interface Window {
    openImageModal: (
      imageSrc: string,
      imageAlt: string,
      authorName: string | null,
      authorLink: string | null,
    ) => void;
    filterByTag: (tag: string) => void;
  }
}

export {};
