import { fetchContentList, type ContentItem } from "@emdash-cms/admin";
import { useEffect, useMemo, useState } from "react";

interface ReferenceFieldProps {
  value: unknown;
  onChange: (value: unknown) => void;
  label: string;
  id: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }> | Record<string, unknown>;
}

function collectionFromOptions(options: ReferenceFieldProps["options"]): string | null {
  if (!options || Array.isArray(options)) return null;
  return typeof options.collection === "string" ? options.collection : null;
}

function entryLabel(entry: ContentItem): string {
  for (const key of ["name", "title"]) {
    const value = entry.data[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return entry.slug || entry.id;
}

async function loadEntries(collection: string): Promise<ContentItem[]> {
  const entries: ContentItem[] = [];
  let cursor: string | undefined;

  do {
    const result = await fetchContentList(collection, {
      cursor,
      limit: 100,
      orderBy: "title",
      order: "asc",
    });
    entries.push(...result.items);
    cursor = result.nextCursor;
  } while (cursor);

  return entries;
}

function ContentReferenceField({
  value,
  onChange,
  label,
  id,
  required,
  options,
}: ReferenceFieldProps) {
  const collection = collectionFromOptions(options);
  const [entries, setEntries] = useState<ContentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!collection) {
      setError("This reference field has no target collection.");
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);
    loadEntries(collection)
      .then((items) => {
        if (!cancelled) setEntries(items);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Could not load referenced entries.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [collection]);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => entryLabel(a).localeCompare(entryLabel(b))),
    [entries],
  );
  const selected = typeof value === "string" ? value : "";
  const selectedExists = sortedEntries.some((entry) => entry.id === selected);

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium text-kumo-default">
        {label}
        {!required && <span className="font-normal text-kumo-subtle"> (optional)</span>}
      </label>
      <select
        id={id}
        value={selected}
        required={required}
        disabled={loading || Boolean(error)}
        onChange={(event) => onChange(event.target.value || null)}
        className="min-h-11 w-full rounded-xl border border-kumo-line bg-kumo-control px-3 text-base text-kumo-default outline-none focus-visible:ring-2 focus-visible:ring-kumo-focus"
      >
        {!required && <option value="">None</option>}
        {loading && <option value={selected}>Loading entries…</option>}
        {!loading && selected && !selectedExists && <option value={selected}>Unknown entry</option>}
        {!loading &&
          sortedEntries.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entryLabel(entry)}
            </option>
          ))}
      </select>
      {error && <p className="text-sm text-kumo-danger">{error}</p>}
    </div>
  );
}

export const fields = {
  "entry-picker": ContentReferenceField,
};
