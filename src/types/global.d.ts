declare global {
  interface Window {
    openImageModal: (
      imageSrc: string,
      imageAlt: string,
      authorName: string,
      authorLink: string,
    ) => void;
    filterByTag: (tag: string) => void;
  }
}

export {};
