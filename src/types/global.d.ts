declare global {
  interface Window {
    openImageModal: (imageSrc: string, imageAlt: string) => void;
    filterByTag: (tag: string) => void;
  }
}

export {};