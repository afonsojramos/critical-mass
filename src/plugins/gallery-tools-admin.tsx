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
import { Badge, type BadgeVariant } from "@cloudflare/kumo/components/badge";
import { Banner } from "@cloudflare/kumo/components/banner";
import { Button, LinkButton } from "@cloudflare/kumo/components/button";
import { Checkbox } from "@cloudflare/kumo/components/checkbox";
import { Empty } from "@cloudflare/kumo/components/empty";
import { Input } from "@cloudflare/kumo/components/input";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Select } from "@cloudflare/kumo/components/select";
import { Text } from "@cloudflare/kumo/components/text";
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
    <Input
      id={id}
      type="month"
      value={normalized}
      required={required}
      label={label}
      size="lg"
      onChange={(event) => onChange(event.target.value || null)}
    />
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
    drop: "Drop poster images here",
    chooseFiles: "Choose images",
    hint: "JPEG, PNG, WebP, AVIF, GIF, or SVG. You can adjust every title and month below.",
    images: "images",
    itemTitle: "Title",
    period: "Month and year",
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
    drop: "Arrasta as imagens dos cartazes para aqui",
    chooseFiles: "Escolher imagens",
    hint: "JPEG, PNG, WebP, AVIF, GIF ou SVG. Podes ajustar cada título e mês abaixo.",
    images: "imagens",
    itemTitle: "Título",
    period: "Mês e ano",
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

function statusVariant(status: UploadStatus): BadgeVariant {
  if (status === "done") return "success";
  if (status === "error") return "error";
  if (status === "uploading" || status === "creating") return "info";
  return "neutral";
}

const NO_AUTHOR_VALUE = "__none__";

