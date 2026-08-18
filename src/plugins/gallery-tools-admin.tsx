import {
  apiFetch,
  createContent,
  fetchContentList,
  fetchTerms,
  parseApiResponse,
  uploadMedia,
  type ContentItem,
  type MediaItem,
  type TaxonomyTerm,
} from "@emdash-cms/admin";
import type { PluginAdminExports } from "emdash";
import { useCallback, useEffect, useRef, useState } from "react";
import { galleryMediaValue, galleryTitleFromFilename } from "@/gallery-import";
import { normalizeGalleryPeriod } from "@/gallery-period";

interface FieldProps {
  value: unknown;
  onChange: (value: unknown) => void;
  label: string;
  id: string;
  required?: boolean;
}

function MonthYearField({ value, onChange, label, id, required }: FieldProps) {
  const normalized = normalizeGalleryPeriod(value) ?? "";
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium text-kumo-default">
        {label}
        {!required && <span className="font-normal text-kumo-subtle"> (optional)</span>}
      </label>
      <input
        id={id}
        type="month"
        value={normalized}
        required={required}
        onChange={(event) => onChange(event.target.value || null)}
        className="min-h-11 w-full rounded-xl border border-kumo-line bg-kumo-control px-3 text-base text-kumo-default outline-none focus-visible:ring-2 focus-visible:ring-kumo-focus"
      />
    </div>
  );
}

type UploadStatus = "queued" | "uploading" | "creating" | "done" | "error";

interface UploadRow {
  id: string;
  file: File;
  title: string;
  period: string;
  status: UploadStatus;
  error?: string;
  media?: MediaItem;
  primaryEntryId?: string;
  translationEntryId?: string;
}

const copy = {
  en: {
    eyebrow: "Gallery tools",
    title: "Bulk upload",
    intro: "Create a reviewed Gallery draft for every image. Nothing is published automatically.",
    defaults: "Shared details",
    location: "Location",
    chooseLocation: "Choose a location",
    category: "Category",
    chooseCategory: "Choose a category",
    author: "Author",
    noAuthor: "No author",
    translations: "Create linked Portuguese and English drafts",
    files: "Poster images",
    drop: "Drop images here, or choose files",
    hint: "JPEG, PNG, WebP, AVIF, GIF, or SVG. You can adjust every title and month below.",
    empty: "No files selected yet.",
    image: "Image",
    itemTitle: "Title",
    period: "Month and year",
    state: "Status",
    queued: "Ready",
    uploading: "Uploading",
    creating: "Creating drafts",
    done: "Drafts created",
    error: "Needs retry",
    remove: "Remove",
    import: "Create drafts",
    retry: "Retry failed items",
    importing: "Working…",
    editPt: "Edit PT draft",
    editEn: "Edit EN draft",
    loadError: "Could not load Gallery options.",
    incomplete: "Choose a location and category, then complete every title and month.",
    inactive: "inactive",
  },
  pt: {
    eyebrow: "Ferramentas da galeria",
    title: "Carregamento em lote",
    intro: "Cria um rascunho da Galeria por imagem. Nada é publicado automaticamente.",
    defaults: "Dados comuns",
    location: "Local",
    chooseLocation: "Escolhe um local",
    category: "Categoria",
    chooseCategory: "Escolhe uma categoria",
    author: "Autoria",
    noAuthor: "Sem autoria",
    translations: "Criar rascunhos ligados em português e inglês",
    files: "Imagens dos cartazes",
    drop: "Arrasta as imagens para aqui ou escolhe ficheiros",
    hint: "JPEG, PNG, WebP, AVIF, GIF ou SVG. Podes ajustar cada título e mês abaixo.",
    empty: "Ainda não selecionaste ficheiros.",
    image: "Imagem",
    itemTitle: "Título",
    period: "Mês e ano",
    state: "Estado",
    queued: "Pronto",
    uploading: "A carregar",
    creating: "A criar rascunhos",
    done: "Rascunhos criados",
    error: "Requer nova tentativa",
    remove: "Remover",
    import: "Criar rascunhos",
    retry: "Repetir itens com erro",
    importing: "A processar…",
    editPt: "Editar rascunho PT",
    editEn: "Editar rascunho EN",
    loadError: "Não foi possível carregar as opções da Galeria.",
    incomplete: "Escolhe um local e uma categoria e preenche todos os títulos e meses.",
    inactive: "inativo",
  },
} as const;

