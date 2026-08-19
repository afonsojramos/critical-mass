import {
  contentLabel,
  createBulkUploadAdmin,
  imageFieldValue,
} from "emdash-plugin-bulk-upload/admin";
import "emdash-plugin-bulk-upload/styles.css";

export const { pages, fields } = createBulkUploadAdmin({
  collection: "gallery",
  // Gallery content is single-locale; no linked translation drafts.
  translationLocales: [],
  sharedFields: [
    {
      kind: "collection",
      name: "location",
      label: { en: "Location", pt: "Local" },
      placeholder: { en: "Choose a location", pt: "Escolhe um local" },
      collection: "locations",
      labelKeys: ["city", "name", "title"],
      filter: (entry) => entry.data.sort_index !== 100,
      optionLabel: (entry, lang) =>
        contentLabel(entry, ["city", "name", "title"]) +
        (entry.data.activity_status === "inactive"
          ? lang.startsWith("pt")
            ? " (inativo)"
            : " (inactive)"
          : ""),
    },
    {
      kind: "taxonomy",
      name: "category",
      label: { en: "Category", pt: "Categoria" },
      placeholder: { en: "Choose a category", pt: "Escolhe uma categoria" },
      taxonomy: "category",
      defaultSlug: "posters",
    },
    {
      kind: "collection",
      name: "author",
      label: { en: "Author", pt: "Autoria" },
      collection: "authors",
      noneLabel: { en: "No author", pt: "Sem autoria" },
    },
  ],
  rowFields: [{ name: "date", label: { en: "Month and year", pt: "Mês e ano" }, type: "month" }],
  buildData: ({ media, title, row, shared }) => ({
    title,
    description: "",
    image: imageFieldValue(media, title),
    date: row.date,
    location: shared.location,
    ...(shared.author ? { author: shared.author } : {}),
  }),
  previewAspectRatio: "2 / 3",
  defaultView: "grid",
  monthYearField: true,
  languages: {
    en: {
      eyebrow: "Gallery tools",
      intro: "Create a reviewed Gallery draft for every image. Nothing is published automatically.",
      files: "Poster images",
      drop: "Drop poster images here",
      chooseFiles: "Choose images",
      hint: "JPEG, PNG, WebP, AVIF, GIF, or SVG. You can adjust every title and month below.",
      count: "images",
      loadError: "Could not load Gallery options.",
      incomplete: "Choose a location and category, then complete every title and month.",
    },
    // Generic Portuguese strings come from the plugin's built-in catalog;
    // only gallery-specific wording is overridden here.
    pt: {
      eyebrow: "Ferramentas da galeria",
      intro: "Cria um rascunho da Galeria por imagem. Nada é publicado automaticamente.",
      files: "Imagens dos cartazes",
      drop: "Arrasta as imagens dos cartazes para aqui",
      chooseFiles: "Escolher imagens",
      hint: "JPEG, PNG, WebP, AVIF, GIF ou SVG. Podes ajustar cada título e mês abaixo.",
      count: "imagens",
      loadError: "Não foi possível carregar as opções da Galeria.",
      incomplete: "Escolhe um local e uma categoria e preenche todos os títulos e meses.",
    },
  },
});