function PosterPreview({ file }: { file: File }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-lg bg-kumo-tint shadow-sm">
      {src && (
        <img
          src={src}
          alt=""
          className="size-full object-cover outline -outline-offset-1 outline-black/10 dark:outline-white/10"
        />
      )}
    </div>
  );
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
    <main className="mx-auto max-w-7xl space-y-8 p-5 sm:p-8 lg:p-10">
      <header className="max-w-3xl space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-kumo-brand">
          {labels.eyebrow}
        </p>
        <Text variant="heading1" as="h1" DANGEROUS_className="text-balance tracking-tight">
          {labels.title}
        </Text>
        <Text variant="secondary" DANGEROUS_className="max-w-2xl text-pretty leading-7">
          {labels.intro}
        </Text>
      </header>

      {loadError && (
        <Banner role="alert" variant="error" title={labels.loadError} description={loadError} />
      )}

      <LayerCard className="space-y-5 p-5 sm:p-6">
        <Text variant="heading3" as="h2" DANGEROUS_className="text-balance">
          {labels.defaults}
        </Text>
        <div className="grid gap-5 lg:grid-cols-3">
          <Select
            label={labels.location}
            placeholder={labels.chooseLocation}
            value={locationId || null}
            loading={loading}
            disabled={loading || isImporting}
            onValueChange={(value) => setLocationId(typeof value === "string" ? value : "")}
            size="lg"
          >
            {locations.map((location) => (
              <Select.Option key={location.id} value={location.id}>
                {contentLabel(location)}
                {location.data.activity_status === "inactive" ? ` (${labels.inactive})` : ""}
              </Select.Option>
            ))}
          </Select>
          <Select
            label={labels.category}
            placeholder={labels.chooseCategory}
            value={categoryId || null}
            loading={loading}
            disabled={loading || isImporting}
            onValueChange={(value) => setCategoryId(typeof value === "string" ? value : "")}
            size="lg"
          >
            {categories.map((category) => (
              <Select.Option key={category.id} value={category.id}>
                {category.label}
              </Select.Option>
            ))}
          </Select>
          <Select
            label={labels.author}
            value={authorId || NO_AUTHOR_VALUE}
            loading={loading}
            disabled={loading || isImporting}
            onValueChange={(value) =>
              setAuthorId(typeof value === "string" && value !== NO_AUTHOR_VALUE ? value : "")
            }
            size="lg"
          >
            <Select.Option value={NO_AUTHOR_VALUE}>{labels.noAuthor}</Select.Option>
            {authors.map((author) => (
              <Select.Option key={author.id} value={author.id}>
                {contentLabel(author)}
              </Select.Option>
            ))}
          </Select>
          <div className="lg:col-span-3">
            <Checkbox
              label={labels.translations}
              controlFirst
              checked={createTranslations}
              disabled={isImporting}
              onCheckedChange={(checked) => setCreateTranslations(checked)}
            />
          </div>
        </div>
      </LayerCard>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Text variant="heading3" as="h2" DANGEROUS_className="text-balance">
            {labels.files}
          </Text>
          <Badge variant="secondary" className="tabular-nums">
            {rows.length} {labels.images}
          </Badge>
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
            if (isImporting) return;
            addFiles([...event.dataTransfer.files]);
          }}
          className={`rounded-2xl p-1 transition-[box-shadow,background-color] duration-150 ${
            isDragging
              ? "bg-kumo-brand/10 ring-2 ring-kumo-brand"
              : "bg-kumo-tint ring ring-kumo-line"
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
          <Empty
            size="sm"
            title={labels.drop}
            description={labels.hint}
            contents={
              <Button
                type="button"
                variant="secondary"
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()}
              >
                {labels.chooseFiles}
              </Button>
            }
            className="rounded-xl bg-kumo-base"
          />
        </div>

        {rows.length > 0 ? (
          <div className="space-y-3">
            {rows.map((row, index) => (
              <article key={row.id}>
                <LayerCard className="space-y-4 p-4">
                  <div className="grid gap-4 md:grid-cols-[5rem_minmax(0,1fr)_12rem_auto] md:items-start">
                    <PosterPreview file={row.file} />
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="tabular-nums">
                          {index + 1}
                        </Badge>
                        <Text variant="secondary" size="xs" truncate>
                          {row.file.name}
                        </Text>
                      </div>
                      <Input
                        id={`gallery-title-${index}`}
                        label={labels.itemTitle}
                        value={row.title}
                        disabled={isImporting || row.status === "done"}
                        onChange={(event) => patchRow(row.id, { title: event.target.value })}
                      />
                      {row.status === "done" && (
                        <div className="flex flex-wrap gap-2">
                          {row.primaryEntryId && (
                            <LinkButton
                              size="sm"
                              variant="ghost"
                              href={`/_emdash/admin/content/gallery/${row.primaryEntryId}?locale=pt`}
                            >
                              {labels.editPt}
                            </LinkButton>
                          )}
                          {row.translationEntryId && (
                            <LinkButton
                              size="sm"
                              variant="ghost"
                              href={`/_emdash/admin/content/gallery/${row.translationEntryId}?locale=en`}
                            >
                              {labels.editEn}
                            </LinkButton>
                          )}
                        </div>
                      )}
                    </div>
                    <Input
                      id={`gallery-period-${index}`}
                      label={labels.period}
                      type="month"
                      value={row.period}
                      disabled={isImporting || row.status === "done"}
                      onChange={(event) => patchRow(row.id, { period: event.target.value })}
                    />
                    <div className="flex min-h-10 items-center justify-between gap-2 md:flex-col md:items-end">
                      <Badge variant={statusVariant(row.status)} appearance="dot">
                        {statusLabel(row.status, labels)}
                      </Badge>
                      {!row.primaryEntryId && row.status !== "done" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary-destructive"
                          disabled={isImporting}
                          onClick={() =>
                            setRows((current) => current.filter((item) => item.id !== row.id))
                          }
                        >
                          {labels.remove}
                        </Button>
                      )}
                    </div>
                  </div>
                  {row.error && <Banner role="alert" variant="error" description={row.error} />}
                </LayerCard>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <LayerCard className="sticky bottom-4 z-10 flex flex-col gap-3 bg-kumo-base/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <Text variant="secondary" size="sm" DANGEROUS_className="text-pretty tabular-nums">
          {!canImport && !isImporting && rows.some((row) => row.status !== "done")
            ? labels.incomplete
            : `${rows.filter((row) => row.status === "done").length}/${rows.length}`}
        </Text>
        <Button
          type="button"
          variant="primary"
          size="lg"
          loading={isImporting}
          disabled={!canImport}
          onClick={() => void importRows()}
        >
          {isImporting ? labels.importing : hasErrors ? labels.retry : labels.import}
        </Button>
      </LayerCard>
    </main>
  );
}

export const fields: PluginAdminExports["fields"] = {
  "month-year": MonthYearField,
};

export const pages: PluginAdminExports["pages"] = {
  "/bulk-upload": GalleryBulkUploadPage,
};