function adminLanguage(): keyof typeof copy {
  return typeof document !== "undefined" && document.documentElement.lang.startsWith("pt")
    ? "pt"
    : "en";
}

async function loadAllEntries(collection: string, locale: string): Promise<ContentItem[]> {
  const items: ContentItem[] = [];
  let cursor: string | undefined;
  do {
    const page = await fetchContentList(collection, { cursor, limit: 100, locale });
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return items;
}

function contentLabel(entry: ContentItem): string {
  for (const key of ["city", "name", "title"]) {
    const value = entry.data[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return entry.slug || entry.id;
}

async function assignCategory(entryId: string, termId: string): Promise<void> {
  const response = await apiFetch(`/_emdash/api/content/gallery/${entryId}/terms/category`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ termIds: [termId] }),
  });
  await parseApiResponse(response, "Failed to assign the Gallery category");
}

function rowKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function statusLabel(status: UploadStatus, labels: (typeof copy)[keyof typeof copy]): string {
  return labels[status];
}

function GalleryBulkUploadPage() {
  const labels = copy[adminLanguage()];
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [locations, setLocations] = useState<ContentItem[]>([]);
  const [authors, setAuthors] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<TaxonomyTerm[]>([]);
  const [locationId, setLocationId] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [createTranslations, setCreateTranslations] = useState(true);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadAllEntries("locations", "pt"),
      loadAllEntries("authors", "pt"),
      fetchTerms("category", { locale: "pt" }),
    ])
      .then(([locationItems, authorItems, categoryItems]) => {
        if (cancelled) return;
        const realLocations = locationItems
          .filter((entry) => entry.data.sort_index !== 100)
          .sort((a, b) => contentLabel(a).localeCompare(contentLabel(b), "pt"));
        const sortedAuthors = authorItems.sort((a, b) =>
          contentLabel(a).localeCompare(contentLabel(b), "pt"),
        );
        setLocations(realLocations);
        setAuthors(sortedAuthors);
        setCategories(categoryItems);
        setCategoryId(
          categoryItems.find((term) => term.slug === "posters")?.id ?? categoryItems[0]?.id ?? "",
        );
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : labels.loadError);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [labels.loadError]);

  const addFiles = useCallback(
    (files: File[]) => {
      const images = files.filter((file) => file.type.startsWith("image/"));
      setRows((current) => {
        const existing = new Set(current.map((row) => row.id));
        const additions = images
          .filter((file) => !existing.has(rowKey(file)))
          .map((file) => ({
            id: rowKey(file),
            file,
            title: galleryTitleFromFilename(file.name),
            period: defaultPeriod,
            status: "queued" as const,
          }));
        return [...current, ...additions];
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [defaultPeriod],
  );

  const patchRow = useCallback((id: string, patch: Partial<UploadRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const hasInvalidRows = rows.some(
    (row) => !row.title.trim() || normalizeGalleryPeriod(row.period) !== row.period,
  );
  const canImport =
    !loading &&
    !isImporting &&
    rows.some((row) => row.status !== "done") &&
    Boolean(locationId) &&
    Boolean(categoryId) &&
    !hasInvalidRows;

  const importRows = async () => {
    if (!canImport) return;
    setIsImporting(true);
    const pending = rows.filter((row) => row.status !== "done");

    for (const initial of pending) {
      let working = { ...initial, error: undefined };
      try {
        if (!working.media) {
          patchRow(working.id, { status: "uploading", error: undefined });
          working.media = await uploadMedia(working.file);
          patchRow(working.id, { media: working.media });
        }

        patchRow(working.id, { status: "creating" });
        const data = {
          title: working.title.trim(),
          description: "",
          image: galleryMediaValue(working.media, working.title.trim()),
          date: working.period,
          location: locationId,
          ...(authorId ? { author: authorId } : {}),
        };

        if (!working.primaryEntryId) {
          const primary = await createContent("gallery", {
            data,
            status: "draft",
            locale: "pt",
          });
          working.primaryEntryId = primary.id;
          patchRow(working.id, { primaryEntryId: primary.id });
        }

        await assignCategory(working.primaryEntryId, categoryId);

        if (createTranslations && !working.translationEntryId) {
          const translation = await createContent("gallery", {
            data,
            status: "draft",
            locale: "en",
            translationOf: working.primaryEntryId,
          });
          working.translationEntryId = translation.id;
        }

        patchRow(working.id, {
          status: "done",
          error: undefined,
          media: working.media,
          primaryEntryId: working.primaryEntryId,
          translationEntryId: working.translationEntryId,
        });
      } catch (error: unknown) {
        patchRow(working.id, {
          status: "error",
          error: error instanceof Error ? error.message : String(error),
          media: working.media,
          primaryEntryId: working.primaryEntryId,
          translationEntryId: working.translationEntryId,
        });
      }
    }
    setIsImporting(false);
  };

  const hasErrors = rows.some((row) => row.status === "error");

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8 lg:p-10">
      <header className="max-w-3xl space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-kumo-brand">
          {labels.eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-kumo-default sm:text-4xl">
          {labels.title}
        </h1>
        <p className="text-base leading-7 text-kumo-subtle">{labels.intro}</p>
      </header>

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-kumo-danger/40 bg-kumo-danger/10 p-4 text-sm text-kumo-danger"
        >
          {labels.loadError} {loadError}
        </div>
      )}

      <section className="grid gap-5 rounded-2xl border border-kumo-line bg-kumo-base p-5 shadow-sm lg:grid-cols-3 lg:p-6">
        <div className="lg:col-span-3">
          <h2 className="text-lg font-semibold text-kumo-default">{labels.defaults}</h2>
        </div>
        <label className="grid gap-2 text-sm font-medium text-kumo-default">
          {labels.location}
          <select
            value={locationId}
            disabled={loading || isImporting}
            onChange={(event) => setLocationId(event.target.value)}
            className="min-h-11 rounded-xl border border-kumo-line bg-kumo-control px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-kumo-focus"
          >
            <option value="">{labels.chooseLocation}</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {contentLabel(location)}
                {location.data.activity_status === "inactive" ? ` (${labels.inactive})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-kumo-default">
          {labels.category}
          <select
            value={categoryId}
            disabled={loading || isImporting}
            onChange={(event) => setCategoryId(event.target.value)}
            className="min-h-11 rounded-xl border border-kumo-line bg-kumo-control px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-kumo-focus"
          >
            <option value="">{labels.chooseCategory}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-kumo-default">
          {labels.author}
          <select
            value={authorId}
            disabled={loading || isImporting}
            onChange={(event) => setAuthorId(event.target.value)}
            className="min-h-11 rounded-xl border border-kumo-line bg-kumo-control px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-kumo-focus"
          >
            <option value="">{labels.noAuthor}</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {contentLabel(author)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3 text-sm text-kumo-default lg:col-span-3">
          <input
            type="checkbox"
            checked={createTranslations}
            disabled={isImporting}
            onChange={(event) => setCreateTranslations(event.target.checked)}
            className="size-4 rounded border-kumo-line accent-current"
          />
          {labels.translations}
        </label>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-kumo-default">{labels.files}</h2>
        </div>
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            addFiles([...event.dataTransfer.files]);
          }}
          className={`rounded-2xl border-2 border-dashed p-7 text-center transition sm:p-10 ${
            isDragging ? "border-kumo-brand bg-kumo-brand/10" : "border-kumo-line bg-kumo-base"
          }`}
        >
          <input
            ref={fileInputRef}
            id="gallery-files"
            type="file"
            accept="image/*"
            multiple
            disabled={isImporting}
            className="sr-only"
            onChange={(event) => addFiles([...(event.target.files ?? [])])}
          />
          <label
            htmlFor="gallery-files"
            className="cursor-pointer text-base font-semibold text-kumo-default underline decoration-kumo-brand decoration-2 underline-offset-4"
          >
            {labels.drop}
          </label>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-kumo-subtle">{labels.hint}</p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-kumo-line bg-kumo-base p-8 text-center text-sm text-kumo-subtle">
            {labels.empty}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => (
              <article
                key={row.id}
                className="grid gap-4 rounded-2xl border border-kumo-line bg-kumo-base p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_11rem_10rem] md:items-start"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-kumo-brand text-sm font-semibold text-kumo-inverse">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs text-kumo-subtle">{row.file.name}</p>
                      <label className="sr-only" htmlFor={`gallery-title-${index}`}>
                        {labels.itemTitle}
                      </label>
                      <input
                        id={`gallery-title-${index}`}
                        value={row.title}
                        disabled={isImporting || row.status === "done"}
                        onChange={(event) => patchRow(row.id, { title: event.target.value })}
                        className="mt-1 min-h-10 w-full rounded-lg border border-kumo-line bg-kumo-control px-3 text-base font-medium text-kumo-default outline-none focus-visible:ring-2 focus-visible:ring-kumo-focus"
                      />
                    </div>
                  </div>
                  {row.error && (
                    <p role="alert" className="text-sm text-kumo-danger">
                      {row.error}
                    </p>
                  )}
                  {row.status === "done" && (
                    <div className="flex flex-wrap gap-3 text-sm">
                      {row.primaryEntryId && (
                        <a
                          className="text-kumo-link underline"
                          href={`/_emdash/admin/content/gallery/${row.primaryEntryId}?locale=pt`}
                        >
                          {labels.editPt}
                        </a>
                      )}
                      {row.translationEntryId && (
                        <a
                          className="text-kumo-link underline"
                          href={`/_emdash/admin/content/gallery/${row.translationEntryId}?locale=en`}
                        >
                          {labels.editEn}
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <label
                  className="grid gap-2 text-xs font-medium text-kumo-subtle"
                  htmlFor={`gallery-period-${index}`}
                >
                  {labels.period}
                  <input
                    id={`gallery-period-${index}`}
                    type="month"
                    value={row.period}
                    disabled={isImporting || row.status === "done"}
                    onChange={(event) => patchRow(row.id, { period: event.target.value })}
                    className="min-h-10 rounded-lg border border-kumo-line bg-kumo-control px-3 text-sm text-kumo-default outline-none focus-visible:ring-2 focus-visible:ring-kumo-focus"
                  />
                </label>
                <div className="space-y-2 md:text-end">
                  <p className="text-sm font-medium text-kumo-default">
                    {statusLabel(row.status, labels)}
                  </p>
                  {!row.primaryEntryId && row.status !== "done" && (
                    <button
                      type="button"
                      disabled={isImporting}
                      onClick={() =>
                        setRows((current) => current.filter((item) => item.id !== row.id))
                      }
                      className="text-xs text-kumo-subtle underline hover:text-kumo-danger disabled:opacity-50"
                    >
                      {labels.remove}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border border-kumo-line bg-kumo-base/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-kumo-subtle">
          {!canImport && !isImporting && rows.some((row) => row.status !== "done")
            ? labels.incomplete
            : `${rows.filter((row) => row.status === "done").length}/${rows.length}`}
        </p>
        <button
          type="button"
          disabled={!canImport}
          onClick={() => void importRows()}
          className="min-h-11 rounded-xl bg-kumo-brand px-5 font-semibold text-kumo-inverse transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isImporting ? labels.importing : hasErrors ? labels.retry : labels.import}
        </button>
      </footer>
    </main>
  );
}

export const fields: PluginAdminExports["fields"] = {
  "month-year": MonthYearField,
};

export const pages: PluginAdminExports["pages"] = {
  "/bulk-upload": GalleryBulkUploadPage,
};
