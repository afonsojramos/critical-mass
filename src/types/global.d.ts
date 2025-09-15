declare global {
  interface Window {
    openImageModal: (imageSrc: string, imageAlt: string) => void;
  }
}

export {};